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

$sent = ds_send_template(
    'provider_verify',
    (string) ($user['email'] ?? ''),
    trim((string) ($user['first_name'] ?? '')),
    [
        'first_name' => (string) ($user['first_name'] ?? ''),
        'token' => $token,
        'link' => ds_app_link('/provider/register'),
        'expires_hours' => 24,
    ],
    ['user' => (string) $user['id']]
);

if ($sent['sent']) {
    ds_success([
        'sent' => true,
        'expiresInSeconds' => 86400,
        'emailConfigured' => true,
        'message' => 'We sent a verification code to your email address.',
    ]);
}

if (ds_is_prod()) {
    // Do not hand out a token whose email never arrived.
    $pdo->prepare('DELETE FROM email_verification_tokens WHERE token_hash = ?')->execute([$tokenHash]);
    ds_error(
        503,
        $sent['code'] === 'not_configured' ? 'EMAIL_NOT_CONFIGURED' : 'EMAIL_DELIVERY_FAILED',
        $sent['code'] === 'not_configured'
            ? 'Email delivery is not configured yet. Please contact support.'
            : 'We could not send the verification email. Please try again shortly.'
    );
}

// Local/staging fallback: keep the flow usable without a real mailbox.
ds_success([
    'sent' => false,
    'expiresInSeconds' => 86400,
    'emailConfigured' => ds_mail_configured(),
    'demoMode' => true,
    'demoToken' => $token,
    'message' => 'Email delivery unavailable in this environment (' . $sent['code'] . '). Use the provided token.',
]);
