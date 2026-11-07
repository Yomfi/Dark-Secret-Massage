<?php
declare(strict_types=1);

/**
 * One email-confirmation flow for customers, individual providers and agencies.
 *
 * Tokens are random, stored only as SHA-256 hashes, valid for 24 hours and
 * consumed atomically so two requests cannot both use the same link.
 */

function ds_email_verification_is_provider(array $user): bool
{
    return in_array((string) ($user['role'] ?? ''), ['massage_provider', 'provider'], true);
}

/**
 * Issue a fresh confirmation token and email its link.
 *
 * A failed delivery never retires the previously usable link: older tokens are
 * only invalidated after the new message has actually been accepted for
 * delivery. Production never returns the raw token; development does so the
 * flow stays testable without a mailbox.
 *
 * @param array<string, mixed> $user
 * @return array<string, mixed>
 */
function ds_email_verification_send_link(array $user, string $bucket, int $maxPerWindow = 6): array
{
    if (!empty($user['email_verified_at'])) {
        return [
            'alreadyVerified' => true,
            'message' => 'Your email address is already confirmed.',
        ];
    }

    if (!ds_table_exists('email_verification_tokens')) {
        ds_error(503, 'NOT_CONFIGURED', 'Email confirmation is not available yet.');
    }

    $email = trim((string) ($user['email'] ?? ''));
    if ($email === '') {
        ds_error(400, 'VALIDATION_ERROR', 'Add an email address to your account first.');
    }

    ds_rate_limit($bucket, $maxPerWindow, 15 * 60);

    $pdo = ds_pdo();
    $now = ds_now_sql();
    $userId = (string) $user['id'];

    // At most 5 confirmation emails per account per hour.
    $since = (new DateTimeImmutable('-1 hour'))->format('Y-m-d H:i:s');
    $limitStmt = $pdo->prepare(
        'SELECT COUNT(*) AS c FROM email_verification_tokens WHERE user_id = ? AND created_at > ?'
    );
    $limitStmt->execute([$userId, $since]);
    if ((int) ($limitStmt->fetch()['c'] ?? 0) >= 5) {
        ds_error(429, 'RATE_LIMITED', 'Too many confirmation emails requested. Try again in an hour.');
    }

    $token = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $token);
    $tokenId = ds_new_id();
    $expires = (new DateTimeImmutable('+24 hours'))->format('Y-m-d H:i:s');

    $pdo->prepare(
        'INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?)'
    )->execute([$tokenId, $userId, $tokenHash, $expires, $now]);

    $sent = ds_send_template(
        'verify_account',
        $email,
        trim((string) ($user['first_name'] ?? '')),
        [
            'first_name' => (string) ($user['first_name'] ?? ''),
            'link' => ds_app_link('/verify-email', ['token' => $token]),
            'expires_hours' => 24,
        ],
        ['user' => $userId]
    );

    if ($sent['sent']) {
        // Only the newest delivered link stays usable.
        $pdo->prepare(
            'UPDATE email_verification_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL AND id <> ?'
        )->execute([$now, $userId, $tokenId]);

        return [
            'sent' => true,
            'expiresInSeconds' => 86400,
            'emailConfigured' => true,
            'message' => 'We sent a new confirmation link to your email address.',
        ];
    }

    if (ds_is_prod()) {
        // Never leave a usable token behind for a message that never left.
        $pdo->prepare('DELETE FROM email_verification_tokens WHERE id = ?')->execute([$tokenId]);
        ds_error(
            503,
            $sent['code'] === 'not_configured' ? 'EMAIL_NOT_CONFIGURED' : 'EMAIL_DELIVERY_FAILED',
            $sent['code'] === 'not_configured'
                ? 'Email delivery is not configured yet. Please contact support.'
                : 'We could not send the confirmation email. Please try again shortly.'
        );
    }

    // Development fallback: keep this token (and any earlier one) usable.
    return [
        'sent' => false,
        'expiresInSeconds' => 86400,
        'emailConfigured' => ds_mail_configured(),
        'demoMode' => true,
        'demoToken' => $token,
        'message' => 'Email delivery unavailable in this environment (' . $sent['code'] . '). Use the provided token.',
    ];
}

/**
 * Atomically consume a confirmation token and verify the account.
 *
 * Verification does not require a session, so a link opened in another browser
 * works. Providers also get provider_verification.email_verified_at updated,
 * creating the verification row first when a legacy account lacks one.
 *
 * @return array{user: array<string, mixed>|null, verified: bool}
 */
function ds_email_verification_confirm(string $token, ?string $expectedUserId = null): array
{
    if (strlen($token) < 10) {
        ds_error(400, 'VALIDATION_ERROR', 'Invalid verification token.');
    }

    $pdo = ds_pdo();
    $hash = hash('sha256', $token);
    $now = new DateTimeImmutable('now');

    $sql = 'SELECT * FROM email_verification_tokens WHERE token_hash = ? AND used_at IS NULL';
    $params = [$hash];
    if ($expectedUserId !== null) {
        $sql .= ' AND user_id = ?';
        $params[] = $expectedUserId;
    }
    $sql .= ' ORDER BY created_at DESC LIMIT 1';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch();

    if (!$row || new DateTimeImmutable((string) $row['expires_at']) < $now) {
        ds_error(400, 'INVALID_TOKEN', 'Invalid or expired verification token.');
    }

    $ts = $now->format('Y-m-d H:i:s');
    $userId = (string) $row['user_id'];

    try {
        $pdo->beginTransaction();

        // Claim the token first; losing a race means the link is already used.
        $claim = $pdo->prepare(
            'UPDATE email_verification_tokens SET used_at = ? WHERE id = ? AND used_at IS NULL'
        );
        $claim->execute([$ts, $row['id']]);
        if ($claim->rowCount() === 0) {
            $pdo->rollBack();
            ds_error(400, 'INVALID_TOKEN', 'Invalid or expired verification token.');
        }

        $pdo->prepare(
            'UPDATE users SET email_verified_at = ?, updated_at = ?, '
            . 'account_status = CASE WHEN account_status = \'pending_verification\' THEN \'active\' ELSE account_status END '
            . 'WHERE id = ?'
        )->execute([$ts, $ts, $userId]);

        $user = ds_find_user_by_id($userId);
        if (!$user) {
            $pdo->rollBack();
            ds_error(404, 'NOT_FOUND', 'Account not found.');
        }

        if (ds_email_verification_is_provider($user) && ds_table_exists('provider_verification')) {
            ds_ensure_provider_verification($userId);
            $pdo->prepare(
                'UPDATE provider_verification SET email_verified_at = ?, updated_at = ? WHERE provider_user_id = ?'
            )->execute([$ts, $ts, $userId]);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    $fresh = ds_find_user_by_id($userId);
    return [
        'user' => $fresh ? ds_user_dto($fresh) : null,
        'verified' => true,
    ];
}
