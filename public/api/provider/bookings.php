<?php
declare(strict_types=1);

/** Provider bookings: own records only, valid transitions, agency team assignment. */

require_once dirname(__DIR__) . '/config/bootstrap.php';

$user = ds_require_provider();
if (!ds_cms_ready()) {
    ds_cms_migrate();
}

$profile = ds_provider_profile_by_user($user['id']);
if (!$profile) {
    ds_error(400, 'VALIDATION_ERROR', 'Complete your profile before viewing bookings.');
}
$profileId = (string) $profile['id'];
$isAgency = (string) ($profile['provider_type'] ?? 'individual') === 'agency';
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$pdo = ds_pdo();

if ($method === 'GET') {
    $stmt = $pdo->prepare(
        'SELECT b.*, t.display_name AS team_name
         FROM bookings b LEFT JOIN agency_team_members t ON t.id = b.team_member_id
         WHERE b.provider_profile_id = ? ORDER BY COALESCE(b.scheduled_at, b.created_at) DESC LIMIT 100'
    );
    $stmt->execute([$profileId]);
    $rows = $stmt->fetchAll() ?: [];

    $team = $isAgency ? ds_agency_team_members($profileId, true) : [];

    ds_success([
        'bookings' => array_map(static function (array $row): array {
            $dto = ds_booking_row_to_api($row);
            $dto['teamMemberName'] = $row['team_name'] ?? null;
            return $dto;
        }, $rows),
        'teamMembers' => $team,
        'isAgency' => $isAgency,
    ]);
}

ds_require_method('POST');
ds_require_same_origin();
ds_rate_limit('provider_bookings', 60, 15 * 60);

$body = ds_json_body();
$bookingId = trim((string) ($body['bookingId'] ?? ''));
$action = strtolower(trim((string) ($body['action'] ?? 'status')));

$stmt = $pdo->prepare('SELECT * FROM bookings WHERE id = ? AND provider_profile_id = ? LIMIT 1');
$stmt->execute([$bookingId, $profileId]);
$booking = $stmt->fetch();
if (!$booking) {
    ds_error(404, 'NOT_FOUND', 'Booking not found.');
}

$now = ds_now_sql();

if ($action === 'assign_team') {
    if (!$isAgency) {
        ds_error(403, 'FORBIDDEN', 'Only agency accounts can assign team members.');
    }
    $teamMemberId = trim((string) ($body['teamMemberId'] ?? ''));
    $tm = $pdo->prepare('SELECT id, status FROM agency_team_members WHERE id = ? AND agency_profile_id = ? LIMIT 1');
    $tm->execute([$teamMemberId, $profileId]);
    $member = $tm->fetch();
    if (!$member) {
        ds_error(404, 'NOT_FOUND', 'Team member not found in your agency.');
    }
    if ((string) $member['status'] !== 'active') {
        ds_error(409, 'NOT_ELIGIBLE', 'Inactive team members cannot be assigned bookings.');
    }
    $date = substr((string) $booking['scheduled_at'], 0, 10);
    $slotId = ds_booking_slot_id($booking);
    $slot = $slotId !== null ? ds_booking_slot_definition($slotId) : null;
    if ($date === '' || $slotId === null || $slot === null) {
        ds_error(409, 'ASSIGNMENT_CONFLICT', 'This booking has no published slot to assign.');
    }

    // Overlap check against the team member's own schedule for the full session.
    $start = ds_clock_minutes($slot['start']);
    $duration = max(15, (int) $booking['duration_minutes']);
    $statuses = ds_active_booking_statuses();
    $in = implode(',', array_fill(0, count($statuses), '?'));
    $conflict = $pdo->prepare(
        "SELECT * FROM bookings WHERE team_member_id = ? AND id <> ? AND date(scheduled_at) = ? AND status IN ($in)"
    );
    $conflict->execute(array_merge([$teamMemberId, $bookingId, $date], $statuses));
    foreach ($conflict->fetchAll() ?: [] as $existing) {
        if (ds_slot_interval_conflict($existing, $start, $duration)) {
            ds_error(409, 'ASSIGNMENT_CONFLICT', 'That team member already has a booking in this slot.');
        }
    }

    $teamKey = ds_booking_slot_key('team', $teamMemberId, $date, $slotId);
    try {
        $pdo->prepare('UPDATE bookings SET team_member_id = ?, team_slot_key = ?, updated_at = ? WHERE id = ?')
            ->execute([$teamMemberId, $teamKey, $now, $bookingId]);
    } catch (PDOException $e) {
        ds_error(409, 'ASSIGNMENT_CONFLICT', 'That team member already has a booking in this slot.');
    }
    ds_booking_log($bookingId, $user['id'], 'team_assigned', (string) $booking['status'], (string) $booking['status']);
    ds_success(['assigned' => true]);
}

