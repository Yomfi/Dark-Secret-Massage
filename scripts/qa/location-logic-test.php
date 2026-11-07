<?php
declare(strict_types=1);

/**
 * Location discovery logic checks (CLI, local SQLite only).
 *
 *   php scripts/qa/location-logic-test.php
 *
 * Covers the Ghana region list, Haversine distance, service-area matching,
 * explicit-radius behaviour, private customer coordinates and the additive
 * schema. It never touches production.
 */

$dbPath = sys_get_temp_dir() . '/ms-location-test-' . bin2hex(random_bytes(5)) . '.sqlite';
$configPath = sys_get_temp_dir() . '/ms-location-test-config-' . bin2hex(random_bytes(5)) . '.php';
file_put_contents($configPath, "<?php return ['app_env' => 'development', 'db_driver' => 'sqlite', 'sqlite_path' => " . var_export($dbPath, true) . "];\n");
putenv('DS_CONFIG_PATH=' . $configPath);

require_once dirname(__DIR__, 2) . '/public/api/config/bootstrap.php';
require_once dirname(__DIR__, 2) . '/public/api/config/locations.php';
require_once dirname(__DIR__, 2) . '/public/api/config/discovery.php';

$pass = 0;
$fail = 0;
function check(string $label, $expected, $actual): void
{
    global $pass, $fail;
    if ($expected === $actual) {
        echo "  ok   {$label}\n";
        $pass++;
        return;
    }
    echo "  FAIL {$label} (expected " . var_export($expected, true) . ', got ' . var_export($actual, true) . ")\n";
    $fail++;
}

function cleanup(): void
{
    global $dbPath, $configPath;
    @unlink($dbPath);
    @unlink($configPath);
}

