<?php
declare(strict_types=1);

/**
 * Minimal Stripe REST client (no SDK needed).
 */
function stripe_request(string $method, string $path, array $data = []): array
{
    $ch = curl_init('https://api.stripe.com/v1' . $path);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_USERPWD => env('STRIPE_SECRET_KEY') . ':',
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_TIMEOUT => 30,
    ]);
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
    }
    $res = curl_exec($ch);
    if ($res === false) {
        $err = curl_error($ch);
        curl_close($ch);
        throw new RuntimeException('Payment gateway unreachable: ' . $err);
    }
    curl_close($ch);
    $json = json_decode($res, true);
    if (!is_array($json) || isset($json['error'])) {
        throw new RuntimeException($json['error']['message'] ?? 'Payment gateway error');
    }
    return $json;
}

function order_load(int $orderId, int $userId): ?array
{
    $st = db()->prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?');
    $st->execute([$orderId, $userId]);
    $order = $st->fetch();
    if (!$order) {
        return null;
    }
    $st = db()->prepare('SELECT product_id, name, price, quantity FROM order_items WHERE order_id = ? ORDER BY id');
    $st->execute([$orderId]);
    $order['id'] = (int) $order['id'];
    $order['total'] = (float) $order['total'];
    $order['items'] = array_map(function ($i) {
        return [
            'product_id' => $i['product_id'] === null ? null : (int) $i['product_id'],
            'name' => $i['name'],
            'price' => (float) $i['price'],
            'quantity' => (int) $i['quantity'],
        ];
    }, $st->fetchAll());
    unset($order['payment_ref']);
    return $order;
}

function orders_create(): void
{
    $user = auth_user();
    $in = input();
    $items = $in['items'] ?? [];

    if (!is_array($items) || count($items) === 0) {
        fail('Cart is empty');
    }
    foreach (['shipping_name', 'address', 'phone'] as $f) {
        if (trim((string) ($in[$f] ?? '')) === '') {
            fail("$f is required");
        }
    }

    $pdo = db();
    $pdo->beginTransaction();
    try {
        $lines = [];
        $totalCents = 0;

        foreach ($items as $it) {
            $pid = (int) ($it['product_id'] ?? 0);
            $qty = (int) ($it['quantity'] ?? 0);
            if ($pid < 1 || $qty < 1) {
                throw new InvalidArgumentException('Invalid cart item');
            }
            // Prices always come from the database, never from the client.
            $st = $pdo->prepare('SELECT id, name, price, stock FROM products WHERE id = ? FOR UPDATE');
            $st->execute([$pid]);
            $p = $st->fetch();
            if (!$p) {
                throw new InvalidArgumentException('A product in your cart no longer exists');
            }
            if ((int) $p['stock'] < $qty) {
                throw new InvalidArgumentException('Not enough stock for ' . $p['name']);
            }
            $pdo->prepare('UPDATE products SET stock = stock - ? WHERE id = ?')->execute([$qty, $pid]);

            $cents = (int) round(((float) $p['price']) * 100);
            $totalCents += $cents * $qty;
            $lines[] = ['id' => $pid, 'name' => $p['name'], 'cents' => $cents, 'qty' => $qty];
        }

        $st = $pdo->prepare(
            'INSERT INTO orders (user_id, total, shipping_name, address, phone) VALUES (?, ?, ?, ?, ?) RETURNING id'
        );
        $st->execute([
            $user['id'],
            $totalCents / 100,
            trim((string) $in['shipping_name']),
            trim((string) $in['address']),
            trim((string) $in['phone']),
        ]);
        $orderId = (int) $st->fetchColumn();

        $ins = $pdo->prepare(
            'INSERT INTO order_items (order_id, product_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)'
        );
        foreach ($lines as $l) {
            $ins->execute([$orderId, $l['id'], $l['name'], $l['cents'] / 100, $l['qty']]);
        }

        $frontend = rtrim((string) env('FRONTEND_URL', 'http://localhost:3000'), '/');

        if (env('STRIPE_SECRET_KEY')) {
            $data = [
                'mode' => 'payment',
                'success_url' => $frontend . '/checkout/success?order=' . $orderId,
                'cancel_url' => $frontend . '/cart',
                'customer_email' => $user['email'],
                'client_reference_id' => (string) $orderId,
                'line_items' => [],
            ];
            foreach ($lines as $l) {
                $data['line_items'][] = [
                    'quantity' => $l['qty'],
                    'price_data' => [
                        'currency' => env('CURRENCY', 'usd'),
                        'unit_amount' => $l['cents'],
                        'product_data' => ['name' => $l['name']],
                    ],
                ];
            }
            $session = stripe_request('POST', '/checkout/sessions', $data);
            $pdo->prepare('UPDATE orders SET payment_ref = ? WHERE id = ?')->execute([$session['id'], $orderId]);
            $paymentUrl = $session['url'];
        } else {
            // MOCK payment for development: no real money moves.
            $paymentUrl = $frontend . '/checkout/success?order=' . $orderId . '&mock=1';
        }

        $pdo->commit();
        respond(['order_id' => $orderId, 'payment_url' => $paymentUrl], 201);
    } catch (InvalidArgumentException $e) {
        $pdo->rollBack();
        fail($e->getMessage(), 422);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        fail('Could not create order: ' . $e->getMessage(), 500);
    }
}

/**
 * Called by the success page. Confirms payment with Stripe (or mock mode) and marks the order paid.
 */
function orders_verify(string $id): void
{
    $user = auth_user();
    $st = db()->prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?');
    $st->execute([(int) $id, $user['id']]);
    $order = $st->fetch();
    if (!$order) {
        fail('Order not found', 404);
    }

    if ($order['status'] === 'pending') {
        $paid = false;
        if (env('STRIPE_SECRET_KEY')) {
            try {
                $session = stripe_request('GET', '/checkout/sessions/' . $order['payment_ref']);
                $paid = ($session['payment_status'] ?? '') === 'paid';
            } catch (Throwable $e) {
                fail($e->getMessage(), 502);
            }
        } else {
            $paid = true; // mock mode
        }
        if ($paid) {
            db()->prepare("UPDATE orders SET status = 'paid' WHERE id = ?")->execute([$order['id']]);
        }
    }
    respond(order_load((int) $order['id'], (int) $user['id']));
}

function orders_list(): void
{
    $user = auth_user();
    $st = db()->prepare('SELECT id FROM orders WHERE user_id = ? ORDER BY id DESC');
    $st->execute([$user['id']]);
    $out = [];
    foreach ($st->fetchAll() as $row) {
        $out[] = order_load((int) $row['id'], (int) $user['id']);
    }
    respond(['items' => $out]);
}
