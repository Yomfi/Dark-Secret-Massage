<?php
declare(strict_types=1);

/**
 * Customer's private saved location.
 *
 * Coordinates are returned only to the owner (or staff through the admin
 * endpoint). No public endpoint ever reads this table.
 */

require_once dirname(__DIR__) . '/config/bootstrap.php';
require_once dirname(__DIR__) . '/config/locations.php';

$user = ds_require_user();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
    ds_location_ensure_schema();
    $row = ds_customer_location((string) $user['id']);
    ds_success([
        'location' => ds_customer_location_dto($row, true),
        'country' => 'Ghana',
        'regions' => ds_ghana_regions(),
    ]);
}

ds_require_method('POST');
ds_require_same_origin();
ds_rate_limit('customer_location', 30, 15 * 60);
ds_location_ensure_schema();

$body = ds_json_body();
$action = strtolower(trim((string) ($body['action'] ?? 'save')));

if ($action === 'clear') {
    ds_pdo()->prepare('DELETE FROM customer_locations WHERE user_id = ?')->execute([(string) $user['id']]);
    ds_success(['cleared' => true, 'location' => null]);
}

if ($action !== 'save') {
    ds_error(400, 'VALIDATION_ERROR', 'Unknown location action.');
}

$location = ds_location_validate($body, true);
$saved = ds_save_customer_location((string) $user['id'], $location);

// Log the coarse change only: never write exact coordinates to the audit trail.
ds_audit('customer.location_updated', 'user', (string) $user['id'], [
    'region' => $location['region'],
    'city' => $location['city'],
    'area' => $location['area'],
    'coordinatesPresent' => $location['latitude'] !== null,
], (string) $user['id']);

ds_success([
    'saved' => true,
    'location' => ds_customer_location_dto($saved, true),
    'message' => $location['latitude'] !== null
        ? 'Location saved. Distances use this pin until you change it.'
        : 'Location saved. Add a pin later for exact distances.',
]);
