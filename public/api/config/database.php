<?php
declare(strict_types=1);

function ds_pdo(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $cfg = ds_config();
    if (($cfg['db_pass'] ?? '') === '' || ($cfg['db_pass'] ?? '') === 'REPLACE_WITH_HOSTINGER_DB_PASSWORD') {
        ds_error(500, 'CONFIG_ERROR', 'Database is not configured.');
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        $cfg['db_host'],
        (int) $cfg['db_port'],
        $cfg['db_name']
    );

    try {
        $pdo = new PDO($dsn, $cfg['db_user'], $cfg['db_pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } catch (Throwable $e) {
        if (!ds_is_prod()) {
            ds_error(500, 'DB_CONNECTION_FAILED', 'Database connection failed.', $e->getMessage());
        }
        ds_error(500, 'DB_CONNECTION_FAILED', 'Database connection failed.');
    }

    return $pdo;
}
