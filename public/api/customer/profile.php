<?php
declare(strict_types=1);

/** Customer profile and password self-service. */

require_once dirname(__DIR__) . '/config/bootstrap.php';

$user = ds_require_user();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
    ds_success([
        'user' => ds_user_dto($user),
        'emailVerified' => !empty($user['email_verified_at']),
        'accountStatus' => (string) $user['account_status'],
        'avatarUrl' => ds_customer_avatar_url((string) $user['id']),
    ]);
}

ds_require_method('POST');
ds_require_same_origin();
ds_rate_limit('customer_profile', 20, 15 * 60);

$body = ds_json_body();
$action = strtolower(trim((string) ($body['action'] ?? 'profile')));
$now = ds_now_sql();

if ($action === 'profile') {
    $first = trim((string) ($body['firstName'] ?? ''));
    $last = trim((string) ($body['lastName'] ?? ''));
    $phone = trim((string) ($body['phone'] ?? ''));

    if ($first === '' || mb_strlen($first) > 100 || $last === '' || mb_strlen($last) > 100) {
        ds_error(400, 'VALIDATION_ERROR', 'Enter your first and last name.');
    }
    if ($phone !== '' && isset(ds_users_columns()['phone'])) {
        $stmt = ds_pdo()->prepare('SELECT id FROM users WHERE phone = ? AND id <> ? LIMIT 1');
        $stmt->execute([$phone, $user['id']]);
        if ($stmt->fetch()) {
            ds_error(409, 'PHONE_IN_USE', 'That phone number is already in use.');
        }
    }

    ds_pdo()->prepare('UPDATE users SET first_name = ?, last_name = ?, phone = ?, updated_at = ? WHERE id = ?')
        ->execute([$first, $last, $phone !== '' ? $phone : ($user['phone'] ?? ''), $now, $user['id']]);

    $fresh = ds_find_user_by_id($user['id']);
    ds_success(['saved' => true, 'user' => $fresh ? ds_user_dto($fresh) : null]);
}

if ($action === 'password') {
    $current = (string) ($body['currentPassword'] ?? '');
    $next = (string) ($body['newPassword'] ?? '');
    $confirm = (string) ($body['confirmPassword'] ?? '');

    $hash = ds_password_hash_column($user);
    if (!$hash || !password_verify($current, $hash)) {
        ds_error(400, 'INVALID_CREDENTIALS', 'Your current password is incorrect.');
    }
    if (strlen($next) < 8 || strlen($next) > 128 || !preg_match('/[A-Za-z]/', $next) || !preg_match('/[0-9]/', $next)) {
        ds_error(400, 'VALIDATION_ERROR', 'Password must be at least 8 characters and include a letter and a number.');
    }
    if ($next !== $confirm) {
        ds_error(400, 'VALIDATION_ERROR', 'Passwords do not match.');
    }

    $newHash = password_hash($next, PASSWORD_DEFAULT);
    if ($newHash === false) {
        ds_error(500, 'INTERNAL_ERROR', 'Unable to update the password.');
    }
    ds_pdo()->prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
        ->execute([$newHash, $now, $user['id']]);
    ds_success(['saved' => true]);
}

ds_error(400, 'VALIDATION_ERROR', 'Unknown profile action.');
