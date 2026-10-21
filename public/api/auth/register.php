<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

ds_require_method('POST');
ds_rate_limit('register', 20, 15 * 60);

$input = ds_validate_register(ds_json_body());
$pdo = ds_pdo();
$cols = ds_users_columns();

if (!isset($cols['email']) || !isset($cols['password_hash'])) {
    ds_error(500, 'SCHEMA_ERROR', 'Users table is missing required columns.');
}

if (ds_find_user_by_email($input['email'])) {
    ds_error(409, 'EMAIL_IN_USE', 'An account with this email already exists.');
}

if (isset($cols['phone']) && $input['phone'] !== '') {
    $stmt = $pdo->prepare('SELECT id FROM users WHERE phone = ? LIMIT 1');
    $stmt->execute([$input['phone']]);
    if ($stmt->fetch()) {
        ds_error(409, 'PHONE_IN_USE', 'An account with this phone number already exists.');
    }
}

$id = ds_new_id();
$hash = password_hash($input['password'], PASSWORD_DEFAULT);
if ($hash === false) {
    ds_error(500, 'INTERNAL_ERROR', 'Unable to create account.');
}

$now = ds_now_sql();

$fields = ['id', 'email', 'password_hash'];
$values = [$id, $input['email'], $hash];

if (isset($cols['first_name'])) {
    $fields[] = 'first_name';
    $values[] = $input['firstName'];
}
if (isset($cols['last_name'])) {
    $fields[] = 'last_name';
    $values[] = $input['lastName'];
}
if (isset($cols['phone'])) {
    $fields[] = 'phone';
    $values[] = $input['phone'];
}
if (isset($cols['role'])) {
    $fields[] = 'role';
    $values[] = 'user';
}
if (isset($cols['account_status'])) {
    $fields[] = 'account_status';
    // Active so login works immediately after register on Hostinger.
    $values[] = 'active';
}
if (isset($cols['terms_accepted_at'])) {
    $fields[] = 'terms_accepted_at';
    $values[] = $now;
}
if (isset($cols['created_at'])) {
    $fields[] = 'created_at';
    $values[] = $now;
}
if (isset($cols['updated_at'])) {
    $fields[] = 'updated_at';
    $values[] = $now;
}

$placeholders = implode(', ', array_fill(0, count($fields), '?'));
$sql = 'INSERT INTO users (' . implode(', ', $fields) . ') VALUES (' . $placeholders . ')';

try {
    $pdo->prepare($sql)->execute($values);
} catch (Throwable $e) {
    if (!ds_is_prod()) {
        ds_error(500, 'INTERNAL_ERROR', 'Unable to create account.', $e->getMessage());
    }
    ds_error(500, 'INTERNAL_ERROR', 'Unable to create account.');
}

// Optional verification rows — never fail registration if these tables are missing.
try {
    if (ds_table_exists('email_verification_tokens')) {
        $emailRaw = bin2hex(random_bytes(32));
        $pdo->prepare(
            'INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at, created_at)
             VALUES (?, ?, ?, ?, ?)'
        )->execute([
            ds_new_id(),
            $id,
            hash('sha256', $emailRaw),
            (new DateTimeImmutable('+24 hours'))->format('Y-m-d H:i:s'),
            $now,
        ]);
    }
} catch (Throwable $e) {
    // ignore
}

$user = ds_find_user_by_id($id);
if (!$user) {
    ds_error(500, 'INTERNAL_ERROR', 'Unable to create account.');
}

ds_login_user($user);
ds_success(['user' => ds_user_dto($user)], 201);
