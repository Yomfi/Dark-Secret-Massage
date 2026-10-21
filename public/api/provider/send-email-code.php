<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

ds_require_method('POST');
ds_rate_limit('provider_send_email', 8, 15 * 60);

$user = ds_require_provider();
$pdo = ds_pdo();
$now = ds_now_sql();

if (!empty($user['email_verified_at'])) {
    ds_success(['alreadyVerified' => true, 'message' => 'Email already verified.']);
}

if (!ds_table_exists('email_verification_tokens')) {
    ds_error(503, 'NOT_CONFIGURED', 'Email verification is not available yet.');
}

$token = bin2hex(random_bytes(32));
$tokenHash = hash('sha256', $token);
$expires = (new DateTimeImmutable('+24 hours'))->format('Y-m-d H:i:s');

$pdo->prepare(
    'INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)'
)->execute([ds_new_id(), $user['id'], $tokenHash, $expires, $now]);

$payload = [
    'sent' => true,
    'expiresInSeconds' => 86400,
    'message' => 'A verification link/token has been generated for your email.',
    'emailConfigured' => false,
];

if (ds_otp_demo_mode()) {
    $payload['demoMode'] = true;
    $payload['demoToken'] = $token;
    $payload['message'] = 'Demo verification mode: use the provided token. Email gateway not configured.';
}

ds_success($payload);
