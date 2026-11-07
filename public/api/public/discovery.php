<?php
declare(strict_types=1);

/**
 * Location-aware public provider search (POST so coordinates never land in an
 * access-log query string). Signed-in customers can ask the server to use their
 * saved location instead of sending coordinates from the browser.
 */

require_once dirname(__DIR__) . '/config/bootstrap.php';
require_once dirname(__DIR__) . '/config/discovery.php';

ds_require_method('POST');
ds_require_same_origin();
ds_rate_limit('public_discovery', 90, 15 * 60);

if (!ds_cms_ready()) {
    ds_error(503, 'SCHEMA_NOT_MIGRATED', 'This area needs the database migration. Run: php scripts/migrate.php --apply');
}

$body = ds_json_body();

$user = null;
$userId = ds_current_user_id();
if ($userId !== null) {
    $candidate = ds_find_user_by_id($userId);
    if ($candidate && (string) ($candidate['account_status'] ?? '') === 'active') {
        $user = $candidate;
    }
}

$useSaved = !empty($body['useSavedLocation']);
$target = null;
$source = 'none';
if ($useSaved && $user) {
    ds_location_ensure_schema(false, true);
    $target = ds_discovery_target_from_customer_row(ds_customer_location((string) $user['id']));
    $source = $target !== null ? 'saved' : 'none';
} else {
    $target = ds_location_search_target($body);
    $source = $target !== null ? 'manual' : 'none';
}

$params = [
    'region' => $body['region'] ?? ($target['region'] ?? ''),
    'city' => $body['city'] ?? ($target['city'] ?? ''),
    'q' => $body['q'] ?? '',
    'providerType' => $body['providerType'] ?? '',
    'gender' => $body['gender'] ?? '',
    'availability' => $body['availability'] ?? '',
    'service' => $body['service'] ?? '',
    'mode' => $body['mode'] ?? '',
    'sort' => $body['sort'] ?? 'recommended',
    'radiusKm' => $body['radiusKm'] ?? null,
    'limit' => $body['limit'] ?? 500,
];

$providers = ds_discovery_search($params, $target);

$radius = null;
if (isset($params['radiusKm']) && $params['radiusKm'] !== '' && $params['radiusKm'] !== null) {
    $candidate = (float) $params['radiusKm'];
    if ($candidate > 0) {
        $radius = min(500, round($candidate, 1));
    }
}

ds_success([
    'providers' => $providers,
    'count' => count($providers),
    'target' => [
        'source' => $source,
        'region' => $target['region'] ?? null,
        'district' => $target['district'] ?? null,
        'city' => $target['city'] ?? null,
        'area' => $target['area'] ?? null,
        'hasCoordinates' => !empty($target['latitude']) && !empty($target['longitude']),
        'radiusKm' => $radius,
    ],
    'distanceNote' => 'Distances are approximate straight-line (Haversine) measurements, not travel distance.',
]);
