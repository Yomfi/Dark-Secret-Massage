<?php
declare(strict_types=1);

/**
 * Behavioural check for booking overlap, cancellation release and the UNIQUE
 * slot keys that stop two concurrent requests taking the same slot.
 *
 * Runs against a scratch MySQL/SQLite database. Creates only rows prefixed
 * `QATEST` and removes them afterwards.
 */

require_once dirname(__DIR__, 2) . '/public/api/config/bootstrap.php';

ds_cms_migrate();

$pdo = ds_pdo();
$results = [];
$check = static function (string $name, bool $ok, string $detail = '') use (&$results): void {
    $results[] = ['check' => $name, 'ok' => $ok, 'detail' => $detail];
};

$cleanup = static function () use ($pdo): void {
    $pdo->prepare("DELETE FROM bookings WHERE customer_user_id LIKE 'QATEST%' OR provider_profile_id LIKE 'QATEST%'")->execute();
};
$cleanup();

$date = date('Y-m-d', strtotime('+3 days'));
$now = ds_now_sql();
$insert = static function (string $id, string $date, string $slotId, int $duration) use ($pdo, $now): void {
    $slot = ds_booking_slot_definition($slotId);
    $pdo->prepare(
        'INSERT INTO bookings (id, reference, customer_user_id, provider_profile_id, team_member_id, service_id,
            service_name, duration_minutes, price, currency, status, scheduled_at, time_slot, slot_id,
            provider_slot_key, team_slot_key, customer_slot_key, location_type, created_at, updated_at)
         VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, 0, \'GHS\', \'pending\', ?, ?, ?, ?, NULL, ?, \'studio\', ?, ?)'
    )->execute([
        $id,
        'QATEST' . strtoupper(substr($id, 0, 6)),
        'QATEST-customer',
        'QATEST-provider',
        'QA test service',
        $duration,
        $date . 'T00:00:00',
        $slot['label'] . ' (' . $slot['start'] . '–' . $slot['end'] . ')',
        $slotId,
        ds_booking_slot_key('provider', 'QATEST-provider', $date, $slotId),
        ds_booking_slot_key('customer', 'QATEST-customer', $date, $slotId),
        $now,
        $now,
    ]);
};

$free = ds_available_slots($date, [], 60);
$check('published grid has 7 slots', count($free) === 7, (string) count($free));
$check('all slots free on an empty day', count(array_filter($free, static fn (array $s): bool => $s['available'])) === 7);

$insert('QATEST-1', $date, 'slot-0900', 60);

$blocked = ds_validate_booking_slot($date, 'slot-0900', 60, 'QATEST-provider', 'QATEST-customer');
$check('same provider slot rejected', $blocked['ok'] === false && $blocked['code'] === 'SLOT_UNAVAILABLE', $blocked['code']);

$busy = ds_provider_day_bookings('QATEST-provider', $date);
$afterBooked = ds_available_slots($date, $busy, 60);
$byId = [];
foreach ($afterBooked as $slot) {
    $byId[$slot['id']] = $slot;
}
$check('booked slot unavailable', ($byId['slot-0900']['available'] ?? true) === false);
$check('next slot still available', ($byId['slot-1030']['available'] ?? false) === true);

// Concurrency: a second insert with the same provider key must be refused by the
// database, not just by the earlier SELECT.
$duplicateRefused = false;
try {
    $insert('QATEST-2', $date, 'slot-0900', 60);
} catch (PDOException $e) {
    $duplicateRefused = stripos($e->getMessage(), 'bookings_provider_slot_uniq') !== false
        || stripos($e->getMessage(), 'UNIQUE constraint failed') !== false;
}
$check('duplicate provider slot refused by unique index', $duplicateRefused);

// Cancelling releases the slot: this is exactly what the cancel endpoint does
// (status change + key release), so the time must be bookable again.
$pdo->prepare("UPDATE bookings SET status = 'cancelled' WHERE id = 'QATEST-1'")->execute();
ds_clear_booking_slot_keys('QATEST-1');
$insert('QATEST-3', $date, 'slot-0900', 60);
$released = ds_validate_booking_slot($date, 'slot-0900', 60, 'QATEST-provider', null, 'QATEST-3');
$check('cancelled booking frees the slot', $released['ok'] === true, $released['code']);

// Duration overlap: a 120-minute session at 09:00 covers the 10:30 slot.
$pdo->prepare("UPDATE bookings SET duration_minutes = 120 WHERE id = 'QATEST-3'")->execute();
$overlap = ds_validate_booking_slot($date, 'slot-1030', 60, 'QATEST-provider', null, null);
$check('duration overlap rejected', $overlap['ok'] === false && $overlap['code'] === 'SLOT_UNAVAILABLE', $overlap['code']);
$adjacent = ds_validate_booking_slot($date, 'slot-1200', 60, 'QATEST-provider', null, null);
$check('non-overlapping later slot accepted', $adjacent['ok'] === true, $adjacent['code']);

$cleanup();

$failed = array_values(array_filter($results, static fn (array $r): bool => !$r['ok']));
echo json_encode(['driver' => $pdo->getAttribute(PDO::ATTR_DRIVER_NAME), 'results' => $results], JSON_PRETTY_PRINT), PHP_EOL;
echo $failed === [] ? 'BOOKING_OVERLAP_OK' : 'BOOKING_OVERLAP_FAILED', PHP_EOL;
exit($failed === [] ? 0 : 1);
