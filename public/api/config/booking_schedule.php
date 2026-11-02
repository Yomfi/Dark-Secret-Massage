<?php
declare(strict_types=1);

/**
 * Booking schedules, slot generation, validation and locking.
 *
 * There is no built-in calendar. Slots come from the schedule the studio
 * publishes (cms_settings: booking_days / booking_hours / booking_slot_minutes)
 * or from the working days and hours a provider saved on their profile. When a
 * schedule is missing the API reports `configured: false` with a reason instead
 * of inventing times.
 */

function ds_cms_booking_schedule_settings(): array
{
    return [
        'days' => trim(ds_cms_setting('booking_days', '')),
        'hours' => trim(ds_cms_setting('booking_hours', '')),
        'slotMinutes' => (int) (ds_cms_setting('booking_slot_minutes', '60') ?: 60),
        'timezone' => trim(ds_cms_setting('booking_timezone', '')),
    ];
}

/** @return array<int, string> ISO-8601 weekday number → name. */
function ds_weekday_names(): array
{
    return [
        1 => 'Monday',
        2 => 'Tuesday',
        3 => 'Wednesday',
        4 => 'Thursday',
        5 => 'Friday',
        6 => 'Saturday',
        7 => 'Sunday',
    ];
}

/** @return array<string, int> */
function ds_day_token_map(): array
{
    $map = [];
    foreach (ds_weekday_names() as $number => $name) {
        $map[strtolower($name)] = $number;
        $map[strtolower(substr($name, 0, 3))] = $number;
    }
    return $map;
}

/**
 * Parse "Mon–Fri", "monday,tuesday", "1-5", "Sat,Sun" into ISO weekday numbers.
 *
 * @return list<int>|null null when nothing recognisable was supplied.
 */
function ds_parse_working_days(string $raw): ?array
{
    $raw = strtolower(trim($raw));
    if ($raw === '') {
        return null;
    }
    $map = ds_day_token_map();
    $days = [];

    if (preg_match_all('/([a-z]{3,9})\s*(?:-|–|to)\s*([a-z]{3,9})/', $raw, $ranges, PREG_SET_ORDER)) {
        foreach ($ranges as $range) {
            $from = $map[$range[1]] ?? null;
            $to = $map[$range[2]] ?? null;
            if ($from === null || $to === null) {
                continue;
            }
            $cursor = $from;
            $guard = 0;
            do {
                $days[$cursor] = true;
                if ($cursor === $to) {
                    break;
                }
                $cursor = $cursor % 7 + 1;
                $guard++;
            } while ($guard < 8);
        }
        $raw = (string) preg_replace('/([a-z]{3,9})\s*(?:-|–|to)\s*([a-z]{3,9})/', ' ', $raw);
    }

    foreach (preg_split('/[^a-z0-9]+/', $raw) ?: [] as $token) {
        if ($token === '') {
            continue;
        }
        if (isset($map[$token])) {
            $days[$map[$token]] = true;
            continue;
        }
        if (preg_match('/^[1-7]$/', $token)) {
            $days[(int) $token] = true;
        }
    }

    if ($days === []) {
        return null;
    }
    $out = array_keys($days);
    sort($out);
    return $out;
}

/**
 * Parse "09:00–18:00" or "9am – 6pm" into 24-hour start/end.
 *
 * @return array{start:string,end:string}|null
 */
function ds_parse_working_hours(string $raw): ?array
{
    $raw = strtolower(trim($raw));
    if ($raw === '') {
        return null;
    }
    if (!preg_match('/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/', $raw, $m)) {
        return null;
    }

    $toMinutes = static function (string $hour, string $minute, string $meridiem): ?int {
        $h = (int) $hour;
        $mm = $minute === '' ? 0 : (int) $minute;
        if ($mm > 59) {
            return null;
        }
        if ($meridiem === 'pm' && $h < 12) {
            $h += 12;
        }
        if ($meridiem === 'am' && $h === 12) {
            $h = 0;
        }
        if ($h > 23) {
            return null;
        }
        return $h * 60 + $mm;
    };

    $start = $toMinutes($m[1], $m[2] ?? '', $m[3] ?? '');
    $end = $toMinutes($m[4], $m[5] ?? '', $m[6] ?? '');
    if ($start === null || $end === null || $end <= $start + 14) {
        return null;
    }

    return ['start' => ds_minutes_to_clock($start), 'end' => ds_minutes_to_clock($end)];
}

function ds_minutes_to_clock(int $minutes): string
{
    return sprintf('%02d:%02d', intdiv($minutes, 60), $minutes % 60);
}

