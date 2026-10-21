<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

ds_require_method('POST');
ds_rate_limit('reset', 20, 15 * 60);

$input = ds_validate_reset(ds_json_body());
$hash = hash('sha256', $input['token']);
$now = new DateTimeImmutable('now');

$stmt = ds_pdo()->prepare(
    'SELECT * FROM password_reset_tokens
     WHERE token_hash = ? AND used_at IS NULL
     ORDER BY created_at DESC LIMIT 1'
);
$stmt->execute([$hash]);
$row = $stmt->fetch();

if (!$row) {
    ds_error(400, 'INVALID_TOKEN', 'Invalid or expired reset token.');
}

$expires = new DateTimeImmutable((string) $row['expires_at']);
if ($expires < $now) {
    ds_error(400, 'INVALID_TOKEN', 'Invalid or expired reset token.');
}

$passwordHash = password_hash($input['password'], PASSWORD_DEFAULT);
if ($passwordHash === false) {
    ds_error(500, 'INTERNAL_ERROR', 'Unable to reset password.');
}

$ts = $now->format('Y-m-d H:i:s');
$pdo = ds_pdo();
try {
    $pdo->beginTransaction();
    $pdo->prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
        ->execute([$passwordHash, $ts, $row['user_id']]);
    $pdo->prepare('UPDATE password_reset_tokens SET used_at = ? WHERE id = ?')
        ->execute([$ts, $row['id']]);
    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    ds_error(500, 'INTERNAL_ERROR', 'Unable to reset password.');
}

ds_success(['message' => 'Password updated. You can sign in with your new password.']);
