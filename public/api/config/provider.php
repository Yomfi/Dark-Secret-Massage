<?php
declare(strict_types=1);

/** Provider role values accepted by the API. */
function ds_is_provider_role(?string $role): bool
{
    $role = (string) $role;
    return in_array($role, ['provider', 'massage_provider'], true);
}

function ds_require_provider(): array
{
    $user = ds_require_user();
    if (!ds_is_provider_role($user['role'] ?? null)) {
        ds_error(403, 'FORBIDDEN', 'Provider account required.');
    }
    return $user;
}

function ds_require_admin(): array
{
    $user = ds_require_user();
    if (ds_staff_role_for_user($user) === null) {
        ds_error(403, 'FORBIDDEN', 'Admin access required.');
    }
    return $user;
}

/** Membership fee is configurable; disabled means providers join for free. */
function ds_membership_fee_enabled(): bool
{
    return filter_var(ds_config()['membership_fee_enabled'] ?? false, FILTER_VALIDATE_BOOLEAN);
}

function ds_membership_fee_amount(): float
{
    $amount = (float) (ds_config()['membership_fee_amount'] ?? 100.0);
    return max(0.0, $amount);
}

function ds_membership_currency(): string
{
    $currency = strtoupper(trim((string) (ds_config()['membership_currency'] ?? 'GHS')));
    return $currency !== '' ? $currency : 'GHS';
}

/**
 * Public membership status shared by the API responses. The verified badge always
 * depends on identity checks and admin approval — never on the fee.
 *
 * @return array<string, mixed>
 */
function ds_membership_status(): array
{
    $enabled = ds_membership_fee_enabled();
    $amount = $enabled ? ds_membership_fee_amount() : 0.0;
    $currency = ds_membership_currency();

    return [
        'feeEnabled' => $enabled,
        'feeRequired' => $enabled,
        'free' => !$enabled,
        'feeAmount' => $amount,
        'standardFeeAmount' => ds_membership_fee_amount(),
        'currency' => $currency,
        'message' => $enabled
            ? 'Membership fee of ' . $currency . ' ' . number_format($amount, 0) . ' is required before admin review.'
            : 'Membership is currently free.',
    ];
}

function ds_otp_demo_mode(): bool
{
    $cfg = ds_config();
    if (!empty($cfg['otp_demo_mode'])) {
        return true;
    }
    return !ds_is_prod();
}

