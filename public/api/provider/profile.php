<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

$user = ds_require_provider();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

function ds_profile_row_to_api(?array $profile): ?array
{
    if (!$profile) {
        return null;
    }
    return [
        'id' => $profile['id'],
        'slug' => $profile['slug'],
        'providerType' => $profile['provider_type'] ?? 'individual',
        'gender' => $profile['gender'] ?? null,
        'businessName' => $profile['business_name'] ?? null,
        'businessRegistrationNumber' => $profile['business_registration_number'] ?? null,
        'contactFirstName' => $profile['contact_first_name'] ?? null,
        'contactLastName' => $profile['contact_last_name'] ?? null,
        'displayName' => $profile['display_name'],
        'dateOfBirth' => $profile['date_of_birth'] ?? null,
        'age' => isset($profile['age']) ? (int) $profile['age'] : null,
        'whatsappNumber' => $profile['whatsapp_number'] ?? null,
        'city' => $profile['city'],
        'areaNeighbourhood' => $profile['area_neighbourhood'] ?? null,
        'businessAddress' => $profile['business_address'] ?? null,
        'serviceArea' => $profile['service_area'] ?? null,
        'serviceRadiusKm' => isset($profile['service_radius_km']) ? (float) $profile['service_radius_km'] : null,
        'region' => $profile['region'],
        'country' => $profile['country'],
        'about' => $profile['about'],
        'services' => ds_json_decode_field($profile['services_json'] ?? null),
        'rates' => ds_json_decode_field($profile['rates_json'] ?? null),
        'startingPrice' => $profile['starting_price'] !== null ? (float) $profile['starting_price'] : null,
        'currency' => $profile['currency'],
        'availability' => $profile['availability'],
        'workingDays' => $profile['working_days'] ?? null,
        'workingHours' => $profile['working_hours'] ?? null,
        'yearsExperience' => isset($profile['years_experience']) ? (int) $profile['years_experience'] : null,
        'serviceSetting' => ds_json_decode_field($profile['service_setting_json'] ?? null),
        'languages' => ds_json_decode_field($profile['languages_json'] ?? null),
        'primaryImage' => $profile['primary_image'],
        'coverImage' => $profile['cover_image'] ?? null,
        'gallery' => ds_json_decode_field($profile['gallery_json'] ?? null),
        'publicPhone' => (bool) $profile['public_phone'],
        'publicWhatsapp' => (bool) $profile['public_whatsapp'],
        'publicEmail' => (bool) $profile['public_email'],
        'profileCompletion' => isset($profile['profile_completion'])
            ? (int) $profile['profile_completion']
            : ds_provider_completion_percent($profile),
        'completed' => !empty($profile['profile_completed_at']),
        'teamMembers' => (($profile['provider_type'] ?? '') === 'agency')
            ? ds_agency_team_members((string) $profile['id'], false)
            : [],
    ];
}

if ($method === 'GET') {
    ds_require_method('GET');
    $profile = ds_provider_profile_by_user($user['id']);
    $verification = ds_table_exists('provider_verification')
        ? ds_ensure_provider_verification($user['id'])
        : null;
    ds_success([
        'profile' => ds_profile_row_to_api($profile),
        'verificationStatus' => $verification['verification_status'] ?? 'unverified',
    ]);
}

ds_require_method('POST');
ds_rate_limit('provider_profile', 30, 15 * 60);

if (!ds_table_exists('provider_profiles')) {
    ds_error(503, 'NOT_CONFIGURED', 'Provider profiles table is not installed. Run the SQL migration.');
}

$body = ds_json_body();
$providerType = strtolower(trim((string) ($body['providerType'] ?? 'individual')));
if (!in_array($providerType, ['individual', 'agency'], true)) {
    ds_error(400, 'VALIDATION_ERROR', 'Provider type must be individual or agency.');
}

