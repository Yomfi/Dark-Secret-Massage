<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

ds_require_method('POST');
ds_rate_limit('forgot', 20, 15 * 60);

$email = ds_validate_forgot(ds_json_body());
$generic = [
    'message' => 'If an account exists for that email, reset instructions have been sent.',
];

$stmt = ds_pdo()->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$user = $stmt->fetch();

if ($user) {
    $raw = bin2hex(random_bytes(32));
    $hash = hash('sha256', $raw);
    $now = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');
    $exp = (new DateTimeImmutable('+1 hour'))->format('Y-m-d H:i:s');

    ds_pdo()->prepare(
        'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?)'
    )->execute([ds_new_id(), $user['id'], $hash, $exp, $now]);

    // Email delivery can be wired later. In non-production, include token for QA only.
    if (!ds_is_prod()) {
        $generic['devResetToken'] = $raw;
    }
}

ds_success($generic);
