<?php
declare(strict_types=1);

require __DIR__ . '/../src/core.php';
require __DIR__ . '/../src/auth.php';
require __DIR__ . '/../src/products.php';
require __DIR__ . '/../src/orders.php';

// ---------- CORS ----------
header('Access-Control-Allow-Origin: ' . env('FRONTEND_URL', 'http://localhost:3000'));
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Vary: Origin');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ---------- Routes ----------
$routes = [
    ['POST',   '#^/api/auth/register$#',          'auth_register'],
    ['POST',   '#^/api/auth/login$#',             'auth_login'],
    ['GET',    '#^/api/auth/me$#',                'auth_me'],

    ['GET',    '#^/api/products$#',               'products_list'],
    ['GET',    '#^/api/products/(\d+)$#',         'products_get'],
    ['POST',   '#^/api/products$#',               'products_create'],
    ['PUT',    '#^/api/products/(\d+)$#',         'products_update'],
    ['DELETE', '#^/api/products/(\d+)$#',         'products_delete'],

    ['GET',    '#^/api/orders$#',                 'orders_list'],
    ['POST',   '#^/api/orders$#',                 'orders_create'],
    ['POST',   '#^/api/orders/(\d+)/verify$#',    'orders_verify'],
];

$method = $_SERVER['REQUEST_METHOD'];
$path = rtrim((string) parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/') ?: '/';

try {
    foreach ($routes as $route) {
        list($m, $pattern, $handler) = $route;
        if ($m === $method && preg_match($pattern, $path, $matches)) {
            array_shift($matches);
            call_user_func_array($handler, $matches);
            exit;
        }
    }
    fail('Not found', 404);
} catch (Throwable $e) {
    fail('Server error: ' . $e->getMessage(), 500);
}
