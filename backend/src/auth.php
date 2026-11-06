<?php
declare(strict_types=1);

function issue_token(array $user): array
{
    $token = jwt_encode(['sub' => (int) $user['id'], 'exp' => time() + 60 * 60 * 24 * 7]);
    return [
        'token' => $token,
        'user' => [
            'id' => (int) $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => $user['role'],
        ],
    ];
}

function auth_register(): void
{
    $in = input();
    $name = trim((string) ($in['name'] ?? ''));
    $email = strtolower(trim((string) ($in['email'] ?? '')));
    $password = (string) ($in['password'] ?? '');

    if ($name === '') {
        fail('Name is required');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        fail('A valid email is required');
    }
    if (strlen($password) < 8) {
        fail('Password must be at least 8 characters');
    }

    $st = db()->prepare('SELECT 1 FROM users WHERE email = ?');
    $st->execute([$email]);
    if ($st->fetch()) {
        fail('Email is already registered', 409);
    }

    $adminEmail = strtolower((string) env('ADMIN_EMAIL', ''));
    $role = ($adminEmail !== '' && $email === $adminEmail) ? 'admin' : 'customer';

    $st = db()->prepare(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?) RETURNING id'
    );
    $st->execute([$name, $email, password_hash($password, PASSWORD_BCRYPT), $role]);
    $id = (int) $st->fetchColumn();

    respond(issue_token(['id' => $id, 'name' => $name, 'email' => $email, 'role' => $role]), 201);
}

function auth_login(): void
{
    $in = input();
    $email = strtolower(trim((string) ($in['email'] ?? '')));
    $password = (string) ($in['password'] ?? '');

    $st = db()->prepare('SELECT * FROM users WHERE email = ?');
    $st->execute([$email]);
    $user = $st->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        fail('Invalid email or password', 401);
    }
    respond(issue_token($user));
}

function auth_me(): void
{
    respond(['user' => auth_user()]);
}
