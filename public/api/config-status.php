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

$envDbPass = ds_env('DS_DB_PASS');
$envDbPassPresent = ($envDbPass !== false && $envDbPass !== '');

$cfg = ds_config();

$dbPass = (string) ($cfg['db_pass'] ?? '');
$effectiveDbPassPresent = ($dbPass !== '' && $dbPass !== 'REPLACE_WITH_HOSTINGER_DB_PASSWORD');

$dbHostPresent = trim((string) ($cfg['db_host'] ?? '')) !== '';
$dbNamePresent = trim((string) ($cfg['db_name'] ?? '')) !== '';
$dbUserPresent = trim((string) ($cfg['db_user'] ?? '')) !== '';

// Mail transport status: booleans and missing key *names* only, never values.
$mailConfigured = ds_mail_configured();
$mailMissing = ds_mail_missing_settings();

// Flat JSON (not nested under data) — diagnostic only; no secrets.
ds_json([
    'success' => true,
    'mail_configured' => $mailConfigured,
    'mail_transport' => (string) (ds_config()['mail_transport'] ?? 'smtp'),
    'mail_missing_keys' => array_values($mailMissing),
    'config_local_exists' => $configLocalExists,
    'config_local_readable' => $configLocalReadable,
    // Deploy-safety diagnostics: labels and booleans only, never paths or values.
    'config_candidates' => ds_config_candidates_status(),
    'config_loaded_sources' => ds_config_loaded_sources(),
    'mail_key_source' => [
        'smtp_host' => ds_config_key_source('smtp_host'),
        'smtp_user' => ds_config_key_source('smtp_user'),
        'smtp_pass' => ds_config_key_source('smtp_pass'),
        'mail_from' => ds_config_key_source('mail_from'),
    ],
    'env_db_pass_present' => $envDbPassPresent,
    'effective_db_pass_present' => $effectiveDbPassPresent,
    'mail_env_sources' => [
        'smtp_host' => ['getenv' => getenv('DS_SMTP_HOST') !== false, 'env' => isset($_ENV['DS_SMTP_HOST']), 'server' => isset($_SERVER['DS_SMTP_HOST'])],
        'smtp_user' => ['getenv' => getenv('DS_SMTP_USER') !== false, 'env' => isset($_ENV['DS_SMTP_USER']), 'server' => isset($_SERVER['DS_SMTP_USER'])],
        'smtp_pass' => ['getenv' => getenv('DS_SMTP_PASS') !== false, 'env' => isset($_ENV['DS_SMTP_PASS']), 'server' => isset($_SERVER['DS_SMTP_PASS'])],
        'db_pass' => ['getenv' => getenv('DS_DB_PASS') !== false, 'env' => isset($_ENV['DS_DB_PASS']), 'server' => isset($_SERVER['DS_DB_PASS'])],
    ],
    'db_host_present' => $dbHostPresent,
    'db_name_present' => $dbNamePresent,
    'db_user_present' => $dbUserPresent,
]);