function ds_format_slot_label(int $startMinutes): string
{
    $hour = intdiv($startMinutes, 60);
    $minute = $startMinutes % 60;
    $meridiem = $hour >= 12 ? 'PM' : 'AM';
    $hour12 = $hour % 12;
    if ($hour12 === 0) {
        $hour12 = 12;
    }
    return sprintf('%d:%02d %s', $hour12, $minute, $meridiem);
}

function ds_period_for(int $startMinutes): string
{
    if ($startMinutes < 12 * 60) {
        return 'morning';
    }
    if ($startMinutes < 17 * 60) {
        return 'afternoon';
    }
    return 'evening';
}

function ds_clock_minutes(string $hhmm): int
{
    $parts = explode(':', $hhmm);
    return ((int) ($parts[0] ?? 0)) * 60 + ((int) ($parts[1] ?? 0));
}

/** @return array<string, mixed> */
function ds_slot_entry(int $start, int $end): array
{
    return [
        'id' => sprintf('slot-%02d%02d', intdiv($start, 60), $start % 60),
        'label' => ds_format_slot_label($start),
        'start' => ds_minutes_to_clock($start),
        'end' => ds_minutes_to_clock($end),
        'period' => ds_period_for($start),
    ];
}

/**
 * The schedule that governs a booking: the provider's saved working pattern, or
 * the studio settings for platform services.
 *
 * @return array<string, mixed>
 */
function ds_booking_schedule(?string $providerProfileId): array
{
    $timezone = date_default_timezone_get();
    $defaults = [
        'configured' => false,
        'source' => 'studio',
        'days' => [],
        'start' => null,
        'end' => null,
        'slotMinutes' => 60,
        'timezone' => $timezone,
        'providerName' => null,
        'message' => '',
    ];

    if ($providerProfileId !== null && $providerProfileId !== '') {
        $defaults['source'] = 'provider';
        $profile = null;
        if (ds_table_exists('provider_profiles')) {
            $stmt = ds_pdo()->prepare(
                'SELECT display_name, working_days, working_hours FROM provider_profiles WHERE id = ? LIMIT 1'
            );
            $stmt->execute([$providerProfileId]);
            $profile = $stmt->fetch() ?: null;
        }
        if (!$profile) {
            $defaults['message'] = 'That provider no longer has a published profile.';
            return $defaults;
        }
        $defaults['providerName'] = (string) $profile['display_name'];
        $days = ds_parse_working_days((string) ($profile['working_days'] ?? ''));
        $hours = ds_parse_working_hours((string) ($profile['working_hours'] ?? ''));
        if ($days === null || $hours === null) {
            $defaults['message'] = $days === null
                ? 'This provider has not published working days yet.'
                : 'This provider has not published working hours yet.';
            return $defaults;
        }
        $defaults['configured'] = true;
        $defaults['days'] = $days;
        $defaults['start'] = $hours['start'];
        $defaults['end'] = $hours['end'];
        $defaults['slotMinutes'] = 60;
        return $defaults;
    }

    $settings = ds_cms_booking_schedule_settings();
    if ($settings['timezone'] !== '' && in_array($settings['timezone'], timezone_identifiers_list(), true)) {
        $defaults['timezone'] = $settings['timezone'];
    }
    $days = ds_parse_working_days($settings['days']);
    $hours = ds_parse_working_hours($settings['hours']);
    $defaults['slotMinutes'] = max(15, min(240, $settings['slotMinutes'] > 0 ? $settings['slotMinutes'] : 60));
    if ($days === null || $hours === null) {
        $defaults['message'] = $days === null
            ? 'Studio booking days have not been published yet.'
            : 'Studio booking hours have not been published yet.';
        return $defaults;
    }
    $defaults['configured'] = true;
    $defaults['days'] = $days;
    $defaults['start'] = $hours['start'];
    $defaults['end'] = $hours['end'];
    return $defaults;
}

/**
 * Every start time the schedule offers, ignoring bookings and the clock.
 *
 * @return list<array<string, mixed>>
 */
function ds_schedule_slot_entries(array $schedule): array
{
    if (empty($schedule['configured']) || empty($schedule['start']) || empty($schedule['end'])) {
        return [];
    }
    $start = ds_clock_minutes((string) $schedule['start']);
    $end = ds_clock_minutes((string) $schedule['end']);
    $step = max(15, (int) ($schedule['slotMinutes'] ?? 60));
    $entries = [];
    for ($minute = $start; $minute + 15 <= $end; $minute += $step) {
        $entries[] = ds_slot_entry($minute, min($minute + $step, $end));
    }
    return $entries;
}

