<?php
declare(strict_types=1);

/**
 * Explicit, repeatable database migration. Never invoked by an HTTP request.
 *
 *   1. Back up the database first (hPanel → Databases → Export, or
 *      `mysqldump --single-transaction ... > backup.sql`).
 *   2. Read what would run:      php scripts/migrate.php
 *   3. Apply:                    php scripts/migrate.php --apply
 *
 * The migration is additive and idempotent: tables, columns and indexes are
 * created only when missing, so a second run changes nothing.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This script only runs from the command line.\n");
}

require_once dirname(__DIR__) . '/public/api/config/bootstrap.php';

$apply = in_array('--apply', $argv ?? [], true);
$pdo = ds_pdo();
$driver = (string) $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
$database = (string) ds_config()['db_name'];

echo "target: {$driver} / {$database}\n";
echo 'schema ready before: ' . (ds_cms_ready() ? 'yes' : 'no') . "\n";

if (!$apply) {
    echo "dry run — nothing changed. Re-run with --apply after taking a backup.\n";
    exit(ds_cms_ready() ? 0 : 2);
}

ds_cms_migrate();

$problems = [];
if (!ds_cms_ready()) {
    $problems[] = 'core CMS tables are still missing';
}
foreach (['slot_id', 'provider_slot_key', 'team_slot_key', 'customer_slot_key'] as $column) {
    if (!ds_column_exists('bookings', $column)) {
        $problems[] = "bookings.{$column} is missing";
    }
}
if (ds_table_exists('qa_accounts')) {
    $qaCount = (int) (ds_pdo()->query('SELECT COUNT(*) AS c FROM qa_accounts')->fetch()['c'] ?? 0);
    echo "qa_accounts rows: {$qaCount}\n";
} else {
    $problems[] = 'qa_accounts is missing';
}

$indexes = [];
try {
    $stmt = $driver === 'sqlite'
        ? $pdo->query("SELECT name FROM sqlite_master WHERE type = 'index'")
        : $pdo->query('SHOW INDEX FROM bookings');
    foreach ($stmt->fetchAll() ?: [] as $row) {
        $name = (string) ($row['Key_name'] ?? $row['name'] ?? '');
        if ($name !== '') {
            $indexes[$name] = true;
        }
    }
} catch (Throwable $e) {
    $problems[] = 'could not read booking indexes: ' . $e->getMessage();
}
foreach (['bookings_provider_slot_uniq', 'bookings_team_slot_uniq', 'bookings_customer_slot_uniq'] as $index) {
    if (!isset($indexes[$index])) {
        $problems[] = "unique index {$index} is missing";
    }
}

echo 'schema ready after: ' . (ds_cms_ready() ? 'yes' : 'no') . "\n";
if ($problems !== []) {
    echo "MIGRATION_INCOMPLETE\n";
    foreach ($problems as $problem) {
        echo " - {$problem}\n";
    }
    exit(1);
}

echo "MIGRATION_OK\n";
exit(0);
