<?php
declare(strict_types=1);

/**
 * Resend the account-confirmation email for the signed-in user.
 * Tokens expire after 24 hours, are single-use, and resends are rate limited.
 */

require_once dirname(__DIR__) . '/config/bootstrap.php';

ds_require_method('POST');
ds_rate_limit('auth_resend_verification', 6, 15 * 60);

$user = ds_require_user();
$pdo = ds_pdo();

if (!empty($user['email_verified_at'])) {
    ds_success(['alreadyVerified' => true, 'message' => 'Your email address is already confirmed.']);
}

if (!ds_table_exists('email_verification_tokens')) {
    ds_error(503, 'NOT_CONFIGURED', 'Email confirmation is not available yet.');
}

$email = trim((string) ($user['email'] ?? ''));
if ($email === '') {
    ds_error(400, 'VALIDATION_ERROR', 'Add an email address to your account first.');
}

// Resend limit: at most 5 confirmation emails per hour, per account.
$now = ds_now_sql();
$since = (new DateTimeImmutable('-1 hour'))->format('Y-m-d H:i:s');
$limitStmt = $pdo->prepare(
    'SELECT COUNT(*) AS c FROM email_verification_tokens WHERE user_id = ? AND created_at > ?'
);
$limitStmt->execute([$user['id'], $since]);
if ((int) ($limitStmt->fetch()['c'] ?? 0) >= 5) {
    ds_error(429, 'RATE_LIMITED', 'Too many confirmation emails requested. Try again in an hour.');
}

$token = bin2hex(random_bytes(32));
$tokenHash = hash('sha256', $token);
$expires = (new DateTimeImmutable('+24 hours'))->format('Y-m-d H:i:s');
$tokenId = ds_new_id();

$pdo->prepare(
    'INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)'
)->execute([$tokenId, $user['id'], $tokenHash, $expires, $now]);

$sent = ds_send_template(
    'verify_account',
    $email,
    trim((string) ($user['first_name'] ?? '')),
    [
        'first_name' => (string) ($user['first_name'] ?? ''),
        'link' => ds_app_link('/verify-email', ['token' => $token]),
        'expires_hours' => 24,
    ],
    ['user' => (string) $user['id']]
);

if ($sent['sent']) {
    // Only the newest link stays usable; earlier unused links are retired.
    $pdo->prepare(
        'UPDATE email_verification_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL AND id <> ?'
    )->execute([$now, $user['id'], $tokenId]);

    ds_success([
        'sent' => true,
        'expiresInSeconds' => 86400,
        'emailConfigured' => true,
        'message' => 'We sent a new confirmation link to your email address.',
    ]);
}

if (ds_is_prod()) {
    // Never hand out a link whose email did not leave the server.
    $pdo->prepare('DELETE FROM email_verification_tokens WHERE id = ?')->execute([$tokenId]);
    ds_error(
        503,
        $sent['code'] === 'not_configured' ? 'EMAIL_NOT_CONFIGURED' : 'EMAIL_DELIVERY_FAILED',
        $sent['code'] === 'not_configured'
            ? 'Email delivery is not configured yet. Please contact support.'
            : 'We could not send the confirmation email. Please try again shortly.'
    );
}

// Local/staging fallback so the flow stays testable without a mailbox.
$pdo->prepare(
    'UPDATE email_verification_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL AND id <> ?'
)->execute([$now, $user['id'], $tokenId]);

ds_success([
    'sent' => false,
    'expiresInSeconds' => 86400,
    'emailConfigured' => ds_mail_configured(),
    'demoMode' => true,
    'demoToken' => $token,
    'message' => 'Email delivery unavailable in this environment (' . $sent['code'] . '). Use the provided token.',
]);
