<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

ds_require_method('POST');
ds_rate_limit('provider_register', 15, 15 * 60);

$body = ds_json_body();
$input = ds_validate_register($body);

$providerType = strtolower(trim((string) ($body['providerType'] ?? 'individual')));
if (!in_array($providerType, ['individual', 'agency'], true)) {
    ds_error(400, 'VALIDATION_ERROR', 'Select how you are registering: individual or agency.');
}

$gender = strtolower(trim((string) ($body['gender'] ?? '')));
if ($providerType === 'individual' && !in_array($gender, ['female', 'male'], true)) {
    ds_error(400, 'VALIDATION_ERROR', 'Select gender: female or male.');
}
if ($providerType === 'agency') {
    $gender = '';
}

$businessName = trim((string) ($body['businessName'] ?? ''));
$displayName = trim((string) ($body['displayName'] ?? ''));
if ($providerType === 'agency') {
    if ($businessName === '') {
        ds_error(400, 'VALIDATION_ERROR', 'Enter your agency / business name.');
    }
    if ($displayName === '') {
        $displayName = $businessName;
    }
} elseif ($displayName === '') {
    $displayName = trim($input['firstName'] . ' ' . $input['lastName']);
}
if ($displayName === '' || strlen($displayName) > 120) {
    ds_error(400, 'VALIDATION_ERROR', 'Enter a valid display name.');
}

$pdo = ds_pdo();
$cols = ds_users_columns();

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
// Existing schema ENUM includes massage_provider; treat as provider role.
$role = 'massage_provider';

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
    $values[] = $role;
}
if (isset($cols['account_status'])) {
    $fields[] = 'account_status';
    $values[] = 'active';
}
if (isset($cols['terms_accepted_at'])) {
    $fields[] = 'terms_accepted_at';
    $values[] = $now;
}
if (isset($cols['onboarding_choice'])) {
    $fields[] = 'onboarding_choice';
    $values[] = 'become_provider';
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

try {
    $pdo->beginTransaction();
    $pdo->prepare(
        'INSERT INTO users (' . implode(', ', $fields) . ') VALUES (' . $placeholders . ')'
    )->execute($values);

    if (ds_table_exists('provider_verification')) {
        $pdo->prepare(
            'INSERT INTO provider_verification
             (id, provider_user_id, identity_status, payment_status, verification_status,
              verification_fee_amount, currency, created_at, updated_at)
             VALUES (?, ?, \'not_submitted\', \'unpaid\', \'unverified\', 100.00, \'GHS\', ?, ?)'
        )->execute([ds_new_id(), $id, $now, $now]);
    }

    if (ds_table_exists('provider_profiles')) {
        $slug = ds_unique_provider_slug($displayName);
        if (ds_column_exists('provider_profiles', 'provider_type')) {
            $pdo->prepare(
                'INSERT INTO provider_profiles
                 (id, user_id, slug, display_name, provider_type, gender, business_name,
                  contact_first_name, contact_last_name, city, country, profile_completion,
                  created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, \'Ghana\', 10, ?, ?)'
            )->execute([
                ds_new_id(),
                $id,
                $slug,
                $displayName,
                $providerType,
                $gender !== '' ? $gender : null,
                $providerType === 'agency' ? $businessName : null,
                $input['firstName'],
                $input['lastName'],
                'Accra',
                $now,
                $now,
            ]);
        } else {
            $pdo->prepare(
                'INSERT INTO provider_profiles
                 (id, user_id, slug, display_name, city, country, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, \'Ghana\', ?, ?)'
            )->execute([ds_new_id(), $id, $slug, $displayName, 'Accra', $now, $now]);
        }
    }

    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if (!ds_is_prod()) {
        ds_error(500, 'INTERNAL_ERROR', 'Unable to create provider account.', $e->getMessage());
    }
    ds_error(500, 'INTERNAL_ERROR', 'Unable to create provider account.');
}

$user = ds_find_user_by_id($id);
if (!$user) {
    ds_error(500, 'INTERNAL_ERROR', 'Unable to create provider account.');
}

ds_login_user($user);
ds_success([
    'user' => ds_user_dto($user),
    'providerType' => $providerType,
    'gender' => $gender !== '' ? $gender : null,
    'nextStep' => 'phone_verification',
], 201);
