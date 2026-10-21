<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

ds_require_method('POST');
ds_rate_limit('verify_email', 30, 15 * 60);

$body = ds_json_body();
$token = (string) ($body['token'] ?? '');
if (strlen($token) < 10) {
    ds_error(400, 'VALIDATION_ERROR', 'Invalid verification token.');
}

$hash = hash('sha256', $token);
$now = new DateTimeImmutable('now');

$stmt = ds_pdo()->prepare(
    'SELECT * FROM email_verification_tokens
     WHERE token_hash = ? AND used_at IS NULL
     ORDER BY created_at DESC LIMIT 1'
);
$stmt->execute([$hash]);
$row = $stmt->fetch();

if (!$row) {
    ds_error(400, 'INVALID_TOKEN', 'Invalid or expired verification token.');
}

if (new DateTimeImmutable((string) $row['expires_at']) < $now) {
    ds_error(400, 'INVALID_TOKEN', 'Invalid or expired verification token.');
}

$ts = $now->format('Y-m-d H:i:s');
$pdo = ds_pdo();
try {
    $pdo->beginTransaction();
    $pdo->prepare(
        'UPDATE users SET email_verified_at = ?, account_status = IF(account_status = \'pending_verification\', \'active\', account_status), updated_at = ? WHERE id = ?'
    )->execute([$ts, $ts, $row['user_id']]);
    $pdo->prepare('UPDATE email_verification_tokens SET used_at = ? WHERE id = ?')
        ->execute([$ts, $row['id']]);
    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    ds_error(500, 'INTERNAL_ERROR', 'Unable to verify email.');
}

$user = ds_find_user_by_id($row['user_id']);
ds_success(['user' => $user ? ds_user_dto($user) : null, 'verified' => true]);
