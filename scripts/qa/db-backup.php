<?php
declare(strict_types=1);

/**
 * CLI MySQL logical backup with a self-check manifest. Run on the production
 * host only; it reads credentials through the application bootstrap and never
 * prints them.
 *
 *   php db-backup.php /home/USER/backups/ms-YYYYMMDD-HHMMSS.sql
 *
 * Exit 0 means: every base table has a CREATE statement, every dumped INSERT
 * count matches the live row count, and the file hash was recorded.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit(1);
}

$out = $argv[1] ?? '';
if ($out === '' || !str_starts_with($out, '/')) {
    fwrite(STDERR, "Usage: php db-backup.php /absolute/path/backup.sql\n");
    exit(2);
}

$appRoot = rtrim((string) (getenv('DS_APP_ROOT') ?: dirname(__DIR__)), '/');
$bootstrap = is_file($appRoot . '/api/config/bootstrap.php')
    ? $appRoot . '/api/config/bootstrap.php'
    : $appRoot . '/public/api/config/bootstrap.php';
require_once $bootstrap;

try {
    $pdo = ds_pdo();
    $driver = (string) $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
    if ($driver !== 'mysql') {
        fwrite(STDERR, "This backup tool expects MySQL, got {$driver}.\n");
        exit(2);
    }

    $tables = [];
    foreach ($pdo->query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'")->fetchAll(PDO::FETCH_NUM) as $row) {
        $tables[] = (string) $row[0];
    }
    sort($tables);
    if ($tables === []) {
        fwrite(STDERR, "No tables found; refusing to create an empty backup.\n");
        exit(2);
    }

    $tmp = $out . '.partial';
    $fh = fopen($tmp, 'wb');
    if ($fh === false) {
        fwrite(STDERR, "Cannot write {$tmp}\n");
        exit(2);
    }

    fwrite($fh, "-- Massager Studio logical backup\n");
    fwrite($fh, '-- Generated: ' . gmdate('c') . "\n");
    fwrite($fh, "SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\nSET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';\n\n");

    $manifest = ['tables' => [], 'triggers' => []];
    foreach ($tables as $table) {
        $createStmt = $pdo->query('SHOW CREATE TABLE `' . str_replace('`', '``', $table) . '`');
        $createRow = $createStmt->fetch(PDO::FETCH_NUM);
        $createSql = (string) ($createRow[1] ?? '');
        if ($createSql === '') {
            throw new RuntimeException("Missing CREATE TABLE for {$table}");
        }

        fwrite($fh, "\n-- Table `{$table}`\nDROP TABLE IF EXISTS `{$table}`;\n{$createSql};\n");

        $stmt = $pdo->query('SELECT * FROM `' . str_replace('`', '``', $table) . '`');
        $columns = null;
        $rows = 0;
        while (($row = $stmt->fetch(PDO::FETCH_ASSOC)) !== false) {
            if ($columns === null) {
                $columns = array_keys($row);
            }
            $values = [];
            foreach ($columns as $column) {
                $value = $row[$column] ?? null;
                $values[] = $value === null ? 'NULL' : $pdo->quote((string) $value);
            }
            fwrite(
                $fh,
                'INSERT INTO `' . $table . '` (`' . implode('`, `', $columns) . '`) VALUES (' . implode(', ', $values) . ");\n"
            );
            $rows++;
        }
        if ($columns === null) {
            $columns = array_column($pdo->query('SHOW COLUMNS FROM `' . $table . '`')->fetchAll(PDO::FETCH_ASSOC), 'Field');
            if ($columns !== []) {
                fwrite($fh, '-- (table is empty; ' . count($columns) . " columns)\n");
            }
        }

        $checksum = null;
        try {
            $cs = $pdo->query('CHECKSUM TABLE `' . $table . '`')->fetch(PDO::FETCH_NUM);
            $checksum = $cs[1] ?? null;
        } catch (Throwable $e) {
            $checksum = null;
        }
        $manifest['tables'][$table] = ['rows' => $rows, 'checksum' => $checksum];
    }

    try {
        foreach ($pdo->query('SHOW TRIGGERS')->fetchAll(PDO::FETCH_ASSOC) as $trigger) {
            $name = (string) ($trigger['Trigger'] ?? '');
            if ($name === '') {
                continue;
            }
            $row = $pdo->query('SHOW CREATE TRIGGER `' . str_replace('`', '``', $name) . '`')->fetch(PDO::FETCH_ASSOC);
            if (!empty($row['SQL Original Statement'])) {
                fwrite($fh, "\nDELIMITER ;;\n" . $row['SQL Original Statement'] . " ;;\nDELIMITER ;\n");
                $manifest['triggers'][] = $name;
            }
        }
    } catch (Throwable $e) {
        // Triggers are optional; the manifest notes that none were captured.
    }

    fwrite($fh, "\nSET FOREIGN_KEY_CHECKS=1;\n");
    fclose($fh);
    rename($tmp, $out);
    @chmod($out, 0600);

    // Verify the finished file against the live database.
    $problems = [];
    $sql = (string) file_get_contents($out);
    if (strlen($sql) < 100) {
        $problems[] = 'backup file is implausibly small';
    }
    $liveCounts = [];
    foreach ($tables as $table) {
        $liveCounts[$table] = (int) $pdo->query('SELECT COUNT(*) AS c FROM `' . str_replace('`', '``', $table) . '`')->fetch()['c'];
        if (!str_contains($sql, 'CREATE TABLE `' . $table . '`')) {
            $problems[] = "missing CREATE TABLE for {$table}";
        }
        $dumpRows = (int) ($manifest['tables'][$table]['rows'] ?? -1);
        if ($dumpRows !== $liveCounts[$table]) {
            $problems[] = "row mismatch for {$table}: dump={$dumpRows} live={$liveCounts[$table]}";
        }
        if (!str_contains($sql, 'INSERT INTO `' . $table . '`') && $liveCounts[$table] > 0) {
            $problems[] = "missing INSERT data for {$table}";
        }
    }

    $manifest['file'] = $out;
    $manifest['bytes'] = filesize($out);
    $manifest['sha256'] = hash_file('sha256', $out);
    $manifest['generated_at'] = gmdate('c');
    $manifest['verified'] = $problems === [];
    file_put_contents($out . '.manifest.json', json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");

    echo 'backup: ' . $out . ' (' . filesize($out) . " bytes)\n";
    echo 'sha256: ' . $manifest['sha256'] . "\n";
    echo 'tables: ' . count($tables) . ' — ' . implode(', ', array_map(
        static fn(string $t): string => $t . '=' . $liveCounts[$t],
        $tables
    )) . "\n";
    if ($problems !== []) {
        echo "BACKUP_INVALID\n - " . implode("\n - ", $problems) . "\n";
        exit(1);
    }
    echo "BACKUP_VERIFIED\n";
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, 'BACKUP_ERROR: ' . $e->getMessage() . "\n");
    if (isset($tmp) && is_string($tmp)) {
        @unlink($tmp);
    }
    exit(1);
}