function ds_ensure_provider_verification(string $userId): array
{
    $pdo = ds_pdo();
    $stmt = $pdo->prepare('SELECT * FROM provider_verification WHERE provider_user_id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    if ($row) {
        return $row;
    }

    $id = ds_new_id();
    $now = ds_now_sql();
    $pdo->prepare(
        'INSERT INTO provider_verification
         (id, provider_user_id, identity_status, payment_status, verification_status,
          verification_fee_amount, currency, created_at, updated_at)
         VALUES (?, ?, \'not_submitted\', \'unpaid\', \'unverified\', ?, ?, ?, ?)'
    )->execute([$id, $userId, ds_membership_fee_amount(), ds_membership_currency(), $now, $now]);

    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    return $row ?: [
        'id' => $id,
        'provider_user_id' => $userId,
        'identity_status' => 'not_submitted',
        'payment_status' => 'unpaid',
        'verification_status' => 'unverified',
        'verification_fee_amount' => ds_membership_fee_amount(),
        'currency' => ds_membership_currency(),
    ];
}

/**
 * Additive verification fields for optional identity verification. Called only
 * by the CLI migration (never by an ordinary request). Existing verified rows
 * are preserved and are treated as "Verify My Identity".
 */
function ds_provider_verification_schema(bool $force = false): void
{
    static $done = false;
    if ($done && !$force) {
        return;
    }
    $done = true;

    if (!ds_table_exists('provider_verification')) {
        return;
    }

    $pdo = ds_pdo();
    $columns = [
        'verification_choice' => 'VARCHAR(32) NULL',
        'business_status' => 'VARCHAR(32) NULL',
        'identity_submitted_at' => 'DATETIME NULL',
        'selfie_submitted_at' => 'DATETIME NULL',
    ];
    foreach ($columns as $column => $definition) {
        if (ds_column_exists('provider_verification', $column)) {
            continue;
        }
        try {
            $pdo->exec('ALTER TABLE provider_verification ADD COLUMN ' . $column . ' ' . $definition);
        } catch (Throwable $e) {
            // A concurrent migration may have added it first.
        }
    }
    if (ds_table_exists('provider_identity_documents') && !ds_column_exists('provider_identity_documents', 'verification_choice')) {
        try {
            $pdo->exec('ALTER TABLE provider_identity_documents ADD COLUMN verification_choice VARCHAR(32) NULL');
        } catch (Throwable $e) {
            // Harmless if another process added it.
        }
    }
    if (ds_table_exists('provider_identity_documents') && !ds_column_exists('provider_identity_documents', 'is_current')) {
        try {
            $pdo->exec('ALTER TABLE provider_identity_documents ADD COLUMN is_current INT NOT NULL DEFAULT 1');
        } catch (Throwable $e) {
            // Harmless if another process added it.
        }
    }
    ds_flush_table_columns('provider_verification');
    ds_flush_table_columns('provider_identity_documents');

    // Existing applications came through the ID + selfie path. Never alter
    // identity_status/verification_status here.
    try {
        $pdo->exec("UPDATE provider_verification SET verification_choice = 'verify_identity'
            WHERE verification_choice IS NULL AND (
                identity_status IN ('pending', 'approved')
                OR verification_status IN ('pending_review', 'verified')
            )");
        if (ds_table_exists('provider_identity_documents')) {
            $pdo->exec("UPDATE provider_identity_documents SET verification_choice = 'verify_identity'
                WHERE verification_choice IS NULL");
        }
    } catch (Throwable $e) {
        // Backfill is best-effort; the badge itself still depends on approval.
    }
}

/** Latest selfie/ID submission for provider-owned verification UI. */
function ds_provider_identity_summary(string $userId): array
{
    if (!ds_table_exists('provider_identity_documents')) {
        return [
            'hasIdDocument' => false,
            'hasSelfie' => false,
            'latestDocumentId' => null,
            'documentStatus' => null,
            'documentChoice' => null,
            'submittedAt' => null,
        ];
    }
    try {
        $stmt = ds_pdo()->prepare(
            'SELECT id, id_image_path, selfie_image_path, status, verification_choice, created_at
             FROM provider_identity_documents WHERE provider_user_id = ?
             ORDER BY is_current DESC, created_at DESC, id DESC LIMIT 1'
        );
        $stmt->execute([$userId]);
        $row = $stmt->fetch() ?: null;
    } catch (Throwable $e) {
        $row = null;
    }
    return [
        'hasIdDocument' => $row && trim((string) ($row['id_image_path'] ?? '')) !== '',
        'hasSelfie' => $row && trim((string) ($row['selfie_image_path'] ?? '')) !== '',
        'latestDocumentId' => $row['id'] ?? null,
        'documentStatus' => $row['status'] ?? null,
        'documentChoice' => $row['verification_choice'] ?? null,
        'submittedAt' => $row['created_at'] ?? null,
    ];
}

function ds_provider_verification_summary(array $verification, string $userId): array
{
    $docs = ds_provider_identity_summary($userId);
    return [
        'status' => (string) ($verification['verification_status'] ?? 'unverified'),
        'identityStatus' => (string) ($verification['identity_status'] ?? 'not_submitted'),
        'verificationChoice' => $verification['verification_choice'] ?? $docs['documentChoice'],
        'businessStatus' => $verification['business_status'] ?? null,
        'rejectionReason' => $verification['rejection_reason'] ?? null,
        'adminNotes' => $verification['admin_notes'] ?? null,
        'submittedAt' => $verification['submitted_for_review_at'] ?? null,
        'verifiedAt' => $verification['verified_at'] ?? null,
        'identitySubmittedAt' => $verification['identity_submitted_at'] ?? $docs['submittedAt'],
        'selfieSubmittedAt' => $verification['selfie_submitted_at'] ?? $docs['submittedAt'],
        'hasIdDocument' => $docs['hasIdDocument'],
        'hasSelfie' => $docs['hasSelfie'],
        'latestDocumentId' => $docs['latestDocumentId'],
        'documentStatus' => $docs['documentStatus'],
    ];
}

/**
 * Latest account-level moderation decision. Account rejection is deliberately
 * separate from identity verification and does not reuse its rejected state.
 * The existing moderation event table is the source of truth, so no account
 * status enum migration is required.
 */
function ds_provider_account_moderation(string $userId): ?array
{
    if (!ds_table_exists('provider_moderation_events')) {
        return null;
    }
    try {
        $stmt = ds_pdo()->prepare(
            "SELECT action, reason, notes, created_at FROM provider_moderation_events
             WHERE provider_user_id = ?
               AND action IN ('account_reject','reject_account','account_approve','account_reopen','reopen_account')
             ORDER BY created_at DESC, id DESC LIMIT 1"
        );
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        return $row ?: null;
    } catch (Throwable $e) {
        return null;
    }
}

function ds_provider_account_state(array $user): array
{
    $status = (string) ($user['account_status'] ?? 'active');
    $event = ds_provider_account_moderation((string) ($user['id'] ?? ''));
    if ($event && in_array((string) $event['action'], ['account_reject', 'reject_account'], true)) {
        return [
            'status' => 'rejected',
            'reason' => $event['reason'] !== null ? (string) $event['reason'] : null,
            'decidedAt' => $event['created_at'] ?? null,
        ];
    }
    return ['status' => $status, 'reason' => null, 'decidedAt' => null];
}

/** Admin-visible review history without exposing private document paths. */
function ds_provider_review_history(string $userId, int $limit = 20): array
{
    if (!ds_table_exists('admin_audit_log')) {
        return [];
    }
    try {
        $stmt = ds_pdo()->prepare(
            "SELECT action, meta_json, created_at, actor_user_id FROM admin_audit_log
             WHERE entity_type = 'provider' AND entity_id = ?
               AND (action LIKE 'provider.review_%' OR action = 'provider.identity_uploaded')
             ORDER BY created_at DESC LIMIT " . max(1, min(50, $limit))
        );
        $stmt->execute([$userId]);
        $rows = $stmt->fetchAll() ?: [];
    } catch (Throwable $e) {
        return [];
    }
    return array_map(static function (array $row): array {
        $meta = json_decode((string) ($row['meta_json'] ?? ''), true);
        return [
            'action' => (string) ($row['action'] ?? ''),
            'createdAt' => $row['created_at'] ?? null,
            'actorUserId' => $row['actor_user_id'] ?? null,
            'from' => is_array($meta) ? ($meta['from'] ?? null) : null,
            'to' => is_array($meta) ? ($meta['to'] ?? null) : null,
            'reason' => is_array($meta) ? ($meta['reason'] ?? null) : null,
            'notes' => is_array($meta) ? ($meta['notes'] ?? null) : null,
            'choice' => is_array($meta) ? ($meta['choice'] ?? null) : null,
        ];
    }, $rows);
}

function ds_provider_profile_by_user(string $userId): ?array
{
    if (!ds_table_exists('provider_profiles')) {
        return null;
    }
    $stmt = ds_pdo()->prepare('SELECT * FROM provider_profiles WHERE user_id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function ds_slugify(string $value): string
{
    $slug = strtolower(trim($value));
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?? $slug;
    $slug = trim($slug, '-');
    return $slug !== '' ? substr($slug, 0, 80) : 'provider';
}

function ds_unique_provider_slug(string $base): string
{
    $slug = ds_slugify($base);
    $pdo = ds_pdo();
    $candidate = $slug;
    $i = 1;
    while (true) {
        $stmt = $pdo->prepare('SELECT id FROM provider_profiles WHERE slug = ? LIMIT 1');
        $stmt->execute([$candidate]);
        if (!$stmt->fetch()) {
            return $candidate;
        }
        $i++;
        $candidate = $slug . '-' . $i;
    }
}

function ds_json_decode_field($value, $fallback = [])
{
    if ($value === null || $value === '') {
        return $fallback;
    }
    if (is_array($value)) {
        return $value;
    }
    $decoded = json_decode((string) $value, true);
    return is_array($decoded) ? $decoded : $fallback;
}

/**
 * Profile completeness 0–100 based on provider type requirements.
 */
function ds_provider_completion_percent(array $profile): int
{
    $type = (string) ($profile['provider_type'] ?? 'individual');
    $checks = [];

    if ($type === 'agency') {
        $checks[] = trim((string) ($profile['business_name'] ?? $profile['display_name'] ?? '')) !== '';
        $checks[] = trim((string) ($profile['contact_first_name'] ?? '')) !== ''
            || trim((string) ($profile['display_name'] ?? '')) !== '';
        $checks[] = trim((string) ($profile['city'] ?? '')) !== '';
        $checks[] = trim((string) ($profile['primary_image'] ?? $profile['cover_image'] ?? '')) !== '';
        $checks[] = trim((string) ($profile['about'] ?? '')) !== '';
        $services = ds_json_decode_field($profile['services_json'] ?? null);
        $checks[] = is_array($services) && count($services) > 0;
        $checks[] = isset($profile['starting_price']) && $profile['starting_price'] !== null && $profile['starting_price'] !== '';
    } else {
        $checks[] = ($profile['provider_type'] ?? 'individual') === 'individual';
        $checks[] = in_array(($profile['gender'] ?? ''), ['female', 'male'], true);
        $checks[] = trim((string) ($profile['display_name'] ?? '')) !== '';
        $checks[] = true; // phone lives on user; counted as present once registered
        $checks[] = trim((string) ($profile['city'] ?? '')) !== '';
        $checks[] = trim((string) ($profile['primary_image'] ?? '')) !== '';
        $checks[] = trim((string) ($profile['about'] ?? '')) !== '';
        $services = ds_json_decode_field($profile['services_json'] ?? null);
        $checks[] = is_array($services) && count($services) > 0;
        $rates = ds_json_decode_field($profile['rates_json'] ?? null);
        $checks[] = (isset($profile['starting_price']) && $profile['starting_price'] !== null && $profile['starting_price'] !== '')
            || (is_array($rates) && count($rates) > 0);
    }

    $done = 0;
    foreach ($checks as $ok) {
        if ($ok) {
            $done++;
        }
    }
    $total = count($checks);
    return $total > 0 ? (int) round(($done / $total) * 100) : 0;
}

function ds_provider_profile_complete_enough(array $profile): bool
{
    return ds_provider_completion_percent($profile) >= 85;
}

function ds_agency_team_members(string $agencyProfileId, bool $activeOnly = true): array
{
    if (!ds_table_exists('agency_team_members')) {
        return [];
    }
    $sql = 'SELECT * FROM agency_team_members WHERE agency_profile_id = ?';
    if ($activeOnly) {
        $sql .= " AND status = 'active'";
    }
    $sql .= ' ORDER BY sort_order ASC, created_at ASC';
    $stmt = ds_pdo()->prepare($sql);
    $stmt->execute([$agencyProfileId]);
    $rows = $stmt->fetchAll() ?: [];
    $out = [];
    foreach ($rows as $row) {
        $out[] = [
            'id' => $row['id'],
            'displayName' => $row['display_name'],
            'gender' => $row['gender'],
            'bio' => $row['bio'],
            'profileImage' => $row['profile_image'],
            'gallery' => ds_json_decode_field($row['gallery_json'] ?? null),
            'services' => ds_json_decode_field($row['services_json'] ?? null),
            'yearsExperience' => isset($row['years_experience']) ? (int) $row['years_experience'] : null,
            'availability' => $row['availability'],
            'pricing' => ds_json_decode_field($row['pricing_json'] ?? null),
            'inheritAgencyRate' => !empty($row['inherit_agency_rate']),
            'status' => $row['status'] ?? 'active',
        ];
    }
    return $out;
}

function ds_provider_public_dto(?array $profile, ?array $verification, array $user): array
{
    $status = (string) ($verification['verification_status'] ?? 'unverified');
    $verified = $status === 'verified';

    $waNumber = trim((string) ($profile['whatsapp_number'] ?? ''));
    if ($waNumber === '') {
        $waNumber = (string) ($user['phone'] ?? '');
    }

    $publicPhone = !empty($profile['public_phone']) && !empty($user['phone']);
    $publicWa = !empty($profile['public_whatsapp']) && $waNumber !== '';
    $publicEmail = !empty($profile['public_email']);

    $providerType = (string) ($profile['provider_type'] ?? 'individual');
    $displayName = $providerType === 'agency' && !empty($profile['business_name'])
        ? (string) $profile['business_name']
        : ($profile['display_name'] ?? trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? '')));

    $dto = [
        'id' => $profile['id'] ?? null,
        'slug' => $profile['slug'] ?? null,
        'providerType' => $providerType,
        'gender' => $profile['gender'] ?? null,
        'businessName' => $profile['business_name'] ?? null,
        'displayName' => $displayName,
        'city' => $profile['city'] ?? null,
        'region' => $profile['region'] ?? null,
        'country' => $profile['country'] ?? 'Ghana',
        'areaNeighbourhood' => $profile['area_neighbourhood'] ?? null,
        'serviceArea' => $profile['service_area'] ?? null,
        'about' => $profile['about'] ?? null,
        'services' => ds_json_decode_field($profile['services_json'] ?? null),
        'rates' => ds_json_decode_field($profile['rates_json'] ?? null),
        'startingPrice' => isset($profile['starting_price']) ? (float) $profile['starting_price'] : null,
        'currency' => $profile['currency'] ?? 'GHS',
        'availability' => $profile['availability'] ?? null,
        'workingDays' => $profile['working_days'] ?? null,
        'workingHours' => $profile['working_hours'] ?? null,
        'yearsExperience' => isset($profile['years_experience']) ? (int) $profile['years_experience'] : null,
        'serviceSetting' => ds_json_decode_field($profile['service_setting_json'] ?? null),
        'languages' => ds_json_decode_field($profile['languages_json'] ?? null),
        'primaryImage' => $profile['primary_image'] ?? null,
        'coverImage' => $profile['cover_image'] ?? null,
        'gallery' => ds_json_decode_field($profile['gallery_json'] ?? null),
        'age' => isset($profile['age']) ? (int) $profile['age'] : null,
        'profileCompletion' => isset($profile['profile_completion'])
            ? (int) $profile['profile_completion']
            : ds_provider_completion_percent($profile ?? []),
        'publicContactEnabled' => $publicPhone || $publicWa || $publicEmail,
        'phone' => $publicPhone ? ($user['phone'] ?? null) : null,
        'whatsapp' => $publicWa ? $waNumber : null,
        'contactEmail' => $publicEmail ? ($user['email'] ?? null) : null,
        'verified' => $verified,
        'verificationStatus' => $status,
        'teamMembers' => [],
    ];

    if ($providerType === 'agency' && !empty($profile['id'])) {
        $dto['teamMembers'] = ds_agency_team_members((string) $profile['id'], true);
    }

    return $dto;
}

function ds_provider_dashboard_dto(array $user, ?array $profile, array $verification): array
{
    // Email is the verification gate. A phone number is contact information only.
    $emailOk = !empty($user['email_verified_at']) || !empty($verification['email_verified_at']);
    $phoneProvided = trim((string) ($user['phone'] ?? '')) !== '';
    $profileOk = !empty($profile['profile_completed_at']);
    $identityOk = in_array($verification['identity_status'] ?? '', ['pending', 'approved'], true);
    $feeEnabled = ds_membership_fee_enabled();
    $paymentOk = ($verification['payment_status'] ?? '') === 'paid';
    $feeOk = !$feeEnabled || $paymentOk;
    $status = (string) ($verification['verification_status'] ?? 'unverified');
    $verificationInfo = ds_provider_verification_summary($verification, (string) $user['id']);

    $completion = $profile ? ds_provider_completion_percent($profile) : 0;

    $accountState = ds_provider_account_state($user);

    return [
        'user' => ds_user_dto($user),
        'accountStatus' => $accountState['status'],
        'accountRejectionReason' => $accountState['reason'],
        'accountDecidedAt' => $accountState['decidedAt'],
        'profile' => $profile ? [
            'id' => $profile['id'],
            'slug' => $profile['slug'],
            'displayName' => $profile['display_name'],
            'providerType' => $profile['provider_type'] ?? 'individual',
            'gender' => $profile['gender'] ?? null,
            'businessName' => $profile['business_name'] ?? null,
            'completed' => $profileOk,
            'profileCompletion' => $completion,
        ] : null,
        'verification' => [
            'status' => $status,
            'identityStatus' => $verification['identity_status'] ?? 'not_submitted',
            'paymentStatus' => $verification['payment_status'] ?? 'unpaid',
            'feeAmount' => (float) ($verification['verification_fee_amount'] ?? ds_membership_fee_amount()),
            'currency' => $verification['currency'] ?? ds_membership_currency(),
            'membershipFeeEnabled' => $feeEnabled,
            'membershipFree' => !$feeEnabled,
            'verifiedAt' => $verification['verified_at'] ?? null,
            'rejectionReason' => $verification['rejection_reason'] ?? null,
            'submittedForReviewAt' => $verification['submitted_for_review_at'] ?? null,
            'verificationChoice' => $verificationInfo['verificationChoice'],
            'businessStatus' => $verificationInfo['businessStatus'],
            'hasIdDocument' => $verificationInfo['hasIdDocument'],
            'hasSelfie' => $verificationInfo['hasSelfie'],
            'identitySubmittedAt' => $verificationInfo['identitySubmittedAt'],
            'selfieSubmittedAt' => $verificationInfo['selfieSubmittedAt'],
        ],
        'membership' => ds_membership_status(),
        'progress' => [
            'accountCreated' => true,
            'phoneProvided' => $phoneProvided,
            'phoneVerified' => !empty($user['phone_verified_at']) || !empty($verification['phone_verified_at']),
            'emailVerified' => $emailOk,
            'profileCompleted' => $profileOk,
            'identitySubmitted' => $identityOk,
            'membershipFeeRequired' => $feeEnabled,
            'membershipFeePaid' => $paymentOk,
            'verificationFeePaid' => $feeOk,
            'adminReview' => $status,
        ],
        'isVerified' => $status === 'verified',
    ];
}

function ds_private_storage_dir(string $subdir): string
{
    $base = dirname(__DIR__) . '/storage/private/' . trim($subdir, '/');
    if (!is_dir($base)) {
        @mkdir($base, 0700, true);
    }
    return $base;
}

function ds_save_uploaded_image(array $file, string $subdir, int $maxBytes = 5242880): string
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        ds_error(400, 'UPLOAD_ERROR', 'File upload failed.');
    }
    if (($file['size'] ?? 0) <= 0 || ($file['size'] ?? 0) > $maxBytes) {
        ds_error(400, 'UPLOAD_ERROR', 'Image must be under 5MB.');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($file['tmp_name']) ?: '';
    $allowed = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];
    if (!isset($allowed[$mime])) {
        ds_error(400, 'UPLOAD_ERROR', 'Only JPEG, PNG or WebP images are allowed.');
    }
    $tmp = (string) ($file['tmp_name'] ?? '');
    if ($tmp === '' || !is_uploaded_file($tmp)) {
        ds_error(400, 'UPLOAD_ERROR', 'Invalid upload.');
    }
    $info = @getimagesize($tmp);
    if ($info === false || empty($info[0]) || empty($info[1])) {
        ds_error(400, 'UPLOAD_ERROR', 'File is not a valid image.');
    }
    if ((int) $info[0] < 80 || (int) $info[1] < 80) {
        ds_error(400, 'UPLOAD_ERROR', 'Image is too small (minimum 80x80).');
    }
    if ((int) $info[0] > 8000 || (int) $info[1] > 8000) {
        ds_error(400, 'UPLOAD_ERROR', 'Image dimensions are too large.');
    }

    $src = ds_image_create_from_file($tmp, $mime);
    if (!$src) {
        ds_error(400, 'UPLOAD_ERROR', 'Unable to read image data.');
    }
    $oriented = ds_image_apply_exif_orientation($src, $tmp, $mime);
    $src = $oriented['im'];
    // Re-encode rather than move the original: strips EXIF/GPS metadata and normalises orientation.
    $safe = ds_image_resize_contain($src, $oriented['width'], $oriented['height'], 2400, 2400);
    $dir = ds_private_storage_dir($subdir);
    $name = ds_new_id() . '.' . $allowed[$mime];
    $dest = $dir . '/' . $name;
    $written = ds_image_write($safe['im'], $dest, $mime);
    if (!$written) {
        ds_error(500, 'UPLOAD_ERROR', 'Unable to store uploaded file.');
    }
    @chmod($dest, 0640);
    // Relative private path - never expose via public profile APIs.
    return 'private/' . trim($subdir, '/') . '/' . $name;
}
