<?php
declare(strict_types=1);

/**
 * Ghana-first location and service-coverage helpers.
 *
 * Structured locations are additive: existing provider city/region/service_area
 * values stay valid, and a provider may also publish multiple service areas.
 * Customer coordinates live in their own table and are never exposed publicly.
 */

function ds_ghana_regions(): array
{
    return [
        'Greater Accra', 'Ashanti', 'Central', 'Eastern', 'Western', 'Western North',
        'Volta', 'Oti', 'Northern', 'North East', 'Savannah', 'Upper East',
        'Upper West', 'Bono', 'Bono East', 'Ahafo',
    ];
}

function ds_location_region_valid(string $region): bool
{
    foreach (ds_ghana_regions() as $known) {
        if (strcasecmp($known, trim($region)) === 0) {
            return true;
        }
    }
    return false;
}

function ds_location_clean(string $value, int $max): string
{
    $value = trim(preg_replace('/\s+/', ' ', $value) ?? '');
    return mb_substr($value, 0, $max);
}

/** Validate a location payload. Returns normalized keys; never returns credentials. */
function ds_location_validate(array $body, bool $requireRegion = false): array
{
    $country = ds_location_clean((string) ($body['country'] ?? 'Ghana'), 80) ?: 'Ghana';
    $region = ds_location_clean((string) ($body['region'] ?? ''), 120);
    $district = ds_location_clean((string) ($body['district'] ?? ''), 160);
    $city = ds_location_clean((string) ($body['city'] ?? ''), 160);
    $area = ds_location_clean((string) ($body['area'] ?? ''), 160);
    $description = ds_location_clean((string) ($body['description'] ?? ''), 500);

    if ($country === 'Ghana' && $region !== '' && !ds_location_region_valid($region)) {
        ds_error(400, 'VALIDATION_ERROR', 'Choose one of Ghana\'s 16 regions.');
    }
    if ($requireRegion && $country === 'Ghana' && $region === '') {
        ds_error(400, 'VALIDATION_ERROR', 'Choose your region.');
    }
    if ($country === 'Ghana' && $region !== '' && $city === '') {
        ds_error(400, 'VALIDATION_ERROR', 'Choose a city or town in your region.');
    }

    $lat = array_key_exists('latitude', $body) ? $body['latitude'] : null;
    $lng = array_key_exists('longitude', $body) ? $body['longitude'] : null;
    $hasLat = $lat !== null && $lat !== '';
    $hasLng = $lng !== null && $lng !== '';
    if ($hasLat !== $hasLng) {
        ds_error(400, 'VALIDATION_ERROR', 'Latitude and longitude must be supplied together.');
    }
    $latitude = null;
    $longitude = null;
    if ($hasLat && $hasLng) {
        $latitude = (float) $lat;
        $longitude = (float) $lng;
        if ($latitude < -90 || $latitude > 90 || $longitude < -180 || $longitude > 180) {
            ds_error(400, 'VALIDATION_ERROR', 'Those coordinates are not valid.');
        }
        $latitude = round($latitude, 6);
        $longitude = round($longitude, 6);
    }

    return [
        'country' => $country,
        'region' => $region,
        'district' => $district,
        'city' => $city,
        'area' => $area,
        'description' => $description,
        'latitude' => $latitude,
        'longitude' => $longitude,
    ];
}