$gender = strtolower(trim((string) ($body['gender'] ?? '')));
if ($providerType === 'individual') {
    if (!in_array($gender, ['female', 'male'], true)) {
        ds_error(400, 'VALIDATION_ERROR', 'Select gender: female or male.');
    }
} else {
    $gender = '';
}

$displayName = trim((string) ($body['displayName'] ?? ''));
$businessName = trim((string) ($body['businessName'] ?? ''));
$businessReg = trim((string) ($body['businessRegistrationNumber'] ?? ''));
$contactFirst = trim((string) ($body['contactFirstName'] ?? ''));
$contactLast = trim((string) ($body['contactLastName'] ?? ''));

if ($providerType === 'agency') {
    if ($businessName === '') {
        ds_error(400, 'VALIDATION_ERROR', 'Agency / business name is required.');
    }
    if ($displayName === '') {
        $displayName = $businessName;
    }
} elseif ($displayName === '') {
    ds_error(400, 'VALIDATION_ERROR', 'Display name is required.');
}

$city = trim((string) ($body['city'] ?? ''));
$region = trim((string) ($body['region'] ?? ''));
$country = trim((string) ($body['country'] ?? 'Ghana'));
$area = trim((string) ($body['areaNeighbourhood'] ?? ''));
$businessAddress = trim((string) ($body['businessAddress'] ?? ''));
$serviceArea = trim((string) ($body['serviceArea'] ?? ''));
$serviceRadius = $body['serviceRadiusKm'] ?? null;
$about = trim((string) ($body['about'] ?? ''));
$services = $body['services'] ?? [];
$rates = $body['rates'] ?? [];
$startingPrice = $body['startingPrice'] ?? null;
$availability = trim((string) ($body['availability'] ?? 'flexible'));
$workingDays = trim((string) ($body['workingDays'] ?? ''));
$workingHours = trim((string) ($body['workingHours'] ?? ''));
$yearsExperience = $body['yearsExperience'] ?? null;
$serviceSetting = $body['serviceSetting'] ?? [];
$languages = $body['languages'] ?? [];
$primaryImage = trim((string) ($body['primaryImage'] ?? ''));
$coverImage = trim((string) ($body['coverImage'] ?? ''));
$gallery = $body['gallery'] ?? [];
$whatsappNumber = trim((string) ($body['whatsappNumber'] ?? ''));
$dateOfBirth = trim((string) ($body['dateOfBirth'] ?? ''));
$age = $body['age'] ?? null;
$publicPhone = !empty($body['publicPhone']);
$publicWhatsapp = !empty($body['publicWhatsapp']);
$publicEmail = !empty($body['publicEmail']);

if ($city === '' || $country === '') {
    ds_error(400, 'VALIDATION_ERROR', 'City and country are required.');
}
if (!is_array($services)) {
    $services = [];
}
if (!is_array($serviceSetting)) {
    $serviceSetting = [];
}
if (!is_array($languages)) {
    $languages = [];
}
if (!is_array($gallery)) {
    $gallery = [];
}
if (!is_array($rates)) {
    $rates = [];
}

$price = null;
if ($startingPrice !== null && $startingPrice !== '') {
    $price = (float) $startingPrice;
    if ($price < 0) {
        ds_error(400, 'VALIDATION_ERROR', 'Starting price must be zero or greater.');
    }
}

// Derive starting price from first rate entry when not provided.
if ($price === null && count($rates) > 0) {
    foreach ($rates as $rateRow) {
        if (is_array($rateRow) && isset($rateRow['price']) && $rateRow['price'] !== '' && $rateRow['price'] !== null) {
            $price = (float) $rateRow['price'];
            break;
        }
    }
}

$years = null;
if ($yearsExperience !== null && $yearsExperience !== '') {
    $years = max(0, (int) $yearsExperience);
}

$ageVal = null;
if ($age !== null && $age !== '') {
    $ageVal = max(18, min(99, (int) $age));
}

$radiusVal = null;
if ($serviceRadius !== null && $serviceRadius !== '') {
    $radiusVal = max(0, (float) $serviceRadius);
}