/**
 * Parse a slot id. Ids encode their start time (`slot-0900`), so bookings made
 * under an older grid stay valid and remain resolvable.
 */
function ds_booking_slot_definition(string $slotId): ?array
{
    if (!preg_match('/^slot-(\d{2})(\d{2})$/', $slotId, $m)) {
        return null;
    }
    $start = ((int) $m[1]) * 60 + (int) $m[2];
    if ($start >= 24 * 60) {
        return null;
    }
    $end = min($start + 60, 24 * 60 - 1);
    return ds_slot_entry($start, $end);
}

/** Legacy grid kept only so older labels/ids can still be resolved. */
function ds_booking_slot_definitions(): array
{
    $legacy = [540, 630, 720, 840, 930, 1020, 1110];
    return array_map(static fn (int $start): array => ds_slot_entry($start, $start + 60), $legacy);
}

/** Resolve a booking row to its slot id, tolerating rows written before slot ids. */
function ds_booking_slot_id(array $booking): ?string
{
    $slotId = trim((string) ($booking['slot_id'] ?? ''));
    if ($slotId !== '' && ds_booking_slot_definition($slotId) !== null) {
        return $slotId;
    }
    $label = (string) ($booking['time_slot'] ?? '');
    if ($label === '') {
        return null;
    }
    if (preg_match('/\((\d{1,2}):(\d{2})/', $label, $m)) {
        $start = sprintf('%02d:%02d', (int) $m[1], (int) $m[2]);
        $slot = ds_booking_slot_definition('slot-' . str_replace(':', '', $start));
        if ($slot !== null) {
            return $slot['id'];
        }
    }
    foreach (ds_booking_slot_definitions() as $slot) {
        if (stripos($label, $slot['label']) === 0) {
            return $slot['id'];
        }
    }
    return null;
}

function ds_booking_start_minutes(array $booking): ?int
{
    $slotId = ds_booking_slot_id($booking);
    if ($slotId === null) {
        return null;
    }
    $slot = ds_booking_slot_definition($slotId);
    return $slot ? ds_clock_minutes($slot['start']) : null;
}

function ds_active_booking_statuses(): array
{
    return ['pending', 'confirmed', 'reschedule_requested'];
}

/** Half-open interval overlap: two sessions that merely touch do not conflict. */
function ds_slot_interval_conflict(array $booking, int $startMinutes, int $durationMinutes): bool
{
    $otherStart = ds_booking_start_minutes($booking);
    if ($otherStart === null) {
        return false;
    }
    $otherEnd = $otherStart + max(15, (int) ($booking['duration_minutes'] ?? 60));
    $end = $startMinutes + max(15, $durationMinutes);
    return $startMinutes < $otherEnd && $otherStart < $end;
}

/**
 * Slots for one date with real availability. `$busy` holds active bookings the
 * caller already filtered (provider/team or customer).
 *
 * @return array<string, mixed>
 */
function ds_available_slots(string $date, array $busy, int $durationMinutes, ?array $schedule = null): array
{
    $schedule = $schedule ?? ds_booking_schedule(null);
    $duration = max(15, $durationMinutes);
    $data = [
        'configured' => (bool) ($schedule['configured'] ?? false),
        'closed' => false,
        'source' => $schedule['source'] ?? 'studio',
        'providerName' => $schedule['providerName'] ?? null,
        'timezone' => $schedule['timezone'] ?? date_default_timezone_get(),
        'days' => $schedule['days'] ?? [],
        'start' => $schedule['start'] ?? null,
        'end' => $schedule['end'] ?? null,
        'slotMinutes' => (int) ($schedule['slotMinutes'] ?? 60),
        'message' => (string) ($schedule['message'] ?? ''),
        'slots' => [],
    ];

    if (!$data['configured']) {
        return $data;
    }

    $weekday = (int) date('N', strtotime($date . ' 12:00:00'));
    if (!in_array($weekday, $data['days'], true)) {
        $data['closed'] = true;
        $data['message'] = (ds_weekday_names()[$weekday] ?? 'That day') . ' is not a published working day.';
        return $data;
    }

    $today = date('Y-m-d');
    $nowMinutes = ((int) date('G')) * 60 + ((int) date('i'));
    $dayEnd = ds_clock_minutes((string) $data['end']);

    foreach (ds_schedule_slot_entries($schedule) as $slot) {
        $start = ds_clock_minutes((string) $slot['start']);
        if ($start + $duration > $dayEnd) {
            continue;
        }
        $reason = null;
        if ($date < $today || ($date === $today && $start <= $nowMinutes)) {
            $reason = 'past';
        } else {
            foreach ($busy as $booking) {
                if (ds_slot_interval_conflict($booking, $start, $duration)) {
                    $reason = 'booked';
                    break;
                }
            }
        }
        $data['slots'][] = $slot + ['available' => $reason === null, 'reason' => $reason];
    }

    if ($data['slots'] === []) {
        $data['message'] = 'No ' . $duration . '-minute session fits inside the published working hours.';
    }
    return $data;
}