/** Build a search target from request fields. Returns null when no location was supplied. */
function ds_location_search_target(array $body): ?array
{
    $region = ds_location_clean((string) ($body['region'] ?? ''), 120);
    $district = ds_location_clean((string) ($body['district'] ?? ''), 160);
    $city = ds_location_clean((string) ($body['city'] ?? ''), 160);
    $area = ds_location_clean((string) ($body['area'] ?? ''), 160);
    if ($region !== '' && !ds_location_region_valid($region)) {
        ds_error(400, 'VALIDATION_ERROR', 'Choose one of Ghana\'s 16 regions.');
    }

    $lat = array_key_exists('latitude', $body) ? $body['latitude'] : null;
    $lng = array_key_exists('longitude', $body) ? $body['longitude'] : null;
    $hasLat = $lat !== null && $lat !== '';
    $hasLng = $lng !== null && $lng !== '';
    if ($hasLat !== $hasLng) {
        ds_error(400, 'VALIDATION_ERROR', 'Latitude and longitude must be supplied together.');
    }
    $latitude = null;
    $longitude = null;
    if ($hasLat && $hasLng) {
        $latitude = round((float) $lat, 6);
        $longitude = round((float) $lng, 6);
        if ($latitude < -90 || $latitude > 90 || $longitude < -180 || $longitude > 180) {
            ds_error(400, 'VALIDATION_ERROR', 'Those coordinates are not valid.');
        }
    }

    if ($region === '' && $district === '' && $city === '' && $area === '' && $latitude === null) {
        return null;
    }
    return [
        'region' => $region,
        'district' => $district,
        'city' => $city,
        'area' => $area,
        'latitude' => $latitude,
        'longitude' => $longitude,
    ];
}

