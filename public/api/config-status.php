<?php
declare(strict_types=1);

/**
 * Temporary diagnostic: safe boolean status for DB config loading.
 * Uses the same bootstrap / ds_config() path as auth/register.php.
 * Does not expose secrets or credential values.
 */

require_once __DIR__ . '/config/bootstrap.php';

ds_require_method('GET');

// Same path bootstrap resolves: public/api/config/config.local.php
$localFile = __DIR__ . '/config/config.local.php';
$configLocalExists = is_file($localFile);
$configLocalReadable = $configLocalExists && is_readable($localFile);

$envDbPass = getenv('DS_DB_PASS');
$envDbPassPresent = ($envDbPass !== false && $envDbPass !== '');

$cfg = ds_config();

$dbPass = (string) ($cfg['db_pass'] ?? '');
$effectiveDbPassPresent = ($dbPass !== '' && $dbPass !== 'REPLACE_WITH_HOSTINGER_DB_PASSWORD');

$dbHostPresent = trim((string) ($cfg['db_host'] ?? '')) !== '';
$dbNamePresent = trim((string) ($cfg['db_name'] ?? '')) !== '';
$dbUserPresent = trim((string) ($cfg['db_user'] ?? '')) !== '';

// Flat JSON (not nested under data) — diagnostic only; no secrets.
ds_json([
    'success' => true,
    'config_local_exists' => $configLocalExists,
    'config_local_readable' => $configLocalReadable,
    'env_db_pass_present' => $envDbPassPresent,
    'effective_db_pass_present' => $effectiveDbPassPresent,
    'db_host_present' => $dbHostPresent,
    'db_name_present' => $dbNamePresent,
    'db_user_present' => $dbUserPresent,
]);