try {
    $pdo = ds_pdo();
    $pdo->exec('CREATE TABLE IF NOT EXISTS provider_profiles (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        user_id VARCHAR(191) NOT NULL,
        display_name VARCHAR(191) NOT NULL,
        region VARCHAR(120) NULL,
        city VARCHAR(160) NULL,
        area_neighbourhood VARCHAR(160) NULL,
        country VARCHAR(80) NULL,
        service_area TEXT NULL,
        business_address VARCHAR(512) NULL,
        service_radius_km REAL NULL,
        service_setting_json TEXT NULL
    )');

    ds_location_ensure_schema(true);

    echo "Schema\n";
    check('customer_locations table created', true, ds_table_exists('customer_locations'));
    foreach (['district', 'latitude', 'longitude', 'service_areas_json', 'service_regions_json'] as $column) {
        check("provider_profiles.{$column} added", true, ds_column_exists('provider_profiles', $column));
    }

    echo "Region validation\n";
    check('Ashanti is valid', true, ds_location_region_valid('Ashanti'));
    check('Western North is valid', true, ds_location_region_valid('Western North'));
    check('16 regions', 16, count(ds_ghana_regions()));
    check('unknown region rejected', false, ds_location_region_valid('Atlantis'));

    echo "Distance\n";
    $accraKumasi = ds_haversine_km(5.6037, -0.1870, 6.6885, -1.6244);
    check('Accra–Kumasi is about 200 km', true, $accraKumasi > 190 && $accraKumasi < 215);
    $same = ds_haversine_km(5.6037, -0.1870, 5.6037, -0.1870);
    check('same point is zero', 0.0, $same);

    $profile = [
        'id' => 'profile-1',
        'user_id' => 'provider-1',
        'display_name' => 'Ama',
        'provider_type' => 'individual',
        'region' => 'Greater Accra',
        'city' => 'Accra',
        'area_neighbourhood' => 'East Legon',
        'country' => 'Ghana',
        'latitude' => 5.6350,
        'longitude' => -0.1560,
        'service_radius_km' => 20,
        'service_setting_json' => json_encode(['studio', 'home_visit']),
        'service_areas_json' => json_encode([
            ['region' => 'Greater Accra', 'district' => 'Accra Metropolitan', 'city' => 'Accra', 'area' => 'Cantonments', 'radiusKm' => 10, 'latitude' => 5.5800, 'longitude' => -0.1700],
        ]),
        'service_regions_json' => json_encode(['Greater Accra']),
    ];

    echo "Service-area matching\n";
    $nearby = ds_provider_location_match($profile, [
        'region' => 'Greater Accra', 'city' => 'Accra', 'area' => 'Cantonments',
        'latitude' => 5.5800, 'longitude' => -0.1700,
    ]);
    check('nearby target is eligible', true, $nearby['eligible']);
    check('coordinate distance is reported', 'coordinates', $nearby['precision']);
    check('distance is positive', true, $nearby['distanceKm'] !== null && $nearby['distanceKm'] > 0);

    $farRegion = ds_provider_location_match($profile, [
        'region' => 'Ashanti', 'city' => 'Kumasi', 'area' => '', 'latitude' => 6.6885, 'longitude' => -1.6244,
    ]);
    check('outside service region is not eligible', false, $farRegion['eligible']);

    $tightRadius = ds_provider_location_match($profile, [
        'region' => 'Greater Accra', 'city' => 'Accra', 'area' => 'Cantonments',
        'latitude' => 5.5800, 'longitude' => -0.1700,
    ], 1.0);
    check('explicit 1 km radius excludes a farther match', false, $tightRadius['eligible']);

    $localityOnly = ds_provider_location_match($profile, [
        'region' => 'Greater Accra', 'city' => 'Accra', 'area' => 'Cantonments',
        'latitude' => null, 'longitude' => null,
    ]);
    check('locality match works without coordinates', true, $localityOnly['eligible']);
    check('no fabricated distance without coordinates', null, $localityOnly['distanceKm']);

    $noRadius = ds_provider_location_match($profile, [
        'region' => 'Greater Accra', 'city' => 'Accra', 'area' => 'Cantonments',
        'latitude' => 5.5800, 'longitude' => -0.1700,
    ], 500.0);
    check('wide radius includes a covered match', true, $noRadius['eligible']);

    check('home visits detected', true, ds_provider_offers_home_visit($profile));
    check('studio detected', true, ds_provider_offers_studio($profile));

    echo "Customer privacy\n";
    $saved = ds_save_customer_location('customer-1', [
        'country' => 'Ghana', 'region' => 'Greater Accra', 'district' => 'Accra Metropolitan',
        'city' => 'Accra', 'area' => 'Osu', 'description' => 'Near the junction',
        'latitude' => 5.558, 'longitude' => -0.177,
    ]);
    check('customer location saved', 'Osu', $saved['area'] ?? null);
    $ownerDto = ds_customer_location_dto($saved, true);
    check('owner sees coordinates', true, isset($ownerDto['latitude'], $ownerDto['longitude']));
    $publicDto = ds_customer_location_dto($saved, false);
    check('coordinates omitted by default', false, array_key_exists('latitude', $publicDto));

    $target = ds_discovery_target_from_customer_row($saved);
    check('saved location becomes a search target', 'Accra', $target['city'] ?? null);

    echo "Provider-managed service areas\n";
    $areas = ds_location_service_areas_validate([
        ['region' => 'Greater Accra', 'city' => 'Accra', 'area' => 'Spintex', 'radiusKm' => 8],
        ['region' => 'Ashanti', 'city' => 'Kumasi', 'area' => '', 'radiusKm' => 15],
    ]);
    check('two service areas accepted', 2, count($areas));
    check('service-area radius kept', 8.0, $areas[0]['radiusKm']);

    echo "\n{$pass} passed, {$fail} failed\n";
    cleanup();
    exit($fail === 0 ? 0 : 1);
} catch (Throwable $e) {
    fwrite(STDERR, 'TEST_ERROR: ' . get_class($e) . ': ' . $e->getMessage() . "\n");
    cleanup();
    exit(2);
}
