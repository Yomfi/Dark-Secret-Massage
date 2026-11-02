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
    $conflict = $pdo->prepare(
        "SELECT id FROM bookings WHERE team_member_id = ? AND id <> ?
         AND status IN ('pending','confirmed','reschedule_requested') AND scheduled_at = ? LIMIT 1"
    );
    $conflict->execute([$teamMemberId, $bookingId, $booking['scheduled_at']]);
    if ($conflict->fetch()) {
        ds_error(409, 'ASSIGNMENT_CONFLICT', 'That team member already has a booking in this slot.');
    }
    $pdo->prepare('UPDATE bookings SET team_member_id = ?, updated_at = ? WHERE id = ?')
        ->execute([$teamMemberId, $now, $bookingId]);
    ds_booking_log($bookingId, $user['id'], 'team_assigned', (string) $booking['status'], (string) $booking['status']);
    ds_success(['assigned' => true]);
}

$to = strtolower(trim((string) ($body['status'] ?? '')));
$note = trim((string) ($body['note'] ?? ''));
$from = (string) $booking['status'];

if (!ds_booking_transition_allowed($from, $to)) {
    ds_error(409, 'INVALID_TRANSITION', 'That status change is not allowed from ' . $from . '.');
}

$pdo->prepare('UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?')
    ->execute([$to, $now, $bookingId]);
ds_booking_log($bookingId, $user['id'], 'provider_status_changed', $from, $to, $note !== '' ? $note : null);

ds_success(['bookingId' => $bookingId, 'status' => $to]);
