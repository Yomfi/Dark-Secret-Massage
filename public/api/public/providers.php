<?php
declare(strict_types=1);

/**
 * Public provider listings.
 *
 * Only providers that are admin-approved (verification_status = verified) AND
 * published by an admin are returned. There is no demo fallback: an empty
 * directory returns an empty list so the UI can show a real empty state.
 */

require_once dirname(__DIR__) . '/config/bootstrap.php';

ds_require_method('GET');

if (!ds_cms_ready()) {
    ds_cms_migrate();
}

if (!ds_table_exists('provider_profiles') || !ds_table_exists('provider_verification')) {
    ds_success(['providers' => [], 'count' => 0]);
}

$slug = trim((string) ($_GET['slug'] ?? ''));

$sql = "SELECT p.*, u.email_verified_at, u.account_status, v.verification_status, v.verified_at
        FROM provider_profiles p
        INNER JOIN users u ON u.id = p.user_id
        INNER JOIN provider_verification v ON v.provider_user_id = p.user_id
        WHERE v.verification_status = 'verified'
          AND u.account_status = 'active'
          AND u.email_verified_at IS NOT NULL";
$params = [];
if ($slug !== '') {
    $sql .= ' AND p.slug = ?';
    $params[] = $slug;
} else {
    $sql .= ' AND p.is_published = 1';
}
$sql .= ' ORDER BY COALESCE(p.published_at, p.created_at) DESC LIMIT 200';

$stmt = ds_pdo()->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll() ?: [];

$servicesByProfile = [];
$teamByProfile = [];
if ($rows !== [] && ds_table_exists('services')) {
    $ids = array_values(array_map(static fn (array $r): string => (string) $r['id'], $rows));
    $in = implode(',', array_fill(0, count($ids), '?'));
    $svc = ds_pdo()->prepare(
        "SELECT * FROM services WHERE provider_profile_id IN ($in) AND is_active = 1 ORDER BY sort_order ASC, name ASC"
    );
    $svc->execute($ids);
    foreach ($svc->fetchAll() ?: [] as $service) {
        $servicesByProfile[(string) $service['provider_profile_id']][] = ds_service_row_to_public($service);
    }
    foreach ($rows as $row) {
        if ((string) ($row['provider_type'] ?? 'individual') === 'agency') {
            $teamByProfile[(string) $row['id']] = ds_agency_team_members((string) $row['id'], true);
        }
    }
}

$providers = array_map(static function (array $row) use ($servicesByProfile, $teamByProfile): array {
    $profileId = (string) $row['id'];
    $offerings = $servicesByProfile[$profileId] ?? [];
    $settings = ds_json_decode_field($row['service_setting_json'] ?? null);
    $gallery = ds_json_decode_field($row['gallery_json'] ?? null);
    $languages = ds_json_decode_field($row['languages_json'] ?? null);
    $services = ds_json_decode_field($row['services_json'] ?? null);
    $rates = ds_json_decode_field($row['rates_json'] ?? null);

    $starting = $row['starting_price'] !== null ? (float) $row['starting_price'] : null;
    if ($starting === null && $offerings !== []) {
        $prices = array_map(static fn (array $s): float => (float) $s['price'], $offerings);
        $starting = min($prices);
    }

    $providerKind = (string) ($row['provider_type'] ?? 'individual') === 'agency' ? 'agency' : 'individual';
    $serviceNames = $offerings !== []
        ? array_values(array_map(static fn (array $s): string => (string) $s['name'], $offerings))
        : (is_array($services) ? array_values(array_map('strval', $services)) : []);

    return [
        'id' => $profileId,
        'slug' => (string) $row['slug'],
        'displayName' => (string) $row['display_name'],
        'providerKind' => $providerKind,
        'profileType' => 'massage_provider',
        'gender' => $row['gender'] !== null ? (string) $row['gender'] : null,
        'city' => (string) ($row['city'] ?? ''),
        'citySlug' => ds_slugify((string) ($row['city'] ?? '')),
        'region' => (string) ($row['region'] ?? ''),
        'country' => (string) ($row['country'] ?? 'Ghana'),
        'shortBio' => (string) ($row['about'] ?? ''),
        'about' => (string) ($row['about'] ?? ''),
        'services' => $serviceNames,
        'serviceOfferings' => array_map(static fn (array $s): array => [
            'id' => $s['id'],
            'name' => $s['name'],
            'durationMinutes' => $s['durationMinutes'],
            'priceFrom' => $s['price'],
        ], $offerings),
        'rates' => $rates,
        'startingPrice' => $starting,
        'currency' => (string) ($row['currency'] ?? 'GHS'),
        'availability' => (string) ($row['availability'] ?? 'flexible'),
        'availableDays' => $row['working_days'] !== null ? (string) $row['working_days'] : null,
        'workingHours' => $row['working_hours'] !== null ? (string) $row['working_hours'] : null,
        'serviceSetting' => is_array($settings) ? $settings : [],
        'serviceArea' => $row['service_area'] !== null ? (string) $row['service_area'] : null,
        'primaryImage' => $row['primary_image'] !== null ? (string) $row['primary_image'] : null,
        'gallery' => is_array($gallery) ? $gallery : [],
        'publicContactEnabled' => (bool) ($row['public_phone'] ?? false),
        'languages' => is_array($languages) ? $languages : [],
        'yearsExperience' => isset($row['years_experience']) ? (int) $row['years_experience'] : null,
        'teamMembers' => $teamByProfile[$profileId] ?? [],
        'verified' => true,
        'featured' => false,
        'isDemo' => false,
        'createdAt' => $row['created_at'] ?? null,
    ];
}, $rows);

ds_success([
    'providers' => $providers,
    'count' => count($providers),
]);