$dobVal = null;
if ($dateOfBirth !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateOfBirth)) {
    $dobVal = $dateOfBirth;
}

$now = ds_now_sql();
$pdo = ds_pdo();
$existing = ds_provider_profile_by_user($user['id']);

$servicesJson = json_encode(array_values($services));
$settingJson = json_encode(array_values($serviceSetting));
$languagesJson = json_encode(array_values($languages));
$galleryJson = json_encode(array_values($gallery));
$ratesJson = json_encode(array_values($rates));

$draft = array_merge($existing ?: [], [
    'provider_type' => $providerType,
    'gender' => $gender !== '' ? $gender : null,
    'business_name' => $businessName !== '' ? $businessName : null,
    'display_name' => $displayName,
    'city' => $city,
    'about' => $about !== '' ? $about : null,
    'services_json' => $servicesJson,
    'rates_json' => $ratesJson,
    'starting_price' => $price,
    'primary_image' => $primaryImage !== '' ? $primaryImage : null,
    'cover_image' => $coverImage !== '' ? $coverImage : null,
]);
$completion = ds_provider_completion_percent($draft);
$completedAt = ds_provider_profile_complete_enough($draft) ? $now : null;

$hasType = ds_column_exists('provider_profiles', 'provider_type');
$hasRates = ds_column_exists('provider_profiles', 'rates_json');
$hasCompletion = ds_column_exists('provider_profiles', 'profile_completion');

