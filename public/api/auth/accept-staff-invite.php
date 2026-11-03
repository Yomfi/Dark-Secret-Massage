<?php
declare(strict_types=1);

/**
 * Accept a staff invitation: validate token, set password, activate profile.
 */

require_once dirname(__DIR__) . '/config/bootstrap.php';

ds_require_method('POST');
ds_rate_limit('staff_accept', 20, 15 * 60);

$body = ds_json_body();
$token = trim((string) ($body['token'] ?? ''));
$password = (string) ($body['password'] ?? '');
$confirm = (string) ($body['confirmPassword'] ?? '');

if ($token === '' || strlen($password) < 10) {
    ds_error(400, 'VALIDATION_ERROR', 'Token and a password of at least 10 characters are required.');
}
if ($password !== $confirm) {
    ds_error(400, 'VALIDATION_ERROR', 'Passwords do not match.');
}
if (!ds_table_exists('staff_invitations')) {
    ds_error(503, 'SCHEMA_NOT_MIGRATED', 'Staff invitations are not available yet.');
}

$hash = hash('sha256', $token);
$stmt = ds_pdo()->prepare(
    'SELECT * FROM staff_invitations
     WHERE token_hash = ? AND accepted_at IS NULL AND expires_at > NOW()
     LIMIT 1'
);
$stmt->execute([$hash]);
$invite = $stmt->fetch();
if (!$invite) {
    ds_error(400, 'INVALID_TOKEN', 'This invitation is invalid or has expired.');
}

$email = (string) $invite['email'];
$stmt = ds_pdo()->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$user = $stmt->fetch();
if (!$user) {
    ds_error(404, 'NOT_FOUND', 'Invited account was not found.');
}

$now = ds_now_sql();
$pdo = ds_pdo();
$pdo->prepare('UPDATE users SET password_hash = ?, email_verified_at = COALESCE(email_verified_at, ?), account_status = \'active\', updated_at = ? WHERE id = ?')
    ->execute([password_hash($password, PASSWORD_DEFAULT), $now, $now, $user['id']]);

$pdo->prepare(
    'INSERT INTO staff_profiles (user_id, staff_role, is_active, activated_at, created_at, updated_at)
     VALUES (?, ?, 1, ?, ?, ?)
     ON DUPLICATE KEY UPDATE is_active = 1, staff_role = VALUES(staff_role),
       activated_at = VALUES(activated_at), updated_at = VALUES(updated_at)'
)->execute([
    $user['id'],
    (string) $invite['staff_role'],
    $now,
    $now,
    $now,
]);

$pdo->prepare('UPDATE staff_invitations SET accepted_at = ? WHERE id = ?')
    ->execute([$now, $invite['id']]);

ds_audit('staff.invite_accepted', 'user', (string) $user['id'], [
    'email' => $email,
    'staffRole' => $invite['staff_role'],
], (string) $user['id']);

// Establish session so the invitee lands in the admin workspace immediately.
ds_login_user($user);

$fresh = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
$fresh->execute([$user['id']]);
$freshUser = $fresh->fetch() ?: $user;

ds_success([
    'accepted' => true,
    'user' => ds_user_dto($freshUser),
]);
