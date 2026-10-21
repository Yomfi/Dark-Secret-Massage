<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

ds_require_method('POST');
ds_rate_limit('login', 40, 15 * 60);

$input = ds_validate_login(ds_json_body());

// Prefer email match (frontend may send email or phone in `identifier`).
$user = ds_find_user_by_identifier($input['identifier']);
$hash = $user ? ds_password_hash_column($user) : null;

if (!$user || !$hash || !password_verify($input['password'], $hash)) {
    ds_error(401, 'INVALID_CREDENTIALS', 'The email or password is incorrect.');
}

ds_assert_account_can_auth($user);

$cols = ds_users_columns();
$now = ds_now_sql();
$sets = [];
$params = [];
if (isset($cols['last_login_at'])) {
    $sets[] = 'last_login_at = ?';
    $params[] = $now;
}
if (isset($cols['updated_at'])) {
    $sets[] = 'updated_at = ?';
    $params[] = $now;
}
if ($sets) {
    $params[] = $user['id'];
    ds_pdo()->prepare('UPDATE users SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
}

ds_login_user($user);
$fresh = ds_find_user_by_id($user['id']) ?: $user;
ds_success(['user' => ds_user_dto($fresh)]);
