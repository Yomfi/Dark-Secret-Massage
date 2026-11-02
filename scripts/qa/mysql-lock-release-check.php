<?php
declare(strict_types=1);

/**
 * MySQL advisory-lock ordering and release checks.
 *
 * Proves that writers take keys in one deterministic order, that a second
 * connection is excluded while the lock is held, and that every exit path —
 * success, a validation result, and an exception — releases what it acquired.
 *
 *   DS_DB_DRIVER=mysql DS_DB_HOST=127.0.0.1 DS_DB_PORT=3306 \
 *   DS_DB_USER=root DS_DB_PASS=... DS_DB_NAME=ds_qa \
 *   php scripts/qa/mysql-lock-release-check.php
 */

require_once dirname(__DIR__, 2) . '/public/api/config/bootstrap.php';

if (ds_pdo()->getAttribute(PDO::ATTR_DRIVER_NAME) !== 'mysql') {
    fwrite(STDOUT, "SKIP: advisory locks are MySQL-only.\n");
    exit(0);
}

$pass = 0;
$fail = 0;
function check(string $label, bool $ok, string $detail = ''): void
{
    global $pass, $fail;
    if ($ok) {
        $pass++;
        fwrite(STDOUT, "PASS {$label}\n");
        return;
    }
    $fail++;
    fwrite(STDOUT, "FAIL {$label}" . ($detail !== '' ? " ({$detail})" : '') . "\n");
}

// 1. Deterministic order regardless of call-site order.
$plan = ds_booking_lock_plan(['team-day:t:2', 'prov:z', 'customer-day:c:1', 'prov:z']);
$sorted = $plan;
sort($sorted, SORT_STRING);
check('lock plan is sorted', $plan === $sorted, implode(',', $plan));
check('lock plan is de-duplicated', count($plan) === count(array_unique($plan)));
check('empty keys are dropped', ds_booking_lock_plan(['', 'a']) === ['a']);

$key = ds_booking_lock_key(null, '2099-01-01', 'lock-release-' . bin2hex(random_bytes(4)));
$free = static function (string $k): bool {
    $stmt = ds_pdo()->prepare('SELECT IS_FREE_LOCK(?) AS free_now');
    $stmt->execute([$k]);
    return (int) ($stmt->fetch()['free_now'] ?? 0) === 1;
};

$config = ds_config();
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
    (string) $config['db_host'],
    (int) $config['db_port'],
    (string) $config['db_name']
);
$other = new PDO($dsn, (string) $config['db_user'], (string) $config['db_pass'], [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

// 2. Held during the callback, and a second connection cannot take it.
$held = null;
$blocked = null;
$result = ds_run_booking_write([$key], function () use ($key, $other, &$held, &$blocked): array {
    $stmt = ds_pdo()->prepare('SELECT IS_USED_LOCK(?) AS holder');
    $stmt->execute([$key]);
    $held = $stmt->fetch()['holder'] ?? null;
    $otherStmt = $other->prepare('SELECT GET_LOCK(?, 0) AS got');
    $otherStmt->execute([$key]);
    $blocked = (int) ($otherStmt->fetch()['got'] ?? 0) === 0;
    return ['ok' => true];
});
check('lock is held inside the write', $held !== null);
check('a second connection is excluded', $blocked === true);
check('success releases the lock', $free($key));
check('write result is returned', ($result['ok'] ?? false) === true);

// 3. A validation-style early return still releases.
$conflict = ds_run_booking_write([$key], static fn (): array => ['conflict' => ['code' => 'SLOT_UNAVAILABLE']]);
check('validation failure returns its result', isset($conflict['conflict']));
check('validation failure releases the lock', $free($key));

// 4. An exception still releases and propagates.
$threw = false;
try {
    ds_run_booking_write([$key], static function (): void {
        throw new RuntimeException('qa lock release');
    });
} catch (RuntimeException $e) {
    $threw = $e->getMessage() === 'qa lock release';
}
check('exception propagates', $threw);
check('exception releases the lock', $free($key));

// 5. Partial acquisition failure releases anything already taken.
// Hold the sorted-first key on another connection, then ask for both.
$first = ds_booking_lock_plan([$key, $key . ':second'])[0];
$second = $first === $key ? $key . ':second' : $key;
$other->prepare('SELECT GET_LOCK(?, 5)')->execute([$first]);
$short = ds_run_booking_write([$first, $second], static fn (): array => ['ok' => true]);
check('blocked acquisition reports a timeout', ($short['lock_timeout'] ?? false) === true);
$other->prepare('SELECT RELEASE_LOCK(?)')->execute([$first]);
check('blocked acquisition holds nothing', $free($second));

fwrite(STDOUT, "\n{$pass} passed, {$fail} failed\n");
if ($fail > 0) {
    exit(1);
}
fwrite(STDOUT, "LOCK_RELEASE_OK\n");
