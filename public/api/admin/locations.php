<?php
declare(strict_types=1);

/**
 * Admin location management and "Assign nearest provider" assistance.
 *
 * Recommendations reuse the same eligibility rules as assignments: active,
 * identity-verified, published and not removed. The administrator still has to
 * confirm the assignment through the existing Assignments workflow.
 */

require_once dirname(__DIR__) . '/config/bootstrap.php';
require_once dirname(__DIR__) . '/config/assignments.php';
require_once dirname(__DIR__) . '/config/discovery.php';

$admin = ds_require_user();
$canCustomers = ds_user_has_permission($admin, 'customers.read') || ds_user_has_permission($admin, 'providers.read');
if (!$canCustomers) {
    ds_error(403, 'FORBIDDEN', 'You do not have permission to view locations.');
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$pdo = ds_pdo();

if ($method === 'GET') {
    $customerId = trim((string) ($_GET['customerId'] ?? ''));
    if ($customerId !== '') {
        $stmt = $pdo->prepare("SELECT id, first_name, last_name, email, account_status FROM users WHERE id = ? AND role = 'user' LIMIT 1");
        $stmt->execute([$customerId]);
        $customer = $stmt->fetch();
        if (!$customer) {
            ds_error(404, 'NOT_FOUND', 'Customer not found.');
        }
        ds_location_ensure_schema(false, true);
        $row = ds_customer_location($customerId);
        $includeCoordinates = ds_user_has_permission($admin, 'customers.write');
        $target = ds_discovery_target_from_customer_row($row);

        $recommendations = [];
        $nearbyNote = null;
        if (!empty($_GET['nearby'])) {
            if ($target === null) {
                $nearbyNote = 'This customer has no saved location yet. Add a region and town before requesting nearby providers.';
            } else {
                $radiusRaw = trim((string) ($_GET['radiusKm'] ?? ''));
                $radius = $radiusRaw !== '' ? min(500, max(1, (float) $radiusRaw)) : null;
                $recommendations = ds_admin_nearby_providers($target, $radius);
                if ($recommendations === []) {
                    $nearbyNote = $radius !== null
                        ? 'No eligible published provider is inside this radius. Widen the radius or check the provider service areas.'
                        : 'No eligible published provider serves this location yet.';
                }
            }
        }

        ds_success([
            'customer' => [
                'id' => (string) $customer['id'],
                'name' => trim((string) $customer['first_name'] . ' ' . (string) $customer['last_name']),
                'email' => (string) $customer['email'],
                'status' => (string) $customer['account_status'],
            ],
            'location' => ds_customer_location_dto($row, $includeCoordinates),
            'coordinatesVisible' => $includeCoordinates,
            'recommendations' => $recommendations,
            'note' => $nearbyNote,
        ]);
    }

    $providerUserId = trim((string) ($_GET['providerUserId'] ?? ''));
    if ($providerUserId !== '') {
        $profile = ds_provider_profile_by_user($providerUserId);
        if (!$profile) {
            ds_error(404, 'NOT_FOUND', 'Provider profile not found.');
        }
        ds_location_ensure_schema(false, true);
        $location = ds_provider_location($profile);
        $includePin = ds_user_has_permission($admin, 'providers.write');
        if (!$includePin) {
            unset($location['latitude'], $location['longitude']);
            $location['serviceAreas'] = array_map(static function (array $area): array {
                unset($area['latitude'], $area['longitude']);
                return $area;
            }, $location['serviceAreas']);
        }
        ds_success(['providerProfileId' => (string) $profile['id'], 'location' => $location, 'coordinatesVisible' => $includePin]);
    }

    ds_error(400, 'VALIDATION_ERROR', 'Pass customerId or providerUserId.');
}

ds_require_method('POST');
ds_require_same_origin();
ds_rate_limit('admin_locations', 60, 15 * 60);

$body = ds_json_body();
$action = strtolower(trim((string) ($body['action'] ?? '')));

if ($action === 'update_customer_location') {
    if (!ds_user_has_permission($admin, 'customers.write')) {
        ds_error(403, 'FORBIDDEN', 'You do not have permission to change customer locations.');
    }
    $userId = trim((string) ($body['userId'] ?? ''));
    if ($userId === '') {
        ds_error(400, 'VALIDATION_ERROR', 'Select a customer.');
    }
    $stmt = $pdo->prepare("SELECT id FROM users WHERE id = ? AND role = 'user' LIMIT 1");
    $stmt->execute([$userId]);
    if (!$stmt->fetch()) {
        ds_error(404, 'NOT_FOUND', 'Customer not found.');
    }
    ds_location_ensure_schema();
    $location = ds_location_validate($body, true);
    $saved = ds_save_customer_location($userId, $location);
    ds_audit('customer.location_updated', 'user', $userId, [
        'byStaff' => true,
        'region' => $location['region'],
        'city' => $location['city'],
        'area' => $location['area'],
        'coordinatesPresent' => $location['latitude'] !== null,
    ], (string) $admin['id']);
    ds_success(['saved' => true, 'location' => ds_customer_location_dto($saved, true)]);
}

if ($action === 'clear_customer_location') {
    if (!ds_user_has_permission($admin, 'customers.write')) {
        ds_error(403, 'FORBIDDEN', 'You do not have permission to change customer locations.');
    }
    $userId = trim((string) ($body['userId'] ?? ''));
    if ($userId === '') {
        ds_error(400, 'VALIDATION_ERROR', 'Select a customer.');
    }
    ds_pdo()->prepare('DELETE FROM customer_locations WHERE user_id = ?')->execute([$userId]);
    ds_audit('customer.location_cleared', 'user', $userId, ['byStaff' => true], (string) $admin['id']);
    ds_success(['cleared' => true]);
}

if ($action === 'update_provider_location') {
    if (!ds_user_has_permission($admin, 'providers.write')) {
        ds_error(403, 'FORBIDDEN', 'You do not have permission to change provider locations.');
    }
    $profileId = trim((string) ($body['providerProfileId'] ?? ''));
    $providerUserId = trim((string) ($body['providerUserId'] ?? ''));
    $profile = null;
    if ($profileId !== '') {
        $stmt = $pdo->prepare('SELECT * FROM provider_profiles WHERE id = ? LIMIT 1');
        $stmt->execute([$profileId]);
        $profile = $stmt->fetch() ?: null;
    } elseif ($providerUserId !== '') {
        $profile = ds_provider_profile_by_user($providerUserId);
    }
    if (!$profile) {
        ds_error(404, 'NOT_FOUND', 'Provider profile not found.');
    }
    ds_location_ensure_schema();
    $fields = ds_location_provider_fields($body, $profile);
    $pdo->prepare(
        'UPDATE provider_profiles SET country = ?, region = ?, city = ?, area_neighbourhood = ?,
            district = ?, service_radius_km = ?, latitude = ?, longitude = ?,
            service_areas_json = ?, service_regions_json = ?, updated_at = ? WHERE id = ?'
    )->execute([
        $fields['country'], $fields['region'], $fields['city'], $fields['area_neighbourhood'],
        $fields['district'], $fields['service_radius_km'], $fields['latitude'], $fields['longitude'],
        $fields['service_areas_json'], $fields['service_regions_json'],
        ds_now_sql(), (string) $profile['id'],
    ]);
    ds_flush_table_columns('provider_profiles');
    ds_audit('provider.location_updated', 'provider_profile', (string) $profile['id'], [
        'byStaff' => true,
        'region' => (string) ($fields['region'] ?? ''),
        'city' => (string) ($fields['city'] ?? ''),
        'coordinatesPresent' => $fields['latitude'] !== null,
        'serviceAreaCount' => count(ds_json_decode_field($fields['service_areas_json'] ?? null)),
    ], (string) $admin['id']);
    ds_success(['saved' => true]);
}

ds_error(400, 'VALIDATION_ERROR', 'Unknown location action.');

/**
 * @param array<string, mixed> $target
 * @return list<array<string, mixed>>
 */
function ds_admin_nearby_providers(array $target, ?float $radius): array
{
    if (!ds_table_exists('provider_profiles')) {
        return [];
    }
    ds_location_ensure_schema(false, true);
    $pdo = ds_pdo();
    $hasRemoved = ds_column_exists('provider_profiles', 'removed_at');
    $sql = "SELECT p.*, u.email_verified_at, u.account_status, v.verification_status
            FROM provider_profiles p
            INNER JOIN users u ON u.id = p.user_id
            INNER JOIN provider_verification v ON v.provider_user_id = p.user_id
            WHERE v.verification_status = 'verified'
              AND u.account_status = 'active'
              AND u.email_verified_at IS NOT NULL
              AND p.is_published = 1";
    if ($hasRemoved) {
        $sql .= ' AND p.removed_at IS NULL';
    }
    if (ds_table_exists('qa_accounts')) {
        $sql .= ' AND ' . ds_qa_sql_exclusion('u.email');
    }
    $stmt = $pdo->query($sql . ' LIMIT 500');
    $rows = $stmt->fetchAll() ?: [];

    $servicesByProfile = [];
    if ($rows !== [] && ds_table_exists('services')) {
        $ids = array_values(array_map(static fn (array $r): string => (string) $r['id'], $rows));
        $in = implode(',', array_fill(0, count($ids), '?'));
        $svc = $pdo->prepare("SELECT * FROM services WHERE provider_profile_id IN ($in) AND is_active = 1 ORDER BY sort_order ASC, name ASC");
        $svc->execute($ids);
        foreach ($svc->fetchAll() ?: [] as $service) {
            $servicesByProfile[(string) $service['provider_profile_id']][] = ds_service_row_to_public($service);
        }
    }

    $recommendations = [];
    foreach ($rows as $row) {
        $match = ds_provider_location_match($row, $target, $radius);
        if (empty($match['eligible'])) {
            continue;
        }
        $eligible = ds_assignment_provider_eligible((string) $row['id']);
        if (empty($eligible['ok'])) {
            continue;
        }
        $offerings = $servicesByProfile[(string) $row['id']] ?? [];
        $reasons = [];
        if ($match['precision'] === 'coordinates' && $match['distanceKm'] !== null) {
            $reasons[] = 'Within ' . $match['distanceKm'] . ' km straight-line';
        } elseif ($match['precision'] === 'service_area') {
            $reasons[] = 'Covers ' . ($match['matchedArea'] ?: $target['city'] ?? 'this service area');
        } elseif ($match['precision'] === 'city') {
            $reasons[] = 'Based in ' . ($target['city'] ?? 'the same town');
        } elseif ($match['precision'] === 'region') {
            $reasons[] = 'Serves ' . ($target['region'] ?? 'the same region');
        }
        if (ds_provider_offers_home_visit($row)) {
            $reasons[] = 'Offers home visits';
        }
        if (ds_provider_offers_studio($row)) {
            $reasons[] = 'Offers in-studio sessions';
        }
        $recommendations[] = [
            'providerProfileId' => (string) $row['id'],
            'providerUserId' => (string) $row['user_id'],
            'displayName' => (string) $row['display_name'],
            'providerKind' => (string) ($row['provider_type'] ?? 'individual'),
            'region' => $row['region'] ?? null,
            'city' => $row['city'] ?? null,
            'area' => $row['area_neighbourhood'] ?? null,
            'distanceKm' => $match['distanceKm'],
            'distancePrecision' => $match['precision'],
            'matchedArea' => $match['matchedArea'],
            'offersHomeVisit' => ds_provider_offers_home_visit($row),
            'offersStudio' => ds_provider_offers_studio($row),
            'services' => array_values(array_map(static fn (array $s): string => (string) $s['name'], $offerings)),
            'reasons' => $reasons,
        ];
    }

    usort($recommendations, static function (array $a, array $b): int {
        $ad = $a['distanceKm'];
        $bd = $b['distanceKm'];
        if ($ad === null && $bd !== null) {
            return 1;
        }
        if ($bd === null && $ad !== null) {
            return -1;
        }
        if ($ad !== null && $bd !== null && $ad !== $bd) {
            return $ad <=> $bd;
        }
        return strcmp((string) $a['displayName'], (string) $b['displayName']);
    });

    return array_slice($recommendations, 0, 30);
}
