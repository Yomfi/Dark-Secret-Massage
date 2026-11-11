<?php
declare(strict_types=1);

/**
 * Location-aware provider discovery.
 *
 * One query builder serves the public directory, the customer Explore search and
 * the admin "Assign nearest provider" tool. Provider coordinates are used only
 * inside this module and are never returned in a public response.
 */

require_once __DIR__ . '/locations.php';

/** @return array<string, mixed> Public-safe location summary for one profile row. */
function ds_discovery_public_location(array $row): array
{
    $location = ds_provider_location($row);
    $areas = [];
    foreach ($location['serviceAreas'] as $area) {
        $areas[] = [
            'region' => (string) ($area['region'] ?? ''),
            'district' => (string) ($area['district'] ?? ''),
            'city' => (string) ($area['city'] ?? ''),
            'area' => (string) ($area['area'] ?? ''),
        ];
    }
    return [
        'region' => $location['region'] !== null ? (string) $location['region'] : null,
        'district' => $location['district'] !== null ? (string) $location['district'] : null,
        'city' => $location['city'] !== null ? (string) $location['city'] : null,
        'area' => $location['area'] !== null ? (string) $location['area'] : null,
        'serviceArea' => $location['serviceArea'] !== null ? (string) $location['serviceArea'] : null,
        'radiusKm' => $location['radiusKm'],
        'serviceAreas' => $areas,
        'serviceRegions' => array_values(array_map('strval', $location['serviceRegions'])),
        'offersHomeVisit' => ds_provider_offers_home_visit($row),
        'offersStudio' => ds_provider_offers_studio($row),
    ];
}

function ds_discovery_service_setting_label(array $row): array
{
    $settings = ds_json_decode_field($row['service_setting_json'] ?? null);
    return is_array($settings) ? array_values(array_map('strval', $settings)) : [];
}

/**
 * Run a discovery query.
 *
 * @param array<string, mixed> $params region, city, q, providerType, gender,
 *        availability, service, mode, radiusKm, sort, limit
 * @param array<string, mixed>|null $target customer location (may include private coordinates)
 * @return list<array<string, mixed>>
 */