/** Active bookings for a provider on a date, including agency team assignments. */
function ds_provider_day_bookings(string $providerProfileId, string $date): array
{
    $statuses = ds_active_booking_statuses();
    $in = implode(',', array_fill(0, count($statuses), '?'));
    $teamIds = [];
    if (ds_table_exists('agency_team_members')) {
        try {
            $stmt = ds_pdo()->prepare('SELECT id FROM agency_team_members WHERE agency_profile_id = ?');
            $stmt->execute([$providerProfileId]);
            $teamIds = array_map(static fn (array $row): string => (string) $row['id'], $stmt->fetchAll() ?: []);
        } catch (Throwable $e) {
            $teamIds = [];
        }
    }

    $sql = 'SELECT * FROM bookings WHERE date(scheduled_at) = ? AND status IN (' . $in . ') AND (';
    $params = array_merge([$date], $statuses);
    $sql .= 'provider_profile_id = ?';
    $params[] = $providerProfileId;
    if ($teamIds !== []) {
        $sql .= ' OR team_member_id IN (' . implode(',', array_fill(0, count($teamIds), '?')) . ')';
        $params = array_merge($params, $teamIds);
    }
    $sql .= ')';

    $stmt = ds_pdo()->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll() ?: [];
}

function ds_customer_day_bookings(string $customerUserId, string $date): array
{
    $statuses = ds_active_booking_statuses();
    $in = implode(',', array_fill(0, count($statuses), '?'));
    $stmt = ds_pdo()->prepare(
        "SELECT * FROM bookings WHERE customer_user_id = ? AND date(scheduled_at) = ? AND status IN ($in)"
    );
    $stmt->execute(array_merge([$customerUserId, $date], $statuses));
    return $stmt->fetchAll() ?: [];
}

/** Stable UNIQUE key for one side of a slot (provider/studio, team member or customer). */
function ds_booking_slot_key(string $scope, string $referenceId, string $date, string $slotId): string
{
    return substr($scope . ':' . $referenceId . ':' . $date . ':' . $slotId, 0, 191);
}

/** Studio bookings are exclusive to the studio, so they share one key scope. */
function ds_provider_slot_scope(?string $providerProfileId): string
{
    return $providerProfileId !== null && $providerProfileId !== '' ? $providerProfileId : 'studio';
}

function ds_clear_booking_slot_keys(string $bookingId): void
{
    try {
        ds_pdo()->prepare(
            'UPDATE bookings SET provider_slot_key = NULL, team_slot_key = NULL, customer_slot_key = NULL WHERE id = ?'
        )->execute([$bookingId]);
    } catch (Throwable $e) {
        // Older schema without the keys: nothing to release.
    }
}

/**
 * Validate a requested slot against the live schedule and existing bookings.
 *
 * @return array{ok:bool,code:string,message:string}
 */
