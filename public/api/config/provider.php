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
    $role = (string) ($user['role'] ?? '');
    if (!in_array($role, ['admin', 'moderator', 'support_admin'], true)) {
        ds_error(403, 'FORBIDDEN', 'Admin access required.');
    }
    return $user;
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
         VALUES (?, ?, \'not_submitted\', \'unpaid\', \'unverified\', 100.00, \'GHS\', ?, ?)'
    )->execute([$id, $userId, $now, $now]);

    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    return $row ?: [
        'id' => $id,
        'provider_user_id' => $userId,
        'identity_status' => 'not_submitted',
        'payment_status' => 'unpaid',
        'verification_status' => 'unverified',
        'verification_fee_amount' => 100.00,
        'currency' => 'GHS',
    ];
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
    $phoneOk = !empty($user['phone_verified_at']) || !empty($verification['phone_verified_at']);
    $emailOk = !empty($user['email_verified_at']) || !empty($verification['email_verified_at']);
    $profileOk = !empty($profile['profile_completed_at']);
    $identityOk = in_array($verification['identity_status'] ?? '', ['pending', 'approved'], true);
    $paymentOk = ($verification['payment_status'] ?? '') === 'paid';
    $status = (string) ($verification['verification_status'] ?? 'unverified');

    $completion = $profile ? ds_provider_completion_percent($profile) : 0;

    return [
        'user' => ds_user_dto($user),
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
            'feeAmount' => (float) ($verification['verification_fee_amount'] ?? 100),
            'currency' => $verification['currency'] ?? 'GHS',
            'verifiedAt' => $verification['verified_at'] ?? null,
            'rejectionReason' => $verification['rejection_reason'] ?? null,
            'submittedForReviewAt' => $verification['submitted_for_review_at'] ?? null,
        ],
        'progress' => [
            'accountCreated' => true,
            'phoneVerified' => $phoneOk,
            'emailVerified' => $emailOk,
            'profileCompleted' => $profileOk,
            'identitySubmitted' => $identityOk,
            'verificationFeePaid' => $paymentOk,
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

    $dir = ds_private_storage_dir($subdir);
    $name = ds_new_id() . '.' . $allowed[$mime];
    $dest = $dir . '/' . $name;
    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        ds_error(500, 'UPLOAD_ERROR', 'Unable to store uploaded file.');
    }
    // Relative private path — never expose via public profile APIs.
    return 'private/' . trim($subdir, '/') . '/' . $name;
}
