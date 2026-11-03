<?php
declare(strict_types=1);

/**
 * Explicit, repeatable database migration. Never invoked by an HTTP request.
 *
 * Local / repo checkout:
 *   1. Back up first (mysqldump or hPanel export).
 *   2. Dry run:  php scripts/migrate.php
 *   3. Apply:    php scripts/migrate.php --apply --backup=/path/to/dump.sql
 *
 * Deployed Hostinger tree (dist/ → public_html) does NOT include scripts/.
 * Use the CLI-only twin that ships inside the API tools directory (HTTP denied):
 *   cd ~/domains/massagerstudio.com/public_html
 *   php api/tools/migrate.php
 *   php api/tools/migrate.php --apply --backup=/home/USER/backups/ms-YYYYMMDD.sql --confirm-production
 *
 * The migration is additive and idempotent: tables, columns and indexes are
 * created only when missing, so a second run changes nothing.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This script only runs from the command line.\n");
}

require_once dirname(__DIR__) . '/public/api/config/bootstrap.php';

$args = [];
foreach (array_slice($argv ?? [], 1) as $arg) {
    if (preg_match('/^--([a-z-]+)(?:=(.*))?$/', (string) $arg, $m)) {
        $args[$m[1]] = $m[2] ?? true;
    }
}
$apply = !empty($args['apply']);
$backup = trim((string) ($args['backup'] ?? ''));
$pdo = ds_pdo();
$driver = (string) $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
$database = (string) ds_config()['db_name'];

echo "target: {$driver} / {$database}\n";
echo 'schema ready before: ' . (ds_cms_ready() ? 'yes' : 'no') . "\n";

if (!$apply) {
    echo "dry run — nothing changed.\n";
    echo "apply with: php scripts/migrate.php --apply --backup=/path/to/verified-dump.sql\n";
    exit(ds_cms_ready() ? 0 : 2);
}

// A verified dump must exist before any schema write. This cannot undo an
// earlier unbacked deploy, but it prevents another one.
if ($backup === '' || !is_file($backup) || !is_readable($backup) || filesize($backup) < 1) {
    fwrite(STDERR, "Refusing to migrate: pass --backup=<existing, non-empty dump file>.\n");
    exit(3);
}
if ((string) (ds_config()['app_env'] ?? '') === 'production' && empty($args['confirm-production'])) {
    fwrite(STDERR, "Refusing to migrate production without --confirm-production.\n");
    exit(4);
}
echo 'backup verified: ' . $backup . ' (' . filesize($backup) . " bytes)\n";

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

foreach (['staff_profiles', 'staff_invitations', 'customer_notes', 'privacy_requests', 'cms_announcements'] as $table) {
    if (!ds_table_exists($table)) {
        $problems[] = "{$table} is missing";
    } else {
        echo "{$table}: ok\n";
    }
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
