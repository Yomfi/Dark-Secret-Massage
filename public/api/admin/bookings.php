<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

$admin = ds_require_admin();
if (!ds_cms_ready()) {
    ds_cms_migrate();
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$pdo = ds_pdo();

if ($method === 'GET') {
    if (!empty($_GET['id'])) {
        $stmt = $pdo->prepare(
            'SELECT b.*, p.display_name AS provider_name, p.slug AS provider_slug, t.display_name AS team_name
             FROM bookings b
             LEFT JOIN provider_profiles p ON p.id = b.provider_profile_id
             LEFT JOIN agency_team_members t ON t.id = b.team_member_id
             WHERE b.id = ? LIMIT 1'
        );
        try {
            $stmt->execute([(string) $_GET['id']]);
        } catch (Throwable $e) {
            ds_error(503, 'NOT_CONFIGURED', 'Bookings are not available yet.');
        }
        $row = $stmt->fetch();
        if (!$row) {
            ds_error(404, 'NOT_FOUND', 'Booking not found.');
        }
        $events = [];
        if (ds_table_exists('booking_events')) {
            $ev = $pdo->prepare('SELECT * FROM booking_events WHERE booking_id = ? ORDER BY created_at ASC');
            $ev->execute([(string) $row['id']]);
            $events = array_map(static fn (array $e): array => [
                'event' => (string) $e['event'],
                'fromStatus' => $e['from_status'],
                'toStatus' => $e['to_status'],
                'note' => $e['note'],
                'createdAt' => $e['created_at'],
            ], $ev->fetchAll() ?: []);
        }
        $dto = ds_booking_row_to_api($row);
        $dto['providerName'] = $row['provider_name'] ?? null;
        $dto['teamMemberName'] = $row['team_name'] ?? null;
        $dto['events'] = $events;
        ds_success(['booking' => $dto]);
    }

    $status = strtolower(trim((string) ($_GET['status'] ?? '')));
    $search = trim((string) ($_GET['q'] ?? ''));
    $page = max(1, (int) ($_GET['page'] ?? 1));
    $perPage = min(50, max(10, (int) ($_GET['perPage'] ?? 20)));
    $offset = ($page - 1) * $perPage;

    $where = ['1=1'];
    $params = [];
    if ($status !== '' && in_array($status, array_keys(ds_booking_transitions()), true)) {
        $where[] = 'b.status = ?';
        $params[] = $status;
    }
    if ($search !== '') {
        $where[] = '(b.service_name LIKE ? OR b.customer_name LIKE ? OR b.customer_email LIKE ? OR b.reference LIKE ?)';
        $like = '%' . $search . '%';
        array_push($params, $like, $like, $like, $like);
    }
    $whereSql = implode(' AND ', $where);

    try {
        $stmt = $pdo->prepare("SELECT COUNT(*) AS c FROM bookings b WHERE $whereSql");
        $stmt->execute($params);
        $total = (int) ($stmt->fetch()['c'] ?? 0);

        $stmt = $pdo->prepare(
            "SELECT b.*, p.display_name AS provider_name, t.display_name AS team_name
             FROM bookings b
             LEFT JOIN provider_profiles p ON p.id = b.provider_profile_id
             LEFT JOIN agency_team_members t ON t.id = b.team_member_id
             WHERE $whereSql ORDER BY b.created_at DESC LIMIT $perPage OFFSET $offset"
        );
        $stmt->execute($params);
        $rows = $stmt->fetchAll() ?: [];
    } catch (Throwable $e) {
        $total = 0;
        $rows = [];
    }

    ds_success([
        'bookings' => array_map(static function (array $row): array {
            $dto = ds_booking_row_to_api($row);
            $dto['providerName'] = $row['provider_name'] ?? null;
            $dto['teamMemberName'] = $row['team_name'] ?? null;
            return $dto;
        }, $rows),
        'total' => $total,
        'page' => $page,
        'perPage' => $perPage,
        'statuses' => array_keys(ds_booking_transitions()),
    ]);
}

ds_require_method('POST');
ds_require_same_origin();
ds_rate_limit('admin_bookings', 120, 15 * 60);

$body = ds_json_body();
$bookingId = trim((string) ($body['bookingId'] ?? ''));
$action = strtolower(trim((string) ($body['action'] ?? 'status')));

if ($bookingId === '') {
    ds_error(400, 'VALIDATION_ERROR', 'Booking id is required.');
}

$stmt = $pdo->prepare('SELECT * FROM bookings WHERE id = ? LIMIT 1');
$stmt->execute([$bookingId]);
$booking = $stmt->fetch();
if (!$booking) {
    ds_error(404, 'NOT_FOUND', 'Booking not found.');
}

$now = ds_now_sql();

if ($action === 'assign') {
    $providerProfileId = trim((string) ($body['providerProfileId'] ?? ''));
    $teamMemberId = trim((string) ($body['teamMemberId'] ?? ''));

    if ($providerProfileId === '') {
        ds_error(400, 'VALIDATION_ERROR', 'Select a provider to assign.');
    }
    $stmt = $pdo->prepare(
        "SELECT p.id, p.user_id, p.provider_type FROM provider_profiles p
         INNER JOIN provider_verification v ON v.provider_user_id = p.user_id
         WHERE p.id = ? AND v.verification_status = 'verified' LIMIT 1"
    );
    $stmt->execute([$providerProfileId]);
    $provider = $stmt->fetch();
    if (!$provider) {
        ds_error(409, 'NOT_ELIGIBLE', 'Only verified providers can be assigned bookings.');
    }

    if ($teamMemberId !== '') {
        $tm = $pdo->prepare(
            'SELECT id, agency_profile_id, status FROM agency_team_members WHERE id = ? LIMIT 1'
        );
        $tm->execute([$teamMemberId]);
        $member = $tm->fetch();
        if (!$member || (string) $member['agency_profile_id'] !== $providerProfileId) {
            ds_error(400, 'VALIDATION_ERROR', 'That team member does not belong to the selected agency.');
        }
        if ((string) $member['status'] !== 'active') {
            ds_error(409, 'NOT_ELIGIBLE', 'Inactive team members cannot be assigned bookings.');
        }
    }

    $date = substr((string) $booking['scheduled_at'], 0, 10);
    $slotId = ds_booking_slot_id($booking);
    if ($date === '' || $slotId === null) {
        ds_error(409, 'ASSIGNMENT_CONFLICT', 'This booking has no published slot to assign.');
    }

    // Overlap checks against the provider's calendar and, when chosen, the team
    // member's calendar for the whole session duration.
    $check = ds_validate_booking_slot($date, $slotId, max(15, (int) $booking['duration_minutes']), $providerProfileId, null, $bookingId);
    if (!$check['ok']) {
        ds_error(409, 'ASSIGNMENT_CONFLICT', $check['message']);
    }

    $teamKey = null;
    if ($teamMemberId !== '') {
        $slot = ds_booking_slot_definition($slotId);
        $start = $slot ? ds_clock_minutes($slot['start']) : 0;
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
    }

    try {
        $pdo->prepare('UPDATE bookings SET provider_profile_id = ?, team_member_id = ?, provider_slot_key = ?, team_slot_key = ?, updated_at = ? WHERE id = ?')
            ->execute([
                $providerProfileId,
                $teamMemberId !== '' ? $teamMemberId : null,
                ds_booking_slot_key('provider', $providerProfileId, $date, $slotId),
                $teamKey,
                $now,
                $bookingId,
            ]);
    } catch (PDOException $e) {
        ds_error(409, 'ASSIGNMENT_CONFLICT', 'That provider or team member already has a booking in this slot.');
    }

    ds_booking_log($bookingId, $admin['id'], 'assigned', (string) $booking['status'], (string) $booking['status'],
        $teamMemberId !== '' ? 'Assigned to team member' : 'Assigned to provider');
    ds_audit('booking.assigned', 'booking', $bookingId, [
        'providerProfileId' => $providerProfileId,
        'teamMemberId' => $teamMemberId,
    ], $admin['id']);
    ds_success(['assigned' => true]);
}

$to = strtolower(trim((string) ($body['status'] ?? '')));
$note = trim((string) ($body['note'] ?? ''));
$from = (string) $booking['status'];

if (!ds_booking_transition_allowed($from, $to)) {
    ds_error(409, 'INVALID_TRANSITION', 'That status change is not allowed from ' . $from . '.');
}

$pdo->prepare('UPDATE bookings SET status = ?, cancellation_reason = ?, updated_at = ? WHERE id = ?')
    ->execute([$to, $to === 'cancelled' && $note !== '' ? $note : $booking['cancellation_reason'], $now, $bookingId]);
if (in_array($to, ['cancelled', 'no_show'], true)) {
    ds_clear_booking_slot_keys($bookingId);
}

ds_booking_log($bookingId, $admin['id'], 'status_changed', $from, $to, $note !== '' ? $note : null);
ds_audit('booking.status_changed', 'booking', $bookingId, ['from' => $from, 'to' => $to], $admin['id']);

ds_success(['bookingId' => $bookingId, 'status' => $to]);