/** @return array<string, mixed>|null */
function ds_customer_location(string $userId): ?array
{
    if (!ds_table_exists('customer_locations')) {
        return null;
    }
    $stmt = ds_pdo()->prepare('SELECT * FROM customer_locations WHERE user_id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/** Shape a saved customer location for its owner (coordinates included) or staff. */
function ds_customer_location_dto(?array $row, bool $includeCoordinates = false): ?array
{
    if (!$row) {
        return null;
    }
    $dto = [
        'country' => (string) ($row['country'] ?? 'Ghana'),
        'region' => $row['region'] ?? null,
        'district' => $row['district'] ?? null,
        'city' => $row['city'] ?? null,
        'area' => $row['area'] ?? null,
        'description' => $row['description'] ?? null,
        'updatedAt' => $row['updated_at'] ?? null,
    ];
    if ($includeCoordinates && $row['latitude'] !== null && $row['longitude'] !== null) {
        $dto['latitude'] = (float) $row['latitude'];
        $dto['longitude'] = (float) $row['longitude'];
    }
    return $dto;
}

function ds_save_customer_location(string $userId, array $location): array
{
    ds_location_ensure_schema();
    $now = ds_now_sql();
    $existing = ds_customer_location($userId);
    $pdo = ds_pdo();
    if ($existing) {
        $pdo->prepare(
            'UPDATE customer_locations SET country = ?, region = ?, district = ?, city = ?, area = ?,
                description = ?, latitude = ?, longitude = ?, updated_at = ? WHERE user_id = ?'
        )->execute([
            $location['country'], $location['region'] !== '' ? $location['region'] : null,
            $location['district'] !== '' ? $location['district'] : null,
            $location['city'] !== '' ? $location['city'] : null,
            $location['area'] !== '' ? $location['area'] : null,
            $location['description'] !== '' ? $location['description'] : null,
            $location['latitude'], $location['longitude'], $now, $userId,
        ]);
    } else {
        $pdo->prepare(
            'INSERT INTO customer_locations (user_id, country, region, district, city, area, description,
                latitude, longitude, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $userId, $location['country'], $location['region'] !== '' ? $location['region'] : null,
            $location['district'] !== '' ? $location['district'] : null,
            $location['city'] !== '' ? $location['city'] : null,
            $location['area'] !== '' ? $location['area'] : null,
            $location['description'] !== '' ? $location['description'] : null,
            $location['latitude'], $location['longitude'], $now, $now,
        ]);
    }
    return ds_customer_location($userId) ?: [];
}

/** @return array<string, mixed> */
function ds_provider_location(array $profile): array
{
    $lat = isset($profile['latitude']) && $profile['latitude'] !== null ? (float) $profile['latitude'] : null;
    $lng = isset($profile['longitude']) && $profile['longitude'] !== null ? (float) $profile['longitude'] : null;
    return [
        'district' => $profile['district'] ?? null,
        'region' => $profile['region'] ?? null,
        'city' => $profile['city'] ?? null,
        'area' => $profile['area_neighbourhood'] ?? null,
        'businessAddress' => $profile['business_address'] ?? null,
        'serviceArea' => $profile['service_area'] ?? null,
        'radiusKm' => isset($profile['service_radius_km']) && $profile['service_radius_km'] !== null
            ? (float) $profile['service_radius_km'] : null,
        'latitude' => $lat,
        'longitude' => $lng,
        'serviceAreas' => ds_provider_service_areas($profile),
        'serviceRegions' => array_values(array_map(
            'strval',
            ds_json_decode_field($profile['service_regions_json'] ?? null)
        )),
        'serviceSetting' => ds_json_decode_field($profile['service_setting_json'] ?? null),
    ];
}

/** @return list<array<string, mixed>> */
function ds_provider_service_areas(array $profile): array
{
    $areas = ds_json_decode_field($profile['service_areas_json'] ?? null);
    if (!is_array($areas)) {
        return [];
    }
    $out = [];
    foreach ($areas as $area) {
        if (!is_array($area)) {
            continue;
        }
        $out[] = [
            'region' => (string) ($area['region'] ?? ''),
            'district' => (string) ($area['district'] ?? ''),
            'city' => (string) ($area['city'] ?? ''),
            'area' => (string) ($area['area'] ?? ''),
            'radiusKm' => isset($area['radiusKm']) && $area['radiusKm'] !== '' ? (float) $area['radiusKm'] : null,
            'latitude' => isset($area['latitude']) && $area['latitude'] !== '' ? (float) $area['latitude'] : null,
            'longitude' => isset($area['longitude']) && $area['longitude'] !== '' ? (float) $area['longitude'] : null,
        ];
    }
    return $out;
}

function ds_haversine_km(float $lat1, float $lng1, float $lat2, float $lng2): float
{
    $earth = 6371.0088;
    $dLat = deg2rad($lat2 - $lat1);
    $dLng = deg2rad($lng2 - $lng1);
    $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
    return round($earth * 2 * atan2(sqrt($a), sqrt(1 - $a)), 1);
}

/**
 * Does a provider serve a location? Returns eligibility plus precision so the UI
 * never presents a region-only match as an exact distance.
 *
 * @return array{eligible:bool,distanceKm:?float,precision:string,matchedArea:?string}
 */
function ds_provider_location_match(array $profile, ?array $target, ?float $radiusKm = null): array
{
    $none = ['eligible' => false, 'distanceKm' => null, 'precision' => 'none', 'matchedArea' => null];
    if (!$target) {
        return ['eligible' => true, 'distanceKm' => null, 'precision' => 'none', 'matchedArea' => null];
    }
    $location = ds_provider_location($profile);
    $targetRegion = strtolower(trim((string) ($target['region'] ?? '')));
    $targetCity = strtolower(trim((string) ($target['city'] ?? '')));
    $targetArea = strtolower(trim((string) ($target['area'] ?? '')));
    $targetLat = isset($target['latitude']) && $target['latitude'] !== null ? (float) $target['latitude'] : null;
    $targetLng = isset($target['longitude']) && $target['longitude'] !== null ? (float) $target['longitude'] : null;

    $primaryMatch = $targetRegion !== ''
        && strtolower(trim((string) $location['region'])) === $targetRegion;
    $regions = array_map(static fn ($r): string => strtolower(trim((string) $r)), $location['serviceRegions']);
    $cityOnlyMatch = $targetRegion === '' && $targetCity !== ''
        && strtolower(trim((string) $location['city'])) === $targetCity;
    $regionServed = $primaryMatch || $cityOnlyMatch
        || ($targetRegion !== '' && in_array($targetRegion, $regions, true));

    $areas = $location['serviceAreas'];
    $areaMatch = null;
    foreach ($areas as $area) {
        $areaRegion = strtolower(trim((string) $area['region']));
        $areaCity = strtolower(trim((string) $area['city']));
        $areaName = strtolower(trim((string) $area['area']));
        $regionOk = $targetRegion === '' || $areaRegion === $targetRegion;
        $cityOk = $targetCity === '' || $areaCity === $targetCity;
        $nameOk = $targetArea === '' || $areaName === '' || $areaName === $targetArea
            || str_contains($areaName, $targetArea) || str_contains($targetArea, $areaName);
        if ($regionOk && $cityOk && $nameOk) {
            $areaMatch = $area;
            break;
        }
    }

    $distance = null;
    if ($targetLat !== null && $targetLng !== null && $location['latitude'] !== null && $location['longitude'] !== null) {
        $distance = ds_haversine_km($location['latitude'], $location['longitude'], $targetLat, $targetLng);
    }

    // Explicit radius: only coordinate-backed matches count. Never invent a distance.
    if ($radiusKm !== null && $radiusKm > 0) {
        if ($distance === null) {
            return $none;
        }
        $primaryRadius = $location['radiusKm'] !== null && $location['radiusKm'] > 0
            ? $location['radiusKm'] : null;
        $withinPrimary = $primaryRadius !== null && $distance <= $primaryRadius;
        $withinArea = false;
        foreach ($areas as $area) {
            if ($area['latitude'] === null || $area['longitude'] === null) {
                continue;
            }
            $areaDistance = ds_haversine_km($area['latitude'], $area['longitude'], $targetLat, $targetLng);
            $areaRadius = $area['radiusKm'] ?? null;
            if ($areaRadius !== null && $areaRadius > 0 && $areaDistance <= $areaRadius) {
                $withinArea = true;
                break;
            }
        }
        $eligible = $distance <= $radiusKm && ($withinPrimary || $withinArea || $areaMatch !== null);
        return [
            'eligible' => $eligible,
            'distanceKm' => $distance,
            'precision' => 'coordinates',
            'matchedArea' => $areaMatch['city'] ?? $location['city'] ?? null,
        ];
    }

    if ($areaMatch !== null) {
        return [
            'eligible' => true,
            'distanceKm' => $distance,
            'precision' => $distance !== null ? 'coordinates' : 'service_area',
            'matchedArea' => $areaMatch['city'] ?? $areaMatch['area'] ?? null,
        ];
    }
    if ($regionServed) {
        $cityMatches = $targetCity === '' || strtolower(trim((string) $location['city'])) === $targetCity;
        return [
            'eligible' => true,
            'distanceKm' => $distance,
            'precision' => $distance !== null ? 'coordinates' : ($cityMatches ? 'city' : 'region'),
            'matchedArea' => $location['city'] ?? null,
        ];
    }
    return $none;
}

/** Whether a provider explicitly supports home visits. */
function ds_provider_offers_home_visit(array $profile): bool
{
    $settings = ds_json_decode_field($profile['service_setting_json'] ?? null);
    if (!is_array($settings)) {
        return false;
    }
    foreach (['home_visit', 'in_home', 'client_location', 'hotel_visit', 'flexible'] as $mode) {
        if (in_array($mode, $settings, true)) {
            return true;
        }
    }
    return false;
}

function ds_provider_offers_studio(array $profile): bool
{
    $settings = ds_json_decode_field($profile['service_setting_json'] ?? null);
    if (!is_array($settings)) {
        return true;
    }
    return in_array('studio', $settings, true) || in_array('flexible', $settings, true);
}

/** Validate provider-managed service areas (max 20, each with a real region/city). */
function ds_location_service_areas_validate($raw): array
{
    if (!is_array($raw)) {
        return [];
    }
    $out = [];
    foreach (array_slice($raw, 0, 20) as $entry) {
        if (!is_array($entry)) {
            continue;
        }
        $region = ds_location_clean((string) ($entry['region'] ?? ''), 120);
        $district = ds_location_clean((string) ($entry['district'] ?? ''), 160);
        $city = ds_location_clean((string) ($entry['city'] ?? ''), 160);
        $area = ds_location_clean((string) ($entry['area'] ?? ''), 160);
        if ($region === '' && $city === '' && $area === '') {
            continue;
        }
        if ($region !== '' && !ds_location_region_valid($region)) {
            ds_error(400, 'VALIDATION_ERROR', 'Each service area must use one of Ghana\'s 16 regions.');
        }
        if ($city === '' && $area === '') {
            ds_error(400, 'VALIDATION_ERROR', 'Each service area needs a city/town or area.');
        }
        $radius = null;
        if (isset($entry['radiusKm']) && $entry['radiusKm'] !== '' && $entry['radiusKm'] !== null) {
            $radius = (float) $entry['radiusKm'];
            if ($radius < 1 || $radius > 500) {
                ds_error(400, 'VALIDATION_ERROR', 'A service-area radius must be between 1 and 500 km.');
            }
            $radius = round($radius, 1);
        }
        $lat = isset($entry['latitude']) && $entry['latitude'] !== '' && $entry['latitude'] !== null
            ? (float) $entry['latitude'] : null;
        $lng = isset($entry['longitude']) && $entry['longitude'] !== '' && $entry['longitude'] !== null
            ? (float) $entry['longitude'] : null;
        if (($lat === null) !== ($lng === null)) {
            ds_error(400, 'VALIDATION_ERROR', 'Service-area latitude and longitude must be supplied together.');
        }
        if ($lat !== null && ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180)) {
            ds_error(400, 'VALIDATION_ERROR', 'A service-area pin is outside valid coordinates.');
        }
        $out[] = [
            'region' => $region,
            'district' => $district,
            'city' => $city,
            'area' => $area,
            'radiusKm' => $radius,
            'latitude' => $lat !== null ? round($lat, 6) : null,
            'longitude' => $lng !== null ? round($lng, 6) : null,
        ];
    }
    return $out;
}