if ($existing) {
    if ($hasType && $hasRates && $hasCompletion) {
        $pdo->prepare(
            'UPDATE provider_profiles SET
                provider_type = ?, gender = ?, business_name = ?, business_registration_number = ?,
                contact_first_name = ?, contact_last_name = ?,
                display_name = ?, date_of_birth = ?, age = ?, whatsapp_number = ?,
                city = ?, area_neighbourhood = ?, business_address = ?, service_area = ?,
                service_radius_km = ?, region = ?, country = ?, about = ?,
                services_json = ?, rates_json = ?, starting_price = ?, availability = ?,
                working_days = ?, working_hours = ?, years_experience = ?,
                service_setting_json = ?, languages_json = ?,
                primary_image = ?, cover_image = ?, gallery_json = ?,
                public_phone = ?, public_whatsapp = ?, public_email = ?,
                profile_completion = ?, profile_completed_at = ?, updated_at = ?
             WHERE user_id = ?'
        )->execute([
            $providerType,
            $gender !== '' ? $gender : null,
            $businessName !== '' ? $businessName : null,
            $businessReg !== '' ? $businessReg : null,
            $contactFirst !== '' ? $contactFirst : null,
            $contactLast !== '' ? $contactLast : null,
            $displayName,
            $dobVal,
            $ageVal,
            $whatsappNumber !== '' ? $whatsappNumber : null,
            $city,
            $area !== '' ? $area : null,
            $businessAddress !== '' ? $businessAddress : null,
            $serviceArea !== '' ? $serviceArea : null,
            $radiusVal,
            $region !== '' ? $region : null,
            $country,
            $about !== '' ? $about : null,
            $servicesJson,
            $ratesJson,
            $price,
            $availability,
            $workingDays !== '' ? $workingDays : null,
            $workingHours !== '' ? $workingHours : null,
            $years,
            $settingJson,
            $languagesJson,
            $primaryImage !== '' ? $primaryImage : null,
            $coverImage !== '' ? $coverImage : null,
            $galleryJson,
            $publicPhone ? 1 : 0,
            $publicWhatsapp ? 1 : 0,
            $publicEmail ? 1 : 0,
            $completion,
            $completedAt,
            $now,
            $user['id'],
        ]);
    } else {
        // Fallback for hosts that have not run the new migration yet.
        $pdo->prepare(
            'UPDATE provider_profiles SET
                display_name = ?, city = ?, region = ?, country = ?, about = ?,
                services_json = ?, starting_price = ?, availability = ?,
                service_setting_json = ?, languages_json = ?,
                primary_image = ?, gallery_json = ?,
                public_phone = ?, public_whatsapp = ?, public_email = ?,
                profile_completed_at = ?, updated_at = ?
             WHERE user_id = ?'
        )->execute([
            $displayName,
            $city,
            $region !== '' ? $region : null,
            $country,
            $about !== '' ? $about : null,
            $servicesJson,
            $price,
            $availability,
            $settingJson,
            $languagesJson,
            $primaryImage !== '' ? $primaryImage : null,
            $galleryJson,
            $publicPhone ? 1 : 0,
            $publicWhatsapp ? 1 : 0,
            $publicEmail ? 1 : 0,
            $completedAt,
            $now,
            $user['id'],
        ]);
    }
} else {
    $slug = ds_unique_provider_slug($displayName);
    if ($hasType && $hasRates && $hasCompletion) {
        $pdo->prepare(
            'INSERT INTO provider_profiles
             (id, user_id, slug, display_name, provider_type, gender, business_name,
              business_registration_number, contact_first_name, contact_last_name,
              date_of_birth, age, whatsapp_number, city, area_neighbourhood, business_address,
              service_area, service_radius_km, region, country, about,
              services_json, rates_json, starting_price, currency, availability,
              working_days, working_hours, years_experience, service_setting_json,
              languages_json, primary_image, cover_image, gallery_json,
              public_phone, public_whatsapp, public_email, profile_completion,
              profile_completed_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, \'GHS\', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            ds_new_id(),
            $user['id'],
            $slug,
            $displayName,
            $providerType,
            $gender !== '' ? $gender : null,
            $businessName !== '' ? $businessName : null,
            $businessReg !== '' ? $businessReg : null,
            $contactFirst !== '' ? $contactFirst : null,
            $contactLast !== '' ? $contactLast : null,
            $dobVal,
            $ageVal,
            $whatsappNumber !== '' ? $whatsappNumber : null,
            $city,
            $area !== '' ? $area : null,
            $businessAddress !== '' ? $businessAddress : null,
            $serviceArea !== '' ? $serviceArea : null,
            $radiusVal,
            $region !== '' ? $region : null,
            $country,
            $about !== '' ? $about : null,
            $servicesJson,
            $ratesJson,
            $price,
            $availability,
            $workingDays !== '' ? $workingDays : null,
            $workingHours !== '' ? $workingHours : null,
            $years,
            $settingJson,
            $languagesJson,
            $primaryImage !== '' ? $primaryImage : null,
            $coverImage !== '' ? $coverImage : null,
            $galleryJson,
            $publicPhone ? 1 : 0,
            $publicWhatsapp ? 1 : 0,
            $publicEmail ? 1 : 0,
            $completion,
            $completedAt,
            $now,
            $now,
        ]);
    } else {
        $pdo->prepare(
            'INSERT INTO provider_profiles
             (id, user_id, slug, display_name, city, region, country, about,
              services_json, starting_price, currency, availability, service_setting_json,
              languages_json, primary_image, gallery_json, public_phone, public_whatsapp,
              public_email, profile_completed_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, \'GHS\', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            ds_new_id(),
            $user['id'],
            $slug,
            $displayName,
            $city,
            $region !== '' ? $region : null,
            $country,
            $about !== '' ? $about : null,
            $servicesJson,
            $price,
            $availability,
            $settingJson,
            $languagesJson,
            $primaryImage !== '' ? $primaryImage : null,
            $galleryJson,
            $publicPhone ? 1 : 0,
            $publicWhatsapp ? 1 : 0,
            $publicEmail ? 1 : 0,
            $completedAt,
            $now,
            $now,
        ]);
    }
}

$saved = ds_provider_profile_by_user($user['id']);
ds_success([
    'saved' => true,
    'profileCompletion' => $saved ? ds_provider_completion_percent($saved) : $completion,
    'nextStep' => $providerType === 'agency' ? 'team_members' : 'identity_verification',
    'profile' => ds_profile_row_to_api($saved),
]);
