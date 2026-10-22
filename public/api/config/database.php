<?php
declare(strict_types=1);

function ds_pdo(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $cfg = ds_config();
    $driver = strtolower((string) ($cfg['db_driver'] ?? 'mysql'));

    try {
        if ($driver === 'sqlite') {
            $path = (string) ($cfg['sqlite_path'] ?? '');
            if ($path === '') {
                ds_error(500, 'CONFIG_ERROR', 'Database is not configured.');
            }
            $dir = dirname($path);
            if (!is_dir($dir)) {
                @mkdir($dir, 0700, true);
            }
            $pdo = new PDO('sqlite:' . $path, null, null, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
            $pdo->exec('PRAGMA foreign_keys = ON');
        } else {
            if (($cfg['db_pass'] ?? '') === '' || ($cfg['db_pass'] ?? '') === 'REPLACE_WITH_HOSTINGER_DB_PASSWORD') {
                ds_error(500, 'CONFIG_ERROR', 'Database is not configured.');
            }
            $dsn = sprintf(
                'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
                $cfg['db_host'],
                (int) $cfg['db_port'],
                $cfg['db_name']
            );
            $pdo = new PDO($dsn, $cfg['db_user'], $cfg['db_pass'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        }
    } catch (Throwable $e) {
        if (!ds_is_prod()) {
            ds_error(500, 'DB_CONNECTION_FAILED', 'Database connection failed.', $e->getMessage());
        }
        ds_error(500, 'DB_CONNECTION_FAILED', 'Database connection failed.');
    }

    return $pdo;
}

/** @return array<string, true> */
function ds_users_columns(): array
{
    static $cols = null;
    if ($cols !== null) {
        return $cols;
    }

    $pdo = ds_pdo();
    $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
    $cols = [];

    if ($driver === 'sqlite') {
        $rows = $pdo->query('PRAGMA table_info(users)')->fetchAll();
        foreach ($rows as $row) {
            $cols[(string) $row['name']] = true;
        }
    } else {
        $rows = $pdo->query('SHOW COLUMNS FROM users')->fetchAll();
        foreach ($rows as $row) {
            $cols[(string) $row['Field']] = true;
        }
    }

    return $cols;
}

function ds_table_exists(string $table): bool
{
    $pdo = ds_pdo();
    $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
    if ($driver === 'sqlite') {
        $stmt = $pdo->prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name = ?"
        );
        $stmt->execute([$table]);
        return (bool) $stmt->fetch();
    }

    $stmt = $pdo->prepare(
        'SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1'
    );
    $stmt->execute([$table]);
    return (bool) $stmt->fetch();
}

/** @return array<string, true> */
function ds_table_columns(string $table): array
{
    static $cache = [];
    if (isset($cache[$table])) {
        return $cache[$table];
    }

    $pdo = ds_pdo();
    $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
    $cols = [];

    if ($driver === 'sqlite') {
        $rows = $pdo->query('PRAGMA table_info(' . str_replace('`', '', $table) . ')')->fetchAll();
        foreach ($rows as $row) {
            $cols[(string) $row['name']] = true;
        }
    } else {
        $stmt = $pdo->prepare(
            'SELECT COLUMN_NAME FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = ?'
        );
        $stmt->execute([$table]);
        foreach ($stmt->fetchAll() as $row) {
            $cols[(string) $row['COLUMN_NAME']] = true;
        }
    }

    $cache[$table] = $cols;
    return $cols;
}

function ds_column_exists(string $table, string $column): bool
{
    $cols = ds_table_columns($table);
    return isset($cols[$column]);
}
