<?php
/**
 * Copy to config.local.php on the server (never commit config.local.php).
 * Or set the same keys as environment variables in Hostinger.
 */
return [
    // MySQL — password only on Hostinger, never in Git
    'db_host' => 'localhost',
    'db_port' => 3306,
    'db_name' => 'u190513960_darksecret',
    'db_user' => 'u190513960_darksecret',
    'db_pass' => 'REPLACE_WITH_HOSTINGER_DB_PASSWORD',

    // Session cookie
    'session_name' => 'ds_session',
    'cookie_secure' => true,      // true on HTTPS production
    'cookie_samesite' => 'Lax',
    'cookie_path' => '/',
    'session_lifetime' => 60 * 60 * 24 * 30, // 30 days

    // App
    'app_env' => 'production',    // production | development
    'app_url' => 'https://dartscret.havensnet.com',
];
