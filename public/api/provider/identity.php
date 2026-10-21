<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

ds_require_method('POST');
ds_rate_limit('provider_identity', 10, 15 * 60);

$user = ds_require_provider();

if (!ds_table_exists('provider_identity_documents')) {
    ds_error(503, 'NOT_CONFIGURED', 'Identity verification table is not installed. Run the SQL migration.');
}

$idType = trim((string) ($_POST['idType'] ?? ''));
$idNumber = trim((string) ($_POST['idNumber'] ?? ''));

if ($idType === '') {
    ds_error(400, 'VALIDATION_ERROR', 'Select an ID type.');
}

if (empty($_FILES['idImage']) || empty($_FILES['selfieImage'])) {
    ds_error(400, 'VALIDATION_ERROR', 'Government ID image and selfie are required.');
}

$idPath = ds_save_uploaded_image($_FILES['idImage'], 'identity/' . $user['id']);
$selfiePath = ds_save_uploaded_image($_FILES['selfieImage'], 'identity/' . $user['id']);

$encryptedId = $idNumber !== ''
    ? base64_encode(hash_hmac('sha256', $idNumber, $user['id'] . '|ds-id', true))
    : null;

$now = ds_now_sql();
$pdo = ds_pdo();

$pdo->prepare(
    'INSERT INTO provider_identity_documents
     (id, provider_user_id, id_type, id_number_encrypted, id_image_path, selfie_image_path, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, \'pending\', ?, ?)'
)->execute([
    ds_new_id(),
    $user['id'],
    $idType,
    $encryptedId,
    $idPath,
    $selfiePath,
    $now,
    $now,
]);

if (ds_table_exists('provider_verification')) {
    ds_ensure_provider_verification($user['id']);
    $pdo->prepare(
        'UPDATE provider_verification SET identity_status = \'pending\', updated_at = ? WHERE provider_user_id = ?'
    )->execute([$now, $user['id']]);
}

ds_success([
    'submitted' => true,
    'identityStatus' => 'pending',
    'nextStep' => 'verification_payment',
    // Paths intentionally omitted from response — never public.
]);
