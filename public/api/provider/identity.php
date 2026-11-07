<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

ds_require_method('POST');
ds_require_same_origin();
ds_rate_limit('provider_identity', 10, 15 * 60);

$user = ds_require_provider();

if (!ds_table_exists('provider_identity_documents')) {
    ds_error(503, 'NOT_CONFIGURED', 'Identity verification table is not installed. Run the SQL migration.');
}

$choice = strtolower(trim((string) ($_POST['choice'] ?? 'verify_identity')));
if (!in_array($choice, ['verify_identity', 'verify_later'], true)) {
    ds_error(400, 'VALIDATION_ERROR', 'Choose Verify My Identity or Verify Later.');
}

$verification = ds_ensure_provider_verification($user['id']);
$profile = ds_provider_profile_by_user($user['id']);
$isAgency = (string) ($profile['provider_type'] ?? 'individual') === 'agency';
$currentStatus = (string) ($verification['verification_status'] ?? 'unverified');
if (in_array($currentStatus, ['pending_review', 'verified'], true)) {
    ds_error(409, 'ALREADY_SUBMITTED', 'Your identity application is already with the review team.');
}

if (empty($_FILES['selfieImage'])) {
    ds_error(400, 'VALIDATION_ERROR', 'A selfie / live photo is required.');
}

$idType = trim((string) ($_POST['idType'] ?? ''));
$idNumber = trim((string) ($_POST['idNumber'] ?? ''));
$idImage = $_FILES['idImage'] ?? null;
if ($choice === 'verify_identity') {
    if ($idType === '') {
        ds_error(400, 'VALIDATION_ERROR', 'Select an ID type.');
    }
    if (empty($idImage)) {
        ds_error(400, 'VALIDATION_ERROR', 'Government ID image and selfie are required for Verify My Identity.');
    }
}

$selfiePath = ds_save_uploaded_image($_FILES['selfieImage'], 'identity/' . $user['id']);
$idPath = '';
$encryptedId = null;
if ($choice === 'verify_identity') {
    $idPath = ds_save_uploaded_image($idImage, 'identity/' . $user['id']);
    $encryptedId = $idNumber !== ''
        ? base64_encode(hash_hmac('sha256', $idNumber, $user['id'] . '|ds-id', true))
        : null;
} else {
    // Selfie-only storage: the ID columns remain empty until the provider
    // upgrades to Verify My Identity later.
    $idType = 'selfie_only';
}

$now = ds_now_sql();
$pdo = ds_pdo();

// Only the newest submission is eligible for review. This avoids timestamp
// ties choosing an older selfie-only document after a later ID upload.
try {
    $pdo->prepare('UPDATE provider_identity_documents SET is_current = 0 WHERE provider_user_id = ?')->execute([$user['id']]);
} catch (Throwable $e) {
    // The migration adds is_current; continue for an older schema.
}

$stmt = $pdo->prepare(
    'INSERT INTO provider_identity_documents
     (id, provider_user_id, id_type, id_number_encrypted, id_image_path, selfie_image_path, status, verification_choice, is_current, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, \'pending\', ?, 1, ?, ?)'
);
try {
    $stmt->execute([
        ds_new_id(), $user['id'], $idType, $encryptedId, $idPath, $selfiePath, $choice, $now, $now,
    ]);
} catch (Throwable $e) {
    // Older schema without verification_choice still accepts the upload.
    $pdo->prepare(
        'INSERT INTO provider_identity_documents
         (id, provider_user_id, id_type, id_number_encrypted, id_image_path, selfie_image_path, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, \'pending\', ?, ?)'
    )->execute([ds_new_id(), $user['id'], $idType, $encryptedId, $idPath, $selfiePath, $now, $now]);
}

$updates = 'verification_choice = ?, selfie_submitted_at = ?, updated_at = ?';
$params = [$choice, $now, $now];
if ($choice === 'verify_identity') {
    $updates = 'identity_status = \'pending\', verification_choice = ?, identity_submitted_at = ?, selfie_submitted_at = ?, updated_at = ?';
    $params = [$choice, $now, $now, $now];
} else {
    $updates = 'identity_status = \'not_submitted\', verification_choice = ?, selfie_submitted_at = ?, updated_at = ?';
    $params = [$choice, $now, $now];
}
if ($choice === 'verify_identity' && $isAgency && ($verification['business_status'] ?? null) === null) {
    $updates .= ', business_status = \'pending\'';
}
$params[] = $user['id'];
$pdo->prepare('UPDATE provider_verification SET ' . $updates . ' WHERE provider_user_id = ?')->execute($params);

ds_audit('provider.identity_uploaded', 'provider', $user['id'], [
    'choice' => $choice,
    'hasId' => $choice === 'verify_identity',
    'hasSelfie' => true,
], $user['id']);

ds_success([
    'submitted' => true,
    'verificationChoice' => $choice,
    'identityStatus' => $choice === 'verify_identity' ? 'pending' : 'not_submitted',
    'verificationStatus' => $choice === 'verify_identity' ? 'unverified' : 'unverified',
    // Verify Later ends onboarding without entering the admin review queue.
    'nextStep' => $choice === 'verify_identity'
        ? (ds_membership_fee_enabled() ? 'verification_payment' : 'admin_review')
        : 'dashboard',
    // Paths intentionally omitted from response — never public.
]);