/**
 * Structured provider location columns. Keys absent from the body keep their
 * stored value, so a partial save cannot silently erase a provider's coverage.
 *
 * @return array<string, mixed>
 */
function ds_location_provider_fields(array $body, ?array $profile = null): array
{
    $profile = $profile ?: [];
    $country = ds_location_clean((string) ($body['country'] ?? ($profile['country'] ?? 'Ghana')), 80) ?: 'Ghana';
    $region = array_key_exists('region', $body)
        ? ds_location_clean((string) $body['region'], 120)
        : trim((string) ($profile['region'] ?? ''));
    $district = array_key_exists('district', $body)
        ? ds_location_clean((string) $body['district'], 160)
        : trim((string) ($profile['district'] ?? ''));
    $city = array_key_exists('city', $body)
        ? ds_location_clean((string) $body['city'], 160)
        : trim((string) ($profile['city'] ?? ''));
    $area = array_key_exists('areaNeighbourhood', $body)
        ? ds_location_clean((string) $body['areaNeighbourhood'], 160)
        : trim((string) ($profile['area_neighbourhood'] ?? ''));

    if ($country === 'Ghana' && $region !== '' && !ds_location_region_valid($region)) {
        ds_error(400, 'VALIDATION_ERROR', 'Choose one of Ghana\'s 16 regions.');
    }
    if ($country === 'Ghana' && $region !== '' && $city === '') {
        ds_error(400, 'VALIDATION_ERROR', 'Add the city or town for your region.');
    }

    $existingLat = isset($profile['latitude']) && $profile['latitude'] !== null ? (float) $profile['latitude'] : null;
    $existingLng = isset($profile['longitude']) && $profile['longitude'] !== null ? (float) $profile['longitude'] : null;
    $lat = array_key_exists('latitude', $body) ? $body['latitude'] : $existingLat;
    $lng = array_key_exists('longitude', $body) ? $body['longitude'] : $existingLng;
    $hasLat = $lat !== null && $lat !== '';
    $hasLng = $lng !== null && $lng !== '';
    if ($hasLat !== $hasLng) {
        ds_error(400, 'VALIDATION_ERROR', 'Provider latitude and longitude must be supplied together.');
    }
    $latitude = null;
    $longitude = null;
    if ($hasLat && $hasLng) {
        $latitude = (float) $lat;
        $longitude = (float) $lng;
        if ($latitude < -90 || $latitude > 90 || $longitude < -180 || $longitude > 180) {
            ds_error(400, 'VALIDATION_ERROR', 'Those provider coordinates are not valid.');
        }
        $latitude = round($latitude, 6);
        $longitude = round($longitude, 6);
    }

    $areas = array_key_exists('serviceAreas', $body)
        ? ds_location_service_areas_validate($body['serviceAreas'])
        : ds_provider_service_areas($profile);

    $regionsRaw = array_key_exists('serviceRegions', $body)
        ? $body['serviceRegions']
        : ds_json_decode_field($profile['service_regions_json'] ?? null);
    $serviceRegions = [];
    if (is_array($regionsRaw)) {
        foreach ($regionsRaw as $candidate) {
            $candidate = ds_location_clean((string) $candidate, 120);
            if ($candidate === '') {
                continue;
            }
            if (!ds_location_region_valid($candidate)) {
                ds_error(400, 'VALIDATION_ERROR', 'Service regions must be Ghanaian regions.');
            }
            if (!in_array($candidate, $serviceRegions, true)) {
                $serviceRegions[] = $candidate;
            }
        }
    }

    return [
        'district' => $district !== '' ? $district : null,
        'latitude' => $latitude,
        'longitude' => $longitude,
        'service_areas_json' => json_encode($areas),
        'service_regions_json' => json_encode(array_values($serviceRegions)),
    ];
}

