<?php
declare(strict_types=1);

/**
 * CLI-only CMS/staff schema migration entry point for the deployed tree.
 *
 * Hostinger publishes `dist/` → `public_html`, which does NOT include the repo
 * `scripts/` directory. This file ships as `api/tools/migrate.php` so SSH can
 * run it from the live document root. HTTP access is blocked by api/.htaccess
 * (tools/) and by the PHP_SAPI guard below.
 *
 *   # Dry run (no writes):
 *   cd ~/domains/massagerstudio.com/public_html
 *   php api/tools/migrate.php
 *
 *   # Apply after a verified backup file exists on the host:
 *   php api/tools/migrate.php --apply --backup=/home/USER/backups/ms-YYYYMMDD.sql --confirm-production
 *
 * If DS_DB_PASS is missing from the SSH environment, the script prompts once
 * (TTY only). The password is never printed or written to disk.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    header('Content-Type: text/plain; charset=UTF-8');
    echo "This script only runs from the command line.\n";
    exit(1);
}

require_once dirname(__DIR__) . '/config/bootstrap.php';

$args = [];
foreach (array_slice($argv ?? [], 1) as $arg) {
    if (preg_match('/^--([a-z-]+)(?:=(.*))?$/', (string) $arg, $m)) {
        $args[$m[1]] = $m[2] ?? true;
    }
}

$apply = !empty($args['apply']);
$backup = trim((string) ($args['backup'] ?? ''));

function ds_tools_prompt_hidden(string $label): string
{
    if (function_exists('shell_exec')) {
        @shell_exec('stty -echo');
    }
    echo $label;
    $value = trim((string) fgets(STDIN));
    if (function_exists('shell_exec')) {
        @shell_exec('stty echo');
    }
    echo PHP_EOL;
    return $value;
}

$config = ds_config();
if (trim((string) ($config['db_pass'] ?? '')) === '') {
    if (!stream_isatty(STDIN)) {
        fwrite(STDERR, "Database password is not available to this shell.\n");
        fwrite(STDERR, "Set DS_DB_PASS privately for this command, or add db_pass to the out-of-tree config.\n");
        exit(4);
    }
    $dbPass = ds_tools_prompt_hidden('Database password (hidden, used for this run only): ');
    if ($dbPass === '') {
        fwrite(STDERR, "A database password is required.\n");
        exit(4);
    }
    putenv('DS_DB_PASS=' . $dbPass);
    unset($_ENV['DS_DB_PASS'], $_SERVER['DS_DB_PASS']);
    ds_config(true);
}

try {
    $pdo = ds_pdo();
    $pdo->query('SELECT 1');
} catch (Throwable $e) {
    fwrite(STDERR, "Could not connect to the database. Check credentials and try again.\n");
    exit(4);
}

$driver = (string) $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
$database = (string) ds_config()['db_name'];

echo "target: {$driver} / {$database}\n";
echo 'schema ready before: ' . (ds_cms_ready() ? 'yes' : 'no') . "\n";
echo 'staff_profiles before: ' . (ds_table_exists('staff_profiles') ? 'yes' : 'no') . "\n";

if (!$apply) {
    echo "dry run — nothing changed.\n";
    echo "apply with: php api/tools/migrate.php --apply --backup=/path/to/verified-dump.sql [--confirm-production]\n";
    exit(ds_cms_ready() && ds_table_exists('staff_profiles') ? 0 : 2);
}

if ($backup === '' || !is_file($backup) || !is_readable($backup) || filesize($backup) < 1) {
    fwrite(STDERR, "Refusing to migrate: pass --backup=<existing, non-empty dump file>.\n");
    exit(3);
}
if ((string) (ds_config()['app_env'] ?? '') === 'production' && empty($args['confirm-production'])) {
    fwrite(STDERR, "Refusing to migrate production without --confirm-production.\n");
    exit(4);
}
echo 'backup verified: ' . $backup . ' (' . filesize($backup) . " bytes)\n";

// Snapshot counts before schema writes so we can prove data preservation.
$preserve = [];
foreach (['users', 'bookings', 'cms_pages', 'cms_faqs', 'services', 'media_assets', 'provider_assignments', 'provider_assignment_events', 'admin_reversible_actions', 'customer_locations'] as $table) {
    if (ds_table_exists($table)) {
        try {
            $preserve[$table] = (int) $pdo->query('SELECT COUNT(*) AS c FROM `' . str_replace('`', '``', $table) . '`')->fetch()['c'];
        } catch (Throwable $e) {
            $preserve[$table] = -1;
        }
    } else {
        // New additive tables start empty; comparing 0 to 0 proves the migration
        // did not invent rows while still covering pre-existing assignment data.
        $preserve[$table] = 0;
    }
}
$roleCounts = [];
if (ds_table_exists('users')) {
    try {
        foreach ($pdo->query('SELECT role, COUNT(*) AS c FROM users GROUP BY role')->fetchAll() ?: [] as $row) {
            $roleCounts[(string) $row['role']] = (int) $row['c'];
        }
    } catch (Throwable $e) {
        $roleCounts = [];
    }
}
echo 'preserve_before: ' . json_encode(['counts' => $preserve, 'roles' => $roleCounts], JSON_UNESCAPED_SLASHES) . "\n";

ds_cms_migrate();

$problems = [];
if (!ds_cms_ready()) {
    $problems[] = 'core CMS tables are still missing';
}
foreach (['slot_id', 'provider_slot_key', 'team_slot_key', 'customer_slot_key'] as $column) {
    if (ds_table_exists('bookings') && !ds_column_exists('bookings', $column)) {
        $problems[] = "bookings.{$column} is missing";
    }
}
if (ds_table_exists('qa_accounts')) {
    $qaCount = (int) ($pdo->query('SELECT COUNT(*) AS c FROM qa_accounts')->fetch()['c'] ?? 0);
    echo "qa_accounts rows: {$qaCount}\n";
} else {
    $problems[] = 'qa_accounts is missing';
}

foreach (['staff_profiles', 'staff_invitations', 'customer_notes', 'privacy_requests', 'cms_announcements', 'provider_gallery_images', 'provider_moderation_events', 'provider_assignments', 'provider_assignment_events', 'admin_reversible_actions'] as $table) {
    if (!ds_table_exists($table)) {
        $problems[] = "{$table} is missing";
    } else {
        echo "{$table}: ok\n";
    }
}
if (!ds_table_exists('customer_locations')) {
    $problems[] = 'customer_locations is missing';
} else {
    echo "customer_locations: ok\n";
}
if (ds_table_exists('provider_profiles')) {
    foreach (['district', 'latitude', 'longitude', 'service_areas_json', 'service_regions_json'] as $column) {
        if (!ds_column_exists('provider_profiles', $column)) {
            $problems[] = "provider_profiles.{$column} is missing";
        }
    }
    echo "provider_profiles location columns: " . ($problems === [] ? 'ok' : 'check output') . "\n";
}
if (ds_table_exists('users') && !ds_column_exists('users', 'auth_epoch')) {
    $problems[] = 'users.auth_epoch is missing';
}
if (ds_table_exists('provider_profiles') && !ds_column_exists('provider_profiles', 'removed_at')) {
    $problems[] = 'provider_profiles.removed_at is missing';
}

if (ds_table_exists('media_assets') && !ds_column_exists('media_assets', 'alt_text')) {
    $problems[] = 'media_assets.alt_text is missing';
} elseif (ds_table_exists('media_assets')) {
    echo "media_assets.alt_text: ok\n";
}

$preserveAfter = [];
foreach ($preserve as $table => $before) {
    try {
        $after = (int) $pdo->query('SELECT COUNT(*) AS c FROM `' . str_replace('`', '``', $table) . '`')->fetch()['c'];
    } catch (Throwable $e) {
        $after = -1;
    }
    $preserveAfter[$table] = $after;
    if ($before >= 0 && $after !== $before) {
        $problems[] = "row count changed for {$table}: before={$before} after={$after}";
    }
}
$roleCountsAfter = [];
if (ds_table_exists('users')) {
    try {
        foreach ($pdo->query('SELECT role, COUNT(*) AS c FROM users GROUP BY role')->fetchAll() ?: [] as $row) {
            $roleCountsAfter[(string) $row['role']] = (int) $row['c'];
        }
    } catch (Throwable $e) {
        $roleCountsAfter = [];
    }
}
ksort($roleCounts);
ksort($roleCountsAfter);
if ($roleCounts !== $roleCountsAfter) {
    $problems[] = 'user role distribution changed during migration';
}
echo 'preserve_after: ' . json_encode(['counts' => $preserveAfter, 'roles' => $roleCountsAfter], JSON_UNESCAPED_SLASHES) . "\n";

$indexes = [];
try {
    if (ds_table_exists('bookings')) {
        $stmt = $driver === 'sqlite'
            ? $pdo->query("SELECT name FROM sqlite_master WHERE type = 'index'")
            : $pdo->query('SHOW INDEX FROM bookings');
        foreach ($stmt->fetchAll() ?: [] as $row) {
            $name = (string) ($row['Key_name'] ?? $row['name'] ?? '');
            if ($name !== '') {
                $indexes[$name] = true;
            }
        }
    }
} catch (Throwable $e) {
    $problems[] = 'could not read booking indexes: ' . $e->getMessage();
}
foreach (['bookings_provider_slot_uniq', 'bookings_team_slot_uniq', 'bookings_customer_slot_uniq'] as $index) {
    if (ds_table_exists('bookings') && !isset($indexes[$index])) {
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