function ds_discovery_search(array $params, ?array $target = null): array
{
    if (!ds_table_exists('provider_profiles') || !ds_table_exists('provider_verification')) {
        return [];
    }

    $pdo = ds_pdo();
    $hasDistrict = ds_column_exists('provider_profiles', 'district');
    $hasAreas = ds_column_exists('provider_profiles', 'service_areas_json');
    $hasRegions = ds_column_exists('provider_profiles', 'service_regions_json');
    $hasPublished = ds_column_exists('provider_profiles', 'is_published');
    $hasRemoved = ds_column_exists('provider_profiles', 'removed_at');

    // Publication controls public visibility. Identity verification controls
    // the badge and booking eligibility, not whether a published profile can
    // be browsed. Left join keeps legacy profiles without a verification row
    // visible as Unverified once an admin publishes them.
    $sql = "SELECT p.*, u.email_verified_at, u.account_status,
                   COALESCE(v.verification_status, 'unverified') AS verification_status,
                   v.verified_at
            FROM provider_profiles p
            INNER JOIN users u ON u.id = p.user_id
            LEFT JOIN provider_verification v ON v.provider_user_id = p.user_id
            WHERE u.account_status = 'active'
              AND u.email_verified_at IS NOT NULL";
    if ($hasPublished) {
        $sql .= ' AND p.is_published = 1';
    }
    if ($hasRemoved) {
        $sql .= ' AND p.removed_at IS NULL';
    }
    if (ds_table_exists('qa_accounts')) {
        $sql .= ' AND ' . ds_qa_sql_exclusion('u.email');
    }

    $where = [];
    $bind = [];

    $region = ds_location_clean((string) ($params['region'] ?? ''), 120);
    if ($region !== '') {
        $clause = 'LOWER(p.region) = ?';
        $bind[] = strtolower($region);
        if ($hasRegions) {
            $clause = '(' . $clause . ' OR p.service_regions_json LIKE ?)';
            $bind[] = '%"' . str_replace(['%', '_'], ['\\%', '\\_'], $region) . '"%';
        }
        $where[] = $clause;
    }

    $city = ds_location_clean((string) ($params['city'] ?? ''), 160);
    if ($city !== '') {
        $clause = '(LOWER(p.city) = ? OR LOWER(p.area_neighbourhood) = ?';
        $bind[] = strtolower($city);
        $bind[] = strtolower($city);
        if ($hasAreas) {
            $clause .= ' OR p.service_areas_json LIKE ?';
            $bind[] = '%' . $city . '%';
        }
        $where[] = $clause . ')';
    }

    $q = ds_location_clean((string) ($params['q'] ?? ''), 120);
    if ($q !== '') {
        $like = '%' . $q . '%';
        $where[] = '(p.display_name LIKE ? OR p.city LIKE ? OR p.area_neighbourhood LIKE ? OR p.service_area LIKE ?)';
        array_push($bind, $like, $like, $like, $like);
    }

    $slug = trim((string) ($params['slug'] ?? ''));
    if ($slug !== '') {
        $where[] = 'p.slug = ?';
        $bind[] = $slug;
    }

    $providerType = strtolower(trim((string) ($params['providerType'] ?? '')));
    if (in_array($providerType, ['individual', 'agency'], true)) {
        $where[] = 'p.provider_type = ?';
        $bind[] = $providerType;
    }

    $gender = strtolower(trim((string) ($params['gender'] ?? '')));
    if (in_array($gender, ['female', 'women'], true)) {
        $gender = 'female';
    } elseif (in_array($gender, ['male', 'men'], true)) {
        $gender = 'male';
    } else {
        $gender = '';
    }
    if ($gender !== '') {
        $clause = "(p.provider_type <> 'agency' AND LOWER(p.gender) = ?)";
        $bind[] = $gender;
        if (ds_table_exists('agency_team_members')) {
            $clause = '(' . $clause . " OR (p.provider_type = 'agency' AND EXISTS (
                SELECT 1 FROM agency_team_members tm
                WHERE tm.agency_profile_id = p.id AND tm.status = 'active' AND LOWER(tm.gender) = ?
            )))";
            $bind[] = $gender;
        } else {
            $clause .= ')';
        }
        $where[] = $clause;
    }

    $availability = strtolower(trim((string) ($params['availability'] ?? '')));
    if (in_array($availability, ['today', 'this_week', 'flexible'], true)) {
        $where[] = 'LOWER(p.availability) = ?';
        $bind[] = $availability;
    }

    $service = ds_location_clean((string) ($params['service'] ?? ''), 120);
    if ($service !== '') {
        $like = '%' . $service . '%';
        $clause = '(p.services_json LIKE ?';
        $bind[] = $like;
        if (ds_table_exists('services')) {
            $clause .= ' OR EXISTS (SELECT 1 FROM services s WHERE s.provider_profile_id = p.id AND s.is_active = 1 AND s.name LIKE ?)';
            $bind[] = $like;
        }
        $where[] = $clause . ')';
    }

    $mode = strtolower(trim((string) ($params['mode'] ?? '')));
    if ($mode === 'home') {
        $where[] = "p.service_setting_json IS NOT NULL AND p.service_setting_json <> '' AND (
            p.service_setting_json LIKE '%home_visit%' OR p.service_setting_json LIKE '%in_home%'
            OR p.service_setting_json LIKE '%client_location%' OR p.service_setting_json LIKE '%hotel_visit%'
            OR p.service_setting_json LIKE '%flexible%'
        )";
    } elseif ($mode === 'studio') {
        $where[] = "(p.service_setting_json IS NULL OR p.service_setting_json = ''
            OR p.service_setting_json LIKE '%studio%' OR p.service_setting_json LIKE '%flexible%')";
    }

    if ($where !== []) {
        $sql .= ' AND ' . implode(' AND ', $where);
    }
    $limit = min(500, max(20, (int) ($params['limit'] ?? 500)));
    $sql .= ' ORDER BY COALESCE(p.published_at, p.created_at) DESC LIMIT ' . $limit;

    $stmt = $pdo->prepare($sql);
    $stmt->execute($bind);
    $rows = $stmt->fetchAll() ?: [];
    if ($rows === []) {
        return [];
    }

    $servicesByProfile = [];
    if (ds_table_exists('services')) {
        $ids = array_values(array_map(static fn (array $r): string => (string) $r['id'], $rows));
        $in = implode(',', array_fill(0, count($ids), '?'));
        $svc = $pdo->prepare(
            "SELECT * FROM services WHERE provider_profile_id IN ($in) AND is_active = 1 ORDER BY sort_order ASC, name ASC"
        );
        $svc->execute($ids);
        foreach ($svc->fetchAll() ?: [] as $row2) {
            $servicesByProfile[(string) $row2['provider_profile_id']][] = ds_service_row_to_public($row2);
        }
    }

    $radius = isset($params['radiusKm']) && $params['radiusKm'] !== '' && $params['radiusKm'] !== null
        ? (float) $params['radiusKm'] : null;
    if ($radius !== null && $radius <= 0) {
        $radius = null;
    }

    $out = [];
    foreach ($rows as $row) {
        $match = $target !== null
            ? ds_provider_location_match($row, $target, $radius)
            : ['eligible' => true, 'distanceKm' => null, 'precision' => 'none', 'matchedArea' => null];

        if ($target !== null && empty($match['eligible'])) {
            continue;
        }
        if ($mode === 'home' && !ds_provider_offers_home_visit($row)) {
            continue;
        }
        if ($mode === 'studio' && !ds_provider_offers_studio($row)) {
            continue;
        }

        $out[] = ds_discovery_provider_dto($row, $servicesByProfile[(string) $row['id']] ?? [], $match);
    }

    $serviceFilter = ds_location_clean((string) ($params['service'] ?? ''), 120);
    if ($serviceFilter !== '') {
        $needle = strtolower($serviceFilter);
        $out = array_values(array_filter($out, static function (array $provider) use ($needle): bool {
            foreach ($provider['services'] as $name) {
                if (str_contains(strtolower((string) $name), $needle)) {
                    return true;
                }
            }
            return false;
        }));
    }

    $sort = strtolower(trim((string) ($params['sort'] ?? 'recommended')));
    $precisionRank = ['coordinates' => 0, 'service_area' => 1, 'city' => 2, 'region' => 3, 'none' => 4];
    usort($out, static function (array $a, array $b) use ($sort, $precisionRank): int {
        if ($sort === 'recent') {
            return strcmp((string) ($b['createdAt'] ?? ''), (string) ($a['createdAt'] ?? ''));
        }
        if ($sort === 'price_asc' || $sort === 'price_desc') {
            $av = $a['startingPrice'] ?? null;
            $bv = $b['startingPrice'] ?? null;
            if ($av === null && $bv === null) {
                return strcmp($a['displayName'], $b['displayName']);
            }
            if ($av === null) {
                return 1;
            }
            if ($bv === null) {
                return -1;
            }
            return $sort === 'price_asc' ? $av <=> $bv : $bv <=> $av;
        }
        // Nearest first, then the most precise locality match, then name.
        $ad = $a['distanceKm'];
        $bd = $b['distanceKm'];
        if ($ad !== null || $bd !== null) {
            if ($ad === null) {
                return 1;
            }
            if ($bd === null) {
                return -1;
            }
            if ($ad !== $bd) {
                return $ad <=> $bd;
            }
        }
        $ap = $precisionRank[$a['distancePrecision']] ?? 9;
        $bp = $precisionRank[$b['distancePrecision']] ?? 9;
        if ($ap !== $bp) {
            return $ap <=> $bp;
        }
        return strcmp($a['displayName'], $b['displayName']);
    });

    return array_slice($out, 0, 200);
}

