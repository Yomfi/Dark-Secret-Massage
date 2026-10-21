<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

ds_require_method('POST');
ds_rate_limit('provider_verify_email', 20, 15 * 60);

$user = ds_require_provider();
$body = ds_json_body();
$token = trim((string) ($body['token'] ?? ''));

if (strlen($token) < 10) {
    ds_error(400, 'VALIDATION_ERROR', 'Invalid verification token.');
}

$hash = hash('sha256', $token);
$now = new DateTimeImmutable('now');
$pdo = ds_pdo();

$stmt = $pdo->prepare(
    'SELECT * FROM email_verification_tokens
     WHERE user_id = ? AND token_hash = ? AND used_at IS NULL
     ORDER BY created_at DESC LIMIT 1'
);
$stmt->execute([$user['id'], $hash]);
$row = $stmt->fetch();

if (!$row || new DateTimeImmutable((string) $row['expires_at']) < $now) {
    ds_error(400, 'INVALID_TOKEN', 'Invalid or expired verification token.');
}

$ts = $now->format('Y-m-d H:i:s');
try {
    $pdo->beginTransaction();
    $pdo->prepare(
        'UPDATE users SET email_verified_at = ?, updated_at = ? WHERE id = ?'
    )->execute([$ts, $ts, $user['id']]);
    $pdo->prepare('UPDATE email_verification_tokens SET used_at = ? WHERE id = ?')
        ->execute([$ts, $row['id']]);

    if (ds_table_exists('provider_verification')) {
        ds_ensure_provider_verification($user['id']);
        $pdo->prepare(
            'UPDATE provider_verification SET email_verified_at = ?, updated_at = ? WHERE provider_user_id = ?'
        )->execute([$ts, $ts, $user['id']]);
    }
    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    ds_error(500, 'INTERNAL_ERROR', 'Unable to verify email.');
}

$fresh = ds_find_user_by_id($user['id']) ?: $user;
ds_success(['user' => ds_user_dto($fresh), 'verified' => true, 'nextStep' => 'provider_profile']);
