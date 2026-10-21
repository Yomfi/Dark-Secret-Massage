<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

ds_require_method('POST');
ds_rate_limit('verify_phone', 30, 15 * 60);

$user = ds_require_user();
$body = ds_json_body();
$code = trim((string) ($body['code'] ?? ''));

if (!preg_match('/^\d{6}$/', $code)) {
    ds_error(400, 'VALIDATION_ERROR', 'Enter the 6-digit verification code.');
}

$hash = hash('sha256', $code);
$now = new DateTimeImmutable('now');

$stmt = ds_pdo()->prepare(
    'SELECT * FROM phone_verification_tokens
     WHERE user_id = ? AND code_hash = ? AND used_at IS NULL
     ORDER BY created_at DESC LIMIT 1'
);
$stmt->execute([$user['id'], $hash]);
$row = $stmt->fetch();

if (!$row || new DateTimeImmutable((string) $row['expires_at']) < $now) {
    ds_error(400, 'INVALID_TOKEN', 'Invalid or expired verification code.');
}

$ts = $now->format('Y-m-d H:i:s');
$pdo = ds_pdo();
try {
    $pdo->beginTransaction();
    $pdo->prepare(
        'UPDATE users SET phone_verified_at = ?, account_status = IF(account_status = \'pending_verification\', \'active\', account_status), updated_at = ? WHERE id = ?'
    )->execute([$ts, $ts, $user['id']]);
    $pdo->prepare('UPDATE phone_verification_tokens SET used_at = ? WHERE id = ?')
        ->execute([$ts, $row['id']]);
    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    ds_error(500, 'INTERNAL_ERROR', 'Unable to verify phone.');
}

$fresh = ds_find_user_by_id($user['id']) ?: $user;
ds_success(['user' => ds_user_dto($fresh), 'verified' => true]);