/** @return array<string, mixed> */
function ds_discovery_provider_dto(array $row, array $offerings, array $match): array
{
    $profileId = (string) $row['id'];
    $settings = ds_discovery_service_setting_label($row);
    $gallery = ds_json_decode_field($row['gallery_json'] ?? null);
    $languages = ds_json_decode_field($row['languages_json'] ?? null);
    $servicesJson = ds_json_decode_field($row['services_json'] ?? null);
    $rates = ds_json_decode_field($row['rates_json'] ?? null);
    $location = ds_discovery_public_location($row);

    $verificationStatus = (string) ($row['verification_status'] ?? 'unverified');
    $verified = $verificationStatus === 'verified';

    $starting = $row['starting_price'] !== null ? (float) $row['starting_price'] : null;
    if ($starting === null && $offerings !== []) {
        $prices = array_map(static fn (array $s): float => (float) $s['price'], $offerings);
        $starting = min($prices);
    }

    $kind = (string) ($row['provider_type'] ?? 'individual') === 'agency' ? 'agency' : 'individual';
    $serviceNames = $offerings !== []
        ? array_values(array_map(static fn (array $s): string => (string) $s['name'], $offerings))
        : (is_array($servicesJson) ? array_values(array_map('strval', $servicesJson)) : []);

    return [
        'id' => $profileId,
        'slug' => (string) $row['slug'],
        'displayName' => (string) $row['display_name'],
        'providerKind' => $kind,
        'profileType' => 'massage_provider',
        'gender' => $row['gender'] !== null ? (string) $row['gender'] : null,
        'city' => (string) ($row['city'] ?? ''),
        'citySlug' => ds_slugify((string) ($row['city'] ?? '')),
        'district' => $location['district'],
        'area' => $location['area'],
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
        'serviceSetting' => $settings,
        'serviceArea' => $location['serviceArea'],
        'serviceAreas' => $location['serviceAreas'],
        'serviceRegions' => $location['serviceRegions'],
        'offersHomeVisit' => $location['offersHomeVisit'],
        'offersStudio' => $location['offersStudio'],
        'distanceKm' => $match['distanceKm'],
        'distancePrecision' => $match['precision'],
        'matchedArea' => $match['matchedArea'],
        'primaryImage' => $row['primary_image'] !== null ? (string) $row['primary_image'] : null,
        'coverImage' => $row['cover_image'] !== null ? (string) $row['cover_image'] : null,
        'gallery' => is_array($gallery) ? array_values(array_filter(array_map('strval', $gallery))) : [],
        'publicContactEnabled' => (bool) ($row['public_phone'] ?? false),
        'languages' => is_array($languages) ? $languages : [],
        'yearsExperience' => isset($row['years_experience']) ? (int) $row['years_experience'] : null,
        'teamMembers' => $kind === 'agency' ? ds_agency_team_members($profileId, true) : [],
        'verified' => $verified,
        'bookable' => $verified,
        'verificationStatus' => $verificationStatus,
        'featured' => false,
        'isDemo' => false,
        'createdAt' => $row['created_at'] ?? null,
    ];
}

/** Build a search target from a customer_locations row without leaking the pin. */
function ds_discovery_target_from_customer_row(?array $row): ?array
{
    if (!$row) {
        return null;
    }
    $region = trim((string) ($row['region'] ?? ''));
    $city = trim((string) ($row['city'] ?? ''));
    $area = trim((string) ($row['area'] ?? ''));
    $lat = isset($row['latitude']) && $row['latitude'] !== null ? (float) $row['latitude'] : null;
    $lng = isset($row['longitude']) && $row['longitude'] !== null ? (float) $row['longitude'] : null;
    if ($region === '' && $city === '' && $area === '' && $lat === null) {
        return null;
    }
    return [
        'region' => $region,
        'district' => trim((string) ($row['district'] ?? '')),
        'city' => $city,
        'area' => $area,
        'latitude' => $lat,
        'longitude' => $lng,
    ];
}