if ($action === 'reschedule') {
    $status = (string) $booking['status'];
    if (!in_array($status, ['pending', 'confirmed', 'reschedule_requested'], true)) {
        ds_error(409, 'INVALID_TRANSITION', 'This booking can no longer be rescheduled.');
    }
    $newDate = substr(trim((string) ($body['scheduledAt'] ?? '')), 0, 10);
    $newSlotId = trim((string) ($body['timeSlotId'] ?? ''));
    if ($newDate === '' || $newSlotId === '') {
        ds_error(400, 'VALIDATION_ERROR', 'Choose the new date and time.');
    }
    $duration = max(15, (int) $booking['duration_minutes']);
    $check = ds_validate_booking_slot(
        $newDate,
        $newSlotId,
        $duration,
        $profileId,
        (string) $booking['customer_user_id'],
        $bookingId
    );
    if (!$check['ok']) {
        ds_error($check['code'] === 'VALIDATION_ERROR' ? 400 : 409, $check['code'], $check['message']);
    }
    $slot = ds_booking_slot_definition($newSlotId);
    $label = $slot['label'] . ' (' . $slot['start'] . '–' . $slot['end'] . ')';
    $teamMemberId = $booking['team_member_id'] !== null ? (string) $booking['team_member_id'] : '';
    $nextStatus = $status === 'reschedule_requested' ? 'confirmed' : $status;
    try {
        $pdo->prepare(
            'UPDATE bookings SET scheduled_at = ?, time_slot = ?, slot_id = ?, provider_slot_key = ?,
                team_slot_key = ?, customer_slot_key = ?, status = ?, updated_at = ? WHERE id = ?'
        )->execute([
            $newDate . 'T00:00:00',
            $label,
            $newSlotId,
            ds_booking_slot_key('provider', $profileId, $newDate, $newSlotId),
            $teamMemberId !== '' ? ds_booking_slot_key('team', $teamMemberId, $newDate, $newSlotId) : null,
            ds_booking_slot_key('customer', (string) $booking['customer_user_id'], $newDate, $newSlotId),
            $nextStatus,
            $now,
            $bookingId,
        ]);
    } catch (PDOException $e) {
        $message = $e->getMessage();
        if (stripos($message, 'customer_slot_uniq') !== false) {
            ds_error(409, 'DUPLICATE_BOOKING', 'The customer already has a booking at that time.');
        }
        ds_error(409, 'SLOT_UNAVAILABLE', 'That time was just booked. Please choose another slot.');
    }
    ds_booking_log($bookingId, $user['id'], 'provider_rescheduled', $status, $nextStatus, $label);
    ds_success(['bookingId' => $bookingId, 'status' => $nextStatus, 'scheduledAt' => $newDate . 'T00:00:00', 'timeSlot' => $label]);
}

$to = strtolower(trim((string) ($body['status'] ?? '')));
$note = trim((string) ($body['note'] ?? ''));
$from = (string) $booking['status'];

if (!ds_booking_transition_allowed($from, $to)) {
    ds_error(409, 'INVALID_TRANSITION', 'That status change is not allowed from ' . $from . '.');
}

$pdo->prepare('UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?')
    ->execute([$to, $now, $bookingId]);
if (in_array($to, ['cancelled', 'no_show'], true)) {
    // Releasing the slot keys makes the time bookable again.
    ds_clear_booking_slot_keys($bookingId);
}
ds_booking_log($bookingId, $user['id'], 'provider_status_changed', $from, $to, $note !== '' ? $note : null);

ds_success(['bookingId' => $bookingId, 'status' => $to]);