function ds_validate_booking_slot(
    string $date,
    string $slotId,
    int $durationMinutes,
    ?string $providerProfileId,
    ?string $customerUserId,
    ?string $excludeBookingId = null,
    ?array $schedule = null
): array {
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        return ['ok' => false, 'code' => 'VALIDATION_ERROR', 'message' => 'Choose a valid date.'];
    }
    if ($date < date('Y-m-d')) {
        return ['ok' => false, 'code' => 'VALIDATION_ERROR', 'message' => 'Choose today or a future date.'];
    }

    $schedule = $schedule ?? ds_booking_schedule($providerProfileId);
    if (empty($schedule['configured'])) {
        return [
            'ok' => false,
            'code' => 'AVAILABILITY_NOT_CONFIGURED',
            'message' => (string) ($schedule['message'] ?? 'Availability has not been published yet.'),
        ];
    }

    $weekday = (int) date('N', strtotime($date . ' 12:00:00'));
    if (!in_array($weekday, $schedule['days'] ?? [], true)) {
        return [
            'ok' => false,
            'code' => 'CLOSED_DAY',
            'message' => (ds_weekday_names()[$weekday] ?? 'That day') . ' is not a published working day.',
        ];
    }

    $slot = null;
    foreach (ds_schedule_slot_entries($schedule) as $entry) {
        if ($entry['id'] === $slotId) {
            $slot = $entry;
            break;
        }
    }
    if ($slot === null) {
        return ['ok' => false, 'code' => 'SLOT_UNAVAILABLE', 'message' => 'That time is not part of the published calendar.'];
    }

    $duration = max(15, $durationMinutes);
    $start = ds_clock_minutes((string) $slot['start']);
    $dayEnd = ds_clock_minutes((string) $schedule['end']);
    if ($start + $duration > $dayEnd) {
        return ['ok' => false, 'code' => 'SLOT_UNAVAILABLE', 'message' => 'That session would run past closing time.'];
    }

    $nowMinutes = ((int) date('G')) * 60 + ((int) date('i'));
    if ($date === date('Y-m-d') && $start <= $nowMinutes) {
        return ['ok' => false, 'code' => 'SLOT_UNAVAILABLE', 'message' => 'That time has already passed.'];
    }

    if ($providerProfileId !== null && $providerProfileId !== '') {
        foreach (ds_provider_day_bookings($providerProfileId, $date) as $booking) {
            if ($excludeBookingId !== null && (string) $booking['id'] === $excludeBookingId) {
                continue;
            }
            if (ds_slot_interval_conflict($booking, $start, $duration)) {
                return ['ok' => false, 'code' => 'SLOT_UNAVAILABLE', 'message' => 'That time is already booked. Please choose another slot.'];
            }
        }
    } else {
        // Studio bookings have no provider row to lock against, so the studio's
        // own active bookings are the calendar.
        foreach (ds_studio_day_bookings($date) as $booking) {
            if ($excludeBookingId !== null && (string) $booking['id'] === $excludeBookingId) {
                continue;
            }
            if (ds_slot_interval_conflict($booking, $start, $duration)) {
                return ['ok' => false, 'code' => 'SLOT_UNAVAILABLE', 'message' => 'That time is already booked. Please choose another slot.'];
            }
        }
    }

    if ($customerUserId !== null && $customerUserId !== '') {
        foreach (ds_customer_day_bookings($customerUserId, $date) as $booking) {
            if ($excludeBookingId !== null && (string) $booking['id'] === $excludeBookingId) {
                continue;
            }
            if (ds_slot_interval_conflict($booking, $start, $duration)) {
                return ['ok' => false, 'code' => 'DUPLICATE_BOOKING', 'message' => 'You already have a booking at that time.'];
            }
        }
    }

    return ['ok' => true, 'code' => 'OK', 'message' => ''];
}

/** Active studio bookings (no provider assigned) for a date. */
function ds_studio_day_bookings(string $date): array
{
    $statuses = ds_active_booking_statuses();
    $in = implode(',', array_fill(0, count($statuses), '?'));
    $stmt = ds_pdo()->prepare(
        "SELECT * FROM bookings WHERE provider_profile_id IS NULL AND date(scheduled_at) = ? AND status IN ($in)"
    );
    $stmt->execute(array_merge([$date], $statuses));
    return $stmt->fetchAll() ?: [];
}

/* ------------------------------------------------------------------------- */
/* Transactions and locking                                                    */
/* ------------------------------------------------------------------------- */

/**
 * Run a write path in a transaction. Nested calls join the outer transaction so
 * validation and the insert are one atomic unit.
 */
