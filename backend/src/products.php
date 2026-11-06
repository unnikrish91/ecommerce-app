<?php
declare(strict_types=1);

function product_format(array $p): array
{
    return [
        'id' => (int) $p['id'],
        'name' => $p['name'],
        'description' => $p['description'],
        'price' => (float) $p['price'],
        'stock' => (int) $p['stock'],
        'image_url' => $p['image_url'],
    ];
}

function product_validate(array $in): array
{
    $name = trim((string) ($in['name'] ?? ''));
    $price = $in['price'] ?? null;
    $stock = $in['stock'] ?? 0;

    if ($name === '') {
        fail('Product name is required');
    }
    if (!is_numeric($price) || (float) $price < 0) {
        fail('Price must be a non-negative number');
    }
    if (!is_numeric($stock) || (int) $stock < 0) {
        fail('Stock must be a non-negative integer');
    }
    return [
        $name,
        trim((string) ($in['description'] ?? '')),
        round((float) $price, 2),
        (int) $stock,
        trim((string) ($in['image_url'] ?? '')),
    ];
}

function products_list(): void
{
    $search = trim((string) ($_GET['search'] ?? ''));
    $page = max(1, (int) ($_GET['page'] ?? 1));
    $limit = min(50, max(1, (int) ($_GET['limit'] ?? 12)));
    $offset = ($page - 1) * $limit;

    $where = '';
    $params = [];
    if ($search !== '') {
        $where = 'WHERE name ILIKE ? OR description ILIKE ?';
        $params = ['%' . $search . '%', '%' . $search . '%'];
    }

    $st = db()->prepare("SELECT COUNT(*) FROM products $where");
    $st->execute($params);
    $total = (int) $st->fetchColumn();

    $st = db()->prepare("SELECT * FROM products $where ORDER BY id DESC LIMIT $limit OFFSET $offset");
    $st->execute($params);

    respond([
        'items' => array_map('product_format', $st->fetchAll()),
        'total' => $total,
        'page' => $page,
        'pages' => (int) ceil($total / $limit),
    ]);
}

function products_get(string $id): void
{
    $st = db()->prepare('SELECT * FROM products WHERE id = ?');
    $st->execute([(int) $id]);
    $p = $st->fetch();
    if (!$p) {
        fail('Product not found', 404);
    }
    respond(product_format($p));
}

function products_create(): void
{
    auth_user(true);
    list($name, $desc, $price, $stock, $img) = product_validate(input());
    $st = db()->prepare(
        'INSERT INTO products (name, description, price, stock, image_url) VALUES (?, ?, ?, ?, ?) RETURNING *'
    );
    $st->execute([$name, $desc, $price, $stock, $img]);
    respond(product_format($st->fetch()), 201);
}

function products_update(string $id): void
{
    auth_user(true);
    list($name, $desc, $price, $stock, $img) = product_validate(input());
    $st = db()->prepare(
        'UPDATE products SET name = ?, description = ?, price = ?, stock = ?, image_url = ? WHERE id = ? RETURNING *'
    );
    $st->execute([$name, $desc, $price, $stock, $img, (int) $id]);
    $p = $st->fetch();
    if (!$p) {
        fail('Product not found', 404);
    }
    respond(product_format($p));
}

function products_delete(string $id): void
{
    auth_user(true);
    $st = db()->prepare('DELETE FROM products WHERE id = ?');
    $st->execute([(int) $id]);
    if ($st->rowCount() === 0) {
        fail('Product not found', 404);
    }
    respond(['deleted' => true]);
}
