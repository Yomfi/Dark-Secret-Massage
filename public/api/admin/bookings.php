<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

$admin = ds_require_permission('bookings.read');
if (!ds_cms_ready()) {
    ds_error(503, 'SCHEMA_NOT_MIGRATED', 'This area needs the database migration. Run: php scripts/migrate.php --apply');
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$pdo = ds_pdo();

if ($method === 'GET') {
    if (!empty($_GET['id'])) {
        $stmt = $pdo->prepare(
            'SELECT b.*, p.display_name AS provider_name, p.slug AS provider_slug, t.display_name AS team_name
             FROM bookings b
             LEFT JOIN provider_profiles p ON CAST(p.id AS BINARY) = CAST(b.provider_profile_id AS BINARY)
             LEFT JOIN agency_team_members t ON CAST(t.id AS BINARY) = CAST(b.team_member_id AS BINARY)
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
        // Completion never implies payment — surface an explicit empty payment ledger.
        $dto['paymentRecords'] = [];
        $dto['paymentNote'] =
            'No booking payment ledger is recorded for this appointment. '
            . 'Completed status is operational only and does not mean the booking was paid.';
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
             LEFT JOIN provider_profiles p ON CAST(p.id AS BINARY) = CAST(b.provider_profile_id AS BINARY)
             LEFT JOIN agency_team_members t ON CAST(t.id AS BINARY) = CAST(b.team_member_id AS BINARY)
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
ds_require_permission('bookings.write');
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

    if (!in_array((string) $booking['status'], ['pending', 'confirmed', 'reschedule_requested'], true)) {
        ds_error(409, 'INVALID_TRANSITION', 'A ' . (string) $booking['status'] . ' booking cannot be reassigned.');
    }
    $assignment = ds_assign_booking_team($bookingId, $booking, $teamMemberId, $providerProfileId);
    if (empty($assignment['ok'])) {
        ds_error(409, 'ASSIGNMENT_CONFLICT', (string) ($assignment['message'] ?? 'That provider or team member already has a booking in this slot.'));
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

ds_run_in_transaction(function () use ($pdo, $bookingId, $to, $note, $now, $booking, $admin): void {
    ds_lock_booking_resources(
        $booking['provider_profile_id'] !== null ? (string) $booking['provider_profile_id'] : null,
        (string) $booking['customer_user_id'],
        $booking['team_member_id'] !== null ? (string) $booking['team_member_id'] : null
    );
    $pdo->prepare('UPDATE bookings SET status = ?, cancellation_reason = ?, updated_at = ? WHERE id = ?')
        ->execute([$to, $to === 'cancelled' && $note !== '' ? $note : $booking['cancellation_reason'], $now, $bookingId]);
    if (in_array($to, ['cancelled', 'no_show'], true)) {
        ds_clear_booking_slot_keys($bookingId);
    }
});

ds_booking_log($bookingId, $admin['id'], 'status_changed', $from, $to, $note !== '' ? $note : null);
ds_audit('booking.status_changed', 'booking', $bookingId, ['from' => $from, 'to' => $to], $admin['id']);

ds_success(['bookingId' => $bookingId, 'status' => $to]);
