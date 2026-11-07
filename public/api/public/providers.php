<?php
declare(strict_types=1);

/**
 * Public provider listings and location-aware directory search.
 *
 * Only providers that are admin-approved (verification_status = verified) AND
 * published by an admin are returned. There is no demo fallback: an empty
 * directory returns an empty list so the UI can show a real empty state.
 */

require_once dirname(__DIR__) . '/config/bootstrap.php';
require_once dirname(__DIR__) . '/config/discovery.php';

ds_require_method('GET');

if (!ds_cms_ready()) {
    ds_error(503, 'SCHEMA_NOT_MIGRATED', 'This area needs the database migration. Run: php scripts/migrate.php --apply');
}

if (!ds_table_exists('provider_profiles') || !ds_table_exists('provider_verification')) {
    ds_success(['providers' => [], 'count' => 0]);
}

$slug = trim((string) ($_GET['slug'] ?? ''));
$region = trim((string) ($_GET['region'] ?? ''));
$city = trim((string) ($_GET['city'] ?? ''));
$q = trim((string) ($_GET['q'] ?? ''));

$target = null;
if ($region !== '' || $city !== '') {
    $target = [
        'region' => $region,
        'district' => '',
        'city' => $city,
        'area' => '',
        'latitude' => null,
        'longitude' => null,
    ];
}

$providers = ds_discovery_search([
    'slug' => $slug,
    'region' => $region,
    'city' => $city,
    'q' => $q,
    'providerType' => $_GET['type'] ?? '',
    'gender' => $_GET['gender'] ?? '',
    'availability' => $_GET['availability'] ?? '',
    'service' => $_GET['service'] ?? '',
    'mode' => $_GET['mode'] ?? '',
    'sort' => $_GET['sort'] ?? 'recommended',
], $target);

if ($slug !== '') {
    $providers = array_values(array_filter($providers, static fn (array $p): bool => $p['slug'] === $slug));
}

ds_success([
    'providers' => $providers,
    'count' => count($providers),
    'distanceNote' => 'Distances appear only when both locations have reliable coordinates.',
]);
