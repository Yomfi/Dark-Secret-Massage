<?php
declare(strict_types=1);

/**
 * Repeatable MySQL check for the CMS/booking migration.
 *
 * Usage (against a scratch database, never production):
 *   DS_DB_DRIVER=mysql DS_DB_HOST=127.0.0.1 DS_DB_USER=root DS_DB_PASS=... \
 *   DS_DB_NAME=ds_qa php scripts/qa/mysql-migration-check.php
 *
 * Prints the schema the migration produced so the run can be compared after a
 * second execution. Safe to run repeatedly; it only creates what is missing.
 */

require_once dirname(__DIR__, 2) . '/public/api/config/bootstrap.php';

ds_cms_migrate();

$pdo = ds_pdo();
$driver = (string) $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);

$tables = [];
$stmt = $pdo->query('SHOW TABLES');
foreach ($stmt->fetchAll(PDO::FETCH_NUM) as $row) {
    $tables[] = (string) $row[0];
}
sort($tables);

$bookingsColumns = [];
foreach ($pdo->query('SHOW COLUMNS FROM bookings')->fetchAll() as $row) {
    $bookingsColumns[(string) $row['Field']] = (string) $row['Type'];
}

$indexes = [];
foreach ($pdo->query('SHOW INDEX FROM bookings')->fetchAll() as $row) {
    $name = (string) $row['Key_name'];
    $indexes[$name][] = (string) $row['Column_name'];
}

$qaCount = 0;
if (in_array('qa_accounts', $tables, true)) {
    $qaCount = (int) ($pdo->query('SELECT COUNT(*) AS c FROM qa_accounts')->fetch()['c'] ?? 0);
}

echo json_encode([
    'driver' => $driver,
    'server' => $pdo->getAttribute(PDO::ATTR_SERVER_VERSION),
    'tables' => $tables,
    'bookingsColumns' => $bookingsColumns,
    'bookingIndexes' => $indexes,
    'qaAccounts' => $qaCount,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), PHP_EOL;
