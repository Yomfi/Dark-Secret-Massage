<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

ds_require_method('POST');
ds_rate_limit('forgot', 20, 15 * 60);

$email = ds_validate_forgot(ds_json_body());
$generic = [
    'message' => 'If an account exists for that email, reset instructions have been sent.',
];

$stmt = ds_pdo()->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$user = $stmt->fetch();

if ($user) {
    $raw = bin2hex(random_bytes(32));
    $hash = hash('sha256', $raw);
    $now = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');
    $exp = (new DateTimeImmutable('+1 hour'))->format('Y-m-d H:i:s');
    $tokenId = ds_new_id();

    ds_pdo()->prepare(
        'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?)'
    )->execute([$tokenId, $user['id'], $hash, $exp, $now]);

    $sent = ds_send_template(
        'password_reset',
        (string) ($user['email'] ?? $email),
        trim((string) ($user['first_name'] ?? '')),
        [
            'first_name' => (string) ($user['first_name'] ?? ''),
            'link' => ds_app_link('/reset-password', ['token' => $raw]),
            'expires_minutes' => 60,
        ],
        ['user' => (string) $user['id']]
    );

    if (!$sent['sent']) {
        // Never leave a dead reset link behind when delivery failed.
        ds_pdo()->prepare('DELETE FROM password_reset_tokens WHERE id = ?')->execute([$tokenId]);
    }

    // QA helper only — tokens are never returned when app_env is production.
    if (!ds_is_prod()) {
        $generic['devResetToken'] = $raw;
        $generic['emailSent'] = $sent['sent'];
        if (!$sent['sent']) {
            $generic['emailError'] = $sent['error'];
        }
    }
}

ds_success($generic);
