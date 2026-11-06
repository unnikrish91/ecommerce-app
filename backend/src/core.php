<?php
declare(strict_types=1);

// ---------- Config ----------
function env(string $key, $default = null)
{
    static $vars = null;
    if ($vars === null) {
        $vars = [];
        $file = __DIR__ . '/../.env';
        if (is_file($file)) {
            foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
                $line = trim($line);
                if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) {
                    continue;
                }
                list($k, $v) = explode('=', $line, 2);
                $vars[trim($k)] = trim($v, " \t\"'");
            }
        }
    }
    if (isset($vars[$key]) && $vars[$key] !== '') {
        return $vars[$key];
    }
    $e = getenv($key);
    return ($e !== false && $e !== '') ? $e : $default;
}

// ---------- Database ----------
function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf(
            'pgsql:host=%s;port=%s;dbname=%s',
            env('DB_HOST', '127.0.0.1'),
            env('DB_PORT', '5432'),
            env('DB_NAME', 'shop')
        );
        $pdo = new PDO($dsn, env('DB_USER', 'postgres'), env('DB_PASS', ''), [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
    return $pdo;
}

// ---------- HTTP helpers ----------
function respond($data, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function fail(string $message, int $code = 400): void
{
    respond(['error' => $message], $code);
}

function input(): array
{
    static $body = null;
    if ($body === null) {
        $raw = file_get_contents('php://input');
        $body = json_decode($raw ?: '[]', true);
        if (!is_array($body)) {
            $body = [];
        }
    }
    return $body;
}

// ---------- JWT (HS256) ----------
function b64u(string $s): string
{
    return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
}

function b64u_dec(string $s): string
{
    return (string) base64_decode(strtr($s, '-_', '+/'));
}

function jwt_sign(string $data): string
{
    return b64u(hash_hmac('sha256', $data, (string) env('JWT_SECRET', 'change-me'), true));
}

function jwt_encode(array $payload): string
{
    $h = b64u(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $b = b64u(json_encode($payload));
    return "$h.$b." . jwt_sign("$h.$b");
}

function jwt_decode(string $token): ?array
{
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }
    list($h, $b, $s) = $parts;
    if (!hash_equals(jwt_sign("$h.$b"), $s)) {
        return null;
    }
    $payload = json_decode(b64u_dec($b), true);
    if (!is_array($payload) || ($payload['exp'] ?? 0) < time()) {
        return null;
    }
    return $payload;
}

function auth_user(bool $adminOnly = false): array
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
    if ($header === '' && function_exists('apache_request_headers')) {
        $all = apache_request_headers();
        $header = $all['Authorization'] ?? '';
    }
    if (!preg_match('/^Bearer\s+(.+)$/i', $header, $m)) {
        fail('Unauthorized', 401);
    }
    $payload = jwt_decode($m[1]);
    if (!$payload) {
        fail('Invalid or expired token', 401);
    }
    $st = db()->prepare('SELECT id, name, email, role FROM users WHERE id = ?');
    $st->execute([$payload['sub']]);
    $user = $st->fetch();
    if (!$user) {
        fail('Unauthorized', 401);
    }
    if ($adminOnly && $user['role'] !== 'admin') {
        fail('Forbidden', 403);
    }
    return $user;
}
