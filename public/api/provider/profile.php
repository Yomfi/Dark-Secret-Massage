<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

$user = ds_require_provider();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
    ds_require_method('GET');
    $profile = ds_provider_profile_by_user($user['id']);
    $verification = ds_table_exists('provider_verification')
        ? ds_ensure_provider_verification($user['id'])
        : null;
    ds_success([
        'profile' => $profile ? [
            'id' => $profile['id'],
            'slug' => $profile['slug'],
            'displayName' => $profile['display_name'],
            'city' => $profile['city'],
            'region' => $profile['region'],
            'country' => $profile['country'],
            'about' => $profile['about'],
            'services' => ds_json_decode_field($profile['services_json'] ?? null),
            'startingPrice' => $profile['starting_price'] !== null ? (float) $profile['starting_price'] : null,
            'currency' => $profile['currency'],
            'availability' => $profile['availability'],
            'serviceSetting' => ds_json_decode_field($profile['service_setting_json'] ?? null),
            'languages' => ds_json_decode_field($profile['languages_json'] ?? null),
            'primaryImage' => $profile['primary_image'],
            'gallery' => ds_json_decode_field($profile['gallery_json'] ?? null),
            'publicPhone' => (bool) $profile['public_phone'],
            'publicWhatsapp' => (bool) $profile['public_whatsapp'],
            'publicEmail' => (bool) $profile['public_email'],
            'completed' => !empty($profile['profile_completed_at']),
        ] : null,
        'verificationStatus' => $verification['verification_status'] ?? 'unverified',
    ]);
}

ds_require_method('POST');
ds_rate_limit('provider_profile', 30, 15 * 60);

if (!ds_table_exists('provider_profiles')) {
    ds_error(503, 'NOT_CONFIGURED', 'Provider profiles table is not installed. Run the SQL migration.');
}

$body = ds_json_body();
$displayName = trim((string) ($body['displayName'] ?? ''));
$city = trim((string) ($body['city'] ?? ''));
$region = trim((string) ($body['region'] ?? ''));
$country = trim((string) ($body['country'] ?? 'Ghana'));
$about = trim((string) ($body['about'] ?? ''));
$services = $body['services'] ?? [];
$startingPrice = $body['startingPrice'] ?? null;
$availability = trim((string) ($body['availability'] ?? 'flexible'));
$serviceSetting = $body['serviceSetting'] ?? [];
$languages = $body['languages'] ?? [];
$primaryImage = trim((string) ($body['primaryImage'] ?? ''));
$gallery = $body['gallery'] ?? [];
$publicPhone = !empty($body['publicPhone']);
$publicWhatsapp = !empty($body['publicWhatsapp']);
$publicEmail = !empty($body['publicEmail']);

if ($displayName === '' || $city === '' || $country === '') {
    ds_error(400, 'VALIDATION_ERROR', 'Display name, city and country are required.');
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

$price = null;
if ($startingPrice !== null && $startingPrice !== '') {
    $price = (float) $startingPrice;
    if ($price < 0) {
        ds_error(400, 'VALIDATION_ERROR', 'Starting price must be zero or greater.');
    }
}

$now = ds_now_sql();
$pdo = ds_pdo();
$existing = ds_provider_profile_by_user($user['id']);

$servicesJson = json_encode(array_values($services));
$settingJson = json_encode(array_values($serviceSetting));
$languagesJson = json_encode(array_values($languages));
$galleryJson = json_encode(array_values($gallery));

if ($existing) {
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
        $now,
        $now,
        $user['id'],
    ]);
} else {
    $slug = ds_unique_provider_slug($displayName);
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
        $now,
        $now,
        $now,
    ]);
}

ds_success(['saved' => true, 'nextStep' => 'identity_verification']);
