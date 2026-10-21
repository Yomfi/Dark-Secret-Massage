<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

ds_require_method('POST');
ds_rate_limit('provider_send_phone', 8, 15 * 60);

$user = ds_require_provider();
$pdo = ds_pdo();
$now = ds_now_sql();

if (empty($user['phone'])) {
    ds_error(400, 'VALIDATION_ERROR', 'Add a phone number before verifying.');
}

if (!empty($user['phone_verified_at'])) {
    ds_success(['alreadyVerified' => true, 'message' => 'Phone already verified.']);
}

if (!ds_table_exists('phone_verification_tokens')) {
    ds_error(503, 'NOT_CONFIGURED', 'Phone verification is not available yet.');
}

// Attempt / resend limit: max 5 active sends per hour.
$limitStmt = $pdo->prepare(
    'SELECT COUNT(*) AS c FROM phone_verification_tokens
     WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)'
);
$limitStmt->execute([$user['id']]);
$count = (int) ($limitStmt->fetch()['c'] ?? 0);
if ($count >= 5) {
    ds_error(429, 'RATE_LIMITED', 'Too many verification codes sent. Try again later.');
}

$code = (string) random_int(100000, 999999);
$codeHash = hash('sha256', $code);
$expires = (new DateTimeImmutable('+10 minutes'))->format('Y-m-d H:i:s');

$pdo->prepare(
    'INSERT INTO phone_verification_tokens (id, user_id, code_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)'
)->execute([ds_new_id(), $user['id'], $codeHash, $expires, $now]);

// SMS provider not connected yet — architecture ready; demo mode returns code only outside production.
$payload = [
    'sent' => true,
    'expiresInSeconds' => 600,
    'message' => 'A verification code has been generated for your phone.',
    'smsConfigured' => false,
];

if (ds_otp_demo_mode()) {
    $payload['demoMode'] = true;
    $payload['demoCode'] = $code;
    $payload['message'] = 'Demo verification mode: use the provided code. SMS gateway not configured.';
}

ds_success($payload);