function ds_run_in_transaction(callable $fn)
{
    $pdo = ds_pdo();
    $started = !$pdo->inTransaction();
    if ($started) {
        $pdo->beginTransaction();
    }
    try {
        $result = $fn($pdo);
        if ($started && $pdo->inTransaction()) {
            $pdo->commit();
        }
        return $result;
    } catch (Throwable $e) {
        if ($started && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

/**
 * Serialise writers that could take the same slot. MySQL row locks are held for
 * the transaction: the provider profile (or the studio schedule settings) and
 * the customer account, plus an agency team member when one is assigned.
 */
function ds_lock_booking_resources(
    ?string $providerProfileId,
    ?string $customerUserId,
    ?string $teamMemberId = null
): void {
    $pdo = ds_pdo();
    if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) !== 'mysql') {
        return;
    }
    if ($providerProfileId !== null && $providerProfileId !== '') {
        $stmt = $pdo->prepare('SELECT id FROM provider_profiles WHERE id = ? FOR UPDATE');
        $stmt->execute([$providerProfileId]);
    } else {
        $stmt = $pdo->prepare(
            "SELECT skey FROM cms_settings WHERE skey IN ('booking_days','booking_hours','booking_slot_minutes') FOR UPDATE"
        );
        $stmt->execute();
    }
    if ($teamMemberId !== null && $teamMemberId !== '' && ds_table_exists('agency_team_members')) {
        $stmt = $pdo->prepare('SELECT id FROM agency_team_members WHERE id = ? FOR UPDATE');
        $stmt->execute([$teamMemberId]);
    }
    if ($customerUserId !== null && $customerUserId !== '') {
        $stmt = $pdo->prepare('SELECT id FROM users WHERE id = ? FOR UPDATE');
        $stmt->execute([$customerUserId]);
    }
}

/**
 * Database-level reservation lock. Row locks alone cannot serialise a studio
 * booking when the schedule settings row does not exist yet, so every write
 * path takes a MySQL advisory lock keyed by the resource and the date.
 */
function ds_booking_lock_key(?string $providerProfileId, string $date, string $extra = ''): string
{
    return 'ds_slot:' . substr(hash('sha256', ds_provider_slot_scope($providerProfileId) . '|' . $date . '|' . $extra), 0, 40);
}

function ds_acquire_booking_lock(string $key, int $timeoutSeconds = 8): bool
{
    if (ds_pdo()->getAttribute(PDO::ATTR_DRIVER_NAME) !== 'mysql') {
        return true;
    }
    $stmt = ds_pdo()->prepare('SELECT GET_LOCK(?, ?) AS acquired');
    $stmt->execute([$key, max(1, $timeoutSeconds)]);
    $row = $stmt->fetch();
    return (int) ($row['acquired'] ?? 0) === 1;
}

function ds_release_booking_lock(string $key): void
{
    if (ds_pdo()->getAttribute(PDO::ATTR_DRIVER_NAME) !== 'mysql') {
        return;
    }
    try {
        ds_pdo()->prepare('SELECT RELEASE_LOCK(?)')->execute([$key]);
    } catch (Throwable $e) {
        // The connection closing releases it anyway.
    }
}

/**
 * Run a booking write under the resource locks for its day, then in a
 * transaction. Two overlapping requests — even with different start times and
 * durations — serialise here instead of both passing a SELECT check.
 *
 * @param list<string> $lockKeys
 */
function ds_run_booking_write(array $lockKeys, callable $fn)
{
    $acquired = [];
    foreach (array_values(array_unique($lockKeys)) as $key) {
        if (!ds_acquire_booking_lock($key)) {
            foreach ($acquired as $held) {
                ds_release_booking_lock($held);
            }
            return ['lock_timeout' => true];
        }
        $acquired[] = $key;
    }
    try {
        return ds_run_in_transaction($fn);
    } finally {
        foreach ($acquired as $held) {
            ds_release_booking_lock($held);
        }
    }
}

/** True when a database error means "someone else holds the slot right now". */
function ds_is_slot_conflict(Throwable $e): bool
{
    $message = $e->getMessage();
    foreach (['bookings_provider_slot_uniq', 'bookings_team_slot_uniq', 'bookings_customer_slot_uniq'] as $index) {
        if (stripos($message, $index) !== false) {
            return true;
        }
    }
    foreach (['deadlock', 'lock wait timeout', 'database is locked', 'UNIQUE constraint failed'] as $needle) {
        if (stripos($message, $needle) !== false) {
            return true;
        }
    }
    $code = (int) ($e->getCode() ?: 0);
    return in_array($code, [1205, 1213], true);
}

/**
 * Move a booking to a new validated slot. Validation, the lock and the update
 * run in one transaction so a concurrent request cannot slip between them.
 *
 * @return array{ok:bool,code?:string,message?:string,status?:string,timeSlot?:string}
 */
function ds_reschedule_booking(
    string $bookingId,
    array $booking,
    string $newDate,
    string $newSlotId,
    string $actorId,
    string $event,
    ?string $newTimeSlot = null,
    ?string $note = null
): array {
    $duration = max(15, (int) $booking['duration_minutes']);
    $providerProfileId = $booking['provider_profile_id'] !== null ? (string) $booking['provider_profile_id'] : '';
    $teamMemberId = $booking['team_member_id'] !== null ? (string) $booking['team_member_id'] : '';
    $customerId = (string) $booking['customer_user_id'];
    $status = (string) $booking['status'];
    $nextStatus = $status === 'reschedule_requested' ? 'confirmed' : $status;

    $lockKeys = [
        ds_booking_lock_key($providerProfileId !== '' ? $providerProfileId : null, $newDate),
        'customer-day:' . $customerId . ':' . $newDate,
    ];
    if ($teamMemberId !== '') {
        $lockKeys[] = 'team-day:' . $teamMemberId . ':' . $newDate;
    }
    $result = ds_run_booking_write($lockKeys, function () use (
        $bookingId, $booking, $newDate, $newSlotId, $newTimeSlot, $note, $duration,
        $providerProfileId, $teamMemberId, $customerId, $nextStatus
    ): array {
        ds_lock_booking_resources(
            $providerProfileId !== '' ? $providerProfileId : null,
            $customerId,
            $teamMemberId !== '' ? $teamMemberId : null
        );
        $check = ds_validate_booking_slot(
            $newDate,
            $newSlotId,
            $duration,
            $providerProfileId !== '' ? $providerProfileId : null,
            $customerId,
            $bookingId
        );
        if (!$check['ok']) {
            return ['ok' => false, 'code' => $check['code'], 'message' => $check['message']];
        }
        $slot = ds_booking_slot_definition($newSlotId);
        if ($slot === null) {
            return ['ok' => false, 'code' => 'SLOT_UNAVAILABLE', 'message' => 'That time is not part of the published calendar.'];
        }
        $label = $newTimeSlot !== null && $newTimeSlot !== ''
            ? $newTimeSlot
            : $slot['label'] . ' (' . $slot['start'] . '–' . $slot['end'] . ')';

        ds_pdo()->prepare(
            'UPDATE bookings SET scheduled_at = ?, time_slot = ?, slot_id = ?, provider_slot_key = ?,
                team_slot_key = ?, customer_slot_key = ?, status = ?, notes = COALESCE(?, notes), updated_at = ?
             WHERE id = ?'
        )->execute([
            $newDate . 'T00:00:00',
            $label,
            $newSlotId,
            ds_booking_slot_key('provider', ds_provider_slot_scope($providerProfileId !== '' ? $providerProfileId : null), $newDate, $newSlotId),
            $teamMemberId !== '' ? ds_booking_slot_key('team', $teamMemberId, $newDate, $newSlotId) : null,
            ds_booking_slot_key('customer', $customerId, $newDate, $newSlotId),
            $nextStatus,
            $note !== null && $note !== '' ? $note : null,
            ds_now_sql(),
            $bookingId,
        ]);

        return ['ok' => true, 'status' => $nextStatus, 'timeSlot' => $label];
    });

    if (!empty($result['ok'])) {
        ds_booking_log($bookingId, $actorId, $event, $status, $nextStatus, $note);
    }
    return $result;
}

/**
 * Assign/replace a booking's provider and agency team member atomically.
 *
 * @return array{ok:bool,code?:string,message?:string}
 */
function ds_assign_booking_team(
    string $bookingId,
    array $booking,
    string $teamMemberId,
    ?string $providerProfileId = null
): array {
    $existingProvider = $booking['provider_profile_id'] !== null ? (string) $booking['provider_profile_id'] : '';
    $providerProfileId = $providerProfileId !== null && $providerProfileId !== '' ? $providerProfileId : $existingProvider;
    $customerId = (string) $booking['customer_user_id'];
    $date = substr((string) $booking['scheduled_at'], 0, 10);
    $slotId = ds_booking_slot_id($booking);
    $duration = max(15, (int) $booking['duration_minutes']);

    if ($date === '' || $slotId === null) {
        return ['ok' => false, 'code' => 'ASSIGNMENT_CONFLICT', 'message' => 'This booking has no published slot to assign.'];
    }

    $lockKeys = [
        ds_booking_lock_key($providerProfileId !== '' ? $providerProfileId : null, $date),
        'customer-day:' . $customerId . ':' . $date,
    ];
    if ($teamMemberId !== '') {
        $lockKeys[] = 'team-day:' . $teamMemberId . ':' . $date;
    }

    return ds_run_booking_write($lockKeys, function () use ($bookingId, $date, $slotId, $duration, $providerProfileId, $teamMemberId, $customerId): array {
        ds_lock_booking_resources($providerProfileId !== '' ? $providerProfileId : null, $customerId, $teamMemberId !== '' ? $teamMemberId : null);

        if ($teamMemberId !== '' && ds_table_exists('agency_team_members')) {
            $memberStmt = ds_pdo()->prepare('SELECT availability FROM agency_team_members WHERE id = ? LIMIT 1');
            $memberStmt->execute([$teamMemberId]);
            $memberRow = $memberStmt->fetch() ?: null;
            $pattern = trim((string) ($memberRow['availability'] ?? ''));
            if ($pattern !== '') {
                $memberDays = ds_parse_working_days($pattern);
                $memberHours = ds_parse_working_hours($pattern);
                $weekday = (int) date('N', strtotime($date . ' 12:00:00'));
                $slot = ds_booking_slot_definition($slotId);
                $start = $slot ? ds_clock_minutes($slot['start']) : 0;
                if ($memberDays !== null && !in_array($weekday, $memberDays, true)) {
                    return ['ok' => false, 'code' => 'TEAM_UNAVAILABLE', 'message' => 'That team member does not work on this day.'];
                }
                if ($memberHours !== null && ($start < ds_clock_minutes($memberHours['start']) || $start + $duration > ds_clock_minutes($memberHours['end']))) {
                    return ['ok' => false, 'code' => 'TEAM_UNAVAILABLE', 'message' => 'That session is outside the team member\'s working hours.'];
                }
            }
        }

        if ($providerProfileId !== '') {
            $check = ds_validate_booking_slot($date, $slotId, $duration, $providerProfileId, null, $bookingId);
            if (!$check['ok']) {
                return ['ok' => false, 'code' => 'ASSIGNMENT_CONFLICT', 'message' => $check['message']];
            }
        }

        if ($teamMemberId !== '') {
            $statuses = ds_active_booking_statuses();
            $in = implode(',', array_fill(0, count($statuses), '?'));
            $stmt = ds_pdo()->prepare(
                "SELECT * FROM bookings WHERE team_member_id = ? AND id <> ? AND date(scheduled_at) = ? AND status IN ($in)"
            );
            $stmt->execute(array_merge([$teamMemberId, $bookingId, $date], $statuses));
            $slot = ds_booking_slot_definition($slotId);
            $start = $slot ? ds_clock_minutes($slot['start']) : 0;
            foreach ($stmt->fetchAll() ?: [] as $existing) {
                if (ds_slot_interval_conflict($existing, $start, $duration)) {
                    return ['ok' => false, 'code' => 'ASSIGNMENT_CONFLICT', 'message' => 'That team member already has a booking in this slot.'];
                }
            }
        }

        ds_pdo()->prepare(
            'UPDATE bookings SET provider_profile_id = ?, team_member_id = ?, provider_slot_key = ?,
                team_slot_key = ?, updated_at = ? WHERE id = ?'
        )->execute([
            $providerProfileId !== '' ? $providerProfileId : null,
            $teamMemberId !== '' ? $teamMemberId : null,
            $providerProfileId !== '' ? ds_booking_slot_key('provider', $providerProfileId, $date, $slotId) : null,
            $teamMemberId !== '' ? ds_booking_slot_key('team', $teamMemberId, $date, $slotId) : null,
            ds_now_sql(),
            $bookingId,
        ]);

        return ['ok' => true];
    });
}

/**
 * Cancel/no-show a booking and release its slot keys atomically.
 *
 * @param array<string, mixed> $extraColumns additional column => value pairs
 */
function ds_cancel_booking(
    string $bookingId,
    array $booking,
    string $actorId,
    string $event,
    ?string $note = null,
    array $extraColumns = []
): void {
    $providerProfileId = $booking['provider_profile_id'] !== null ? (string) $booking['provider_profile_id'] : '';
    $teamMemberId = $booking['team_member_id'] !== null ? (string) $booking['team_member_id'] : '';
    $customerId = (string) $booking['customer_user_id'];
    $from = (string) $booking['status'];

    $date = substr((string) $booking['scheduled_at'], 0, 10);
    $lockKeys = [
        ds_booking_lock_key($providerProfileId !== '' ? $providerProfileId : null, $date),
        'customer-day:' . $customerId . ':' . $date,
    ];
    if ($teamMemberId !== '') {
        $lockKeys[] = 'team-day:' . $teamMemberId . ':' . $date;
    }
    ds_run_booking_write($lockKeys, function () use ($bookingId, $providerProfileId, $teamMemberId, $customerId, $extraColumns): void {
        ds_lock_booking_resources(
            $providerProfileId !== '' ? $providerProfileId : null,
            $customerId,
            $teamMemberId !== '' ? $teamMemberId : null
        );
        $columns = array_keys($extraColumns);
        $assignments = ['updated_at = ?'];
        $values = [ds_now_sql()];
        foreach ($extraColumns as $column => $value) {
            $assignments[] = $column . ' = ?';
            $values[] = $value;
        }
        $values[] = $bookingId;
        ds_pdo()->prepare('UPDATE bookings SET ' . implode(', ', $assignments) . ' WHERE id = ?')->execute($values);
        ds_clear_booking_slot_keys($bookingId);
    });

    ds_booking_log($bookingId, $actorId, $event, $from, 'cancelled', $note);
}