function ds_location_ensure_schema(bool $force = false, bool $optional = false): void
{
    static $done = false;
    if ($done && !$force) {
        return;
    }
    if (!$force && ds_is_prod()) {
        if (!ds_table_exists('customer_locations')) {
            if ($optional) {
                return;
            }
            ds_error(503, 'SCHEMA_NOT_MIGRATED', 'Location features need the database migration. Run the CLI migration first.');
        }
        $done = true;
        return;
    }

    $pdo = ds_pdo();
    try {
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS customer_locations (
                user_id VARCHAR(191) NOT NULL,
                country VARCHAR(80) NOT NULL DEFAULT \'Ghana\',
                region VARCHAR(120) NULL,
                district VARCHAR(160) NULL,
                city VARCHAR(160) NULL,
                area VARCHAR(160) NULL,
                description VARCHAR(500) NULL,
                latitude DECIMAL(10,7) NULL,
                longitude DECIMAL(10,7) NULL,
                created_at DATETIME(3) NOT NULL,
                updated_at DATETIME(3) NOT NULL,
                PRIMARY KEY (user_id)
            )'
        );
    } catch (Throwable $e) {
        if ($force) {
            throw $e;
        }
    }

    if (ds_table_exists('provider_profiles')) {
        foreach ([
            'district' => 'VARCHAR(160) NULL',
            'latitude' => 'DECIMAL(10,7) NULL',
            'longitude' => 'DECIMAL(10,7) NULL',
            'service_areas_json' => 'TEXT NULL',
            'service_regions_json' => 'TEXT NULL',
        ] as $column => $definition) {
            if (!ds_column_exists('provider_profiles', $column)) {
                try {
                    $pdo->exec('ALTER TABLE provider_profiles ADD COLUMN ' . $column . ' ' . $definition);
                } catch (Throwable $e) {
                    if ($force) {
                        throw $e;
                    }
                }
            }
        }
        if (function_exists('ds_flush_table_columns')) {
            ds_flush_table_columns('provider_profiles');
        }
    }

    $indexes = [
        'customer_locations_region_idx' => 'customer_locations (region)',
        'customer_locations_city_idx' => 'customer_locations (city)',
    ];
    if (ds_table_exists('provider_profiles')) {
        $indexes['provider_profiles_region_idx'] = 'provider_profiles (region)';
        $indexes['provider_profiles_city_idx'] = 'provider_profiles (city)';
    }
    foreach ($indexes as $name => $target) {
        try {
            $pdo->exec('CREATE INDEX ' . $name . ' ON ' . $target);
        } catch (Throwable $e) {
            // Already present, or the driver requires IF NOT EXISTS handling below.
        }
    }
    if ((string) $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite') {
        foreach (array_keys($indexes) as $name) {
            // SQLite's CREATE INDEX IF NOT EXISTS makes repeated CLI runs safe.
            $target = $indexes[$name];
            $pdo->exec('CREATE INDEX IF NOT EXISTS ' . $name . ' ON ' . $target);
        }
    }
    $done = true;
}
