<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

ds_require_method('POST');
ds_rate_limit('login', 40, 15 * 60);

$input = ds_validate_login(ds_json_body());
$user = ds_find_user_by_identifier($input['identifier']);

if (!$user || !password_verify($input['password'], $user['password_hash'])) {
    ds_error(401, 'INVALID_CREDENTIALS', 'The email or password is incorrect.');
}

ds_assert_account_can_auth($user);

$now = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');
$stmt = ds_pdo()->prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?');
$stmt->execute([$now, $now, $user['id']]);

ds_login_user($user);
$fresh = ds_find_user_by_id($user['id']) ?: $user;
ds_success(['user' => ds_user_dto($fresh)]);
