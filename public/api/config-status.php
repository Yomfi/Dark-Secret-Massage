<?php
declare(strict_types=1);

/**
 * Temporary diagnostic endpoint — no secrets in output.
 * Uses the same bootstrap / ds_config() as auth endpoints.
 */
require_once __DIR__ . '/config/bootstrap.php';

ds_require_method('GET');

$configLocalPath = __DIR__ . '/config/config.local.php';
$configLocalExists = is_file($configLocalPath);
$configLocalReadable = $configLocalExists && is_readable($configLocalPath);

$envDbPass = getenv('DS_DB_PASS');
$envDbPassPresent = !($envDbPass === false || $envDbPass === '');

$cfg = ds_config();
$dbPass = (string) ($cfg['db_pass'] ?? '');
$effectiveDbPassPresent =
    $dbPass !== '' && $dbPass !== 'REPLACE_WITH_HOSTINGER_DB_PASSWORD';

ds_json([
    'success' => true,
    'config_local_exists' => $configLocalExists,
    'config_local_readable' => $configLocalReadable,
    'env_db_pass_present' => $envDbPassPresent,
    'effective_db_pass_present' => $effectiveDbPassPresent,
    'config_local_path' => $configLocalPath,
]);
