<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

ds_require_method('POST');
ds_rate_limit('register', 20, 15 * 60);

$input = ds_validate_register(ds_json_body());
$pdo = ds_pdo();

$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$input['email']]);
if ($stmt->fetch()) {
    ds_error(409, 'EMAIL_IN_USE', 'An account with this email already exists.');
}

$stmt = $pdo->prepare('SELECT id FROM users WHERE phone = ? LIMIT 1');
$stmt->execute([$input['phone']]);
if ($stmt->fetch()) {
    ds_error(409, 'PHONE_IN_USE', 'An account with this phone number already exists.');
}

$id = ds_new_id();
$hash = password_hash($input['password'], PASSWORD_DEFAULT);
if ($hash === false) {
    ds_error(500, 'INTERNAL_ERROR', 'Unable to create account.');
}

$now = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');

try {
    $pdo->beginTransaction();

    $insert = $pdo->prepare(
        'INSERT INTO users (
            id, first_name, last_name, email, phone, password_hash,
            role, account_status, terms_accepted_at, created_at, updated_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?,
            \'user\', \'pending_verification\', ?, ?, ?
        )'
    );
    $insert->execute([
        $id,
        $input['firstName'],
        $input['lastName'],
        $input['email'],
        $input['phone'],
        $hash,
        $now,
        $now,
        $now,
    ]);

    // Prepare email verification token (delivery can be wired later)
    $emailRaw = bin2hex(random_bytes(32));
    $emailHash = hash('sha256', $emailRaw);
    $emailExp = (new DateTimeImmutable('+24 hours'))->format('Y-m-d H:i:s');
    $pdo->prepare(
        'INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?)'
    )->execute([ds_new_id(), $id, $emailHash, $emailExp, $now]);

    // Prepare phone OTP (delivery can be wired later)
    $phoneCode = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $phoneHash = hash('sha256', $phoneCode);
    $phoneExp = (new DateTimeImmutable('+15 minutes'))->format('Y-m-d H:i:s');
    $pdo->prepare(
        'INSERT INTO phone_verification_tokens (id, user_id, code_hash, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?)'
    )->execute([ds_new_id(), $id, $phoneHash, $phoneExp, $now]);

    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if (!ds_is_prod()) {
        ds_error(500, 'INTERNAL_ERROR', 'Unable to create account.', $e->getMessage());
    }
    ds_error(500, 'INTERNAL_ERROR', 'Unable to create account.');
}

$user = ds_find_user_by_id($id);
if (!$user) {
    ds_error(500, 'INTERNAL_ERROR', 'Unable to create account.');
}

ds_login_user($user);
ds_success(['user' => ds_user_dto($user)], 201);
