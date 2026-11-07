<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';
require_once dirname(__DIR__) . '/config/assignments.php';
require_once dirname(__DIR__) . '/config/actions.php';

$admin = ds_require_permission('assignments.read');
ds_ensure_assignments_schema();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$pdo = ds_pdo();

$statuses = ds_assignment_statuses();

function ds_assignment_dto(array $row): array
{
    $status = (string) $row['status'];
    $transitions = ds_assignment_transitions();
    return [
        'id' => (string) $row['id'],
        'customerUserId' => (string) $row['customer_user_id'],
        'customerName' => trim((string) ($row['customer_name'] ?? '')) ?: (string) ($row['customer_email'] ?? 'Customer'),
        'customerEmail' => $row['customer_email'] ?? null,
        'customerPhone' => $row['customer_phone'] ?? null,
        'providerProfileId' => (string) $row['provider_profile_id'],
        'providerName' => $row['provider_name'] ?? null,
        'providerType' => $row['provider_type'] ?? 'individual',
        'teamMemberId' => $row['team_member_id'] !== null ? (string) $row['team_member_id'] : null,
        'teamMemberName' => $row['team_name'] ?? null,
        'serviceId' => $row['service_id'] !== null ? (string) $row['service_id'] : null,
        'serviceName' => $row['service_name'] ?? null,
        'preferredAt' => $row['preferred_at'] ?? null,
        'reason' => (string) $row['reason'],
        'notes' => $row['notes'] ?? null,
        'status' => $status,
        'statusLabel' => ds_assignment_statuses()[$status] ?? $status,
        'statusNote' => $row['status_note'] ?? null,
        'allowedTransitions' => $transitions[$status] ?? [],
        'assignedBy' => $row['assigned_by'] ?? null,
        'createdAt' => $row['created_at'] ?? null,
        'updatedAt' => $row['updated_at'] ?? null,
        'cancelledAt' => $row['cancelled_at'] ?? null,
    ];
}

function ds_assignment_fetch(string $id): array
{
    $stmt = ds_pdo()->prepare(
        'SELECT a.*, CONCAT_WS(\' \', cu.first_name, cu.last_name) AS customer_name,
                cu.email AS customer_email, cu.phone AS customer_phone,
                p.display_name AS provider_name, p.provider_type,
                t.display_name AS team_name
         FROM provider_assignments a
         LEFT JOIN users cu ON CAST(cu.id AS BINARY) = CAST(a.customer_user_id AS BINARY)
         LEFT JOIN provider_profiles p ON CAST(p.id AS BINARY) = CAST(a.provider_profile_id AS BINARY)
         LEFT JOIN agency_team_members t ON CAST(t.id AS BINARY) = CAST(a.team_member_id AS BINARY)
         WHERE a.id = ? LIMIT 1'
    );
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        ds_error(404, 'NOT_FOUND', 'Assignment not found.');
    }
    return $row;
}

function ds_assignment_event(string $assignmentId, ?string $actorId, string $event, ?string $from, ?string $to, string $note = ''): void
{
    if (!ds_table_exists('provider_assignment_events')) {
        return;
    }
    ds_pdo()->prepare(
        'INSERT INTO provider_assignment_events (id, assignment_id, actor_user_id, event, from_status, to_status, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([ds_new_id(), $assignmentId, $actorId, $event, $from, $to, $note !== '' ? $note : null, ds_now_sql()]);
}

function ds_assignment_reverse_snapshot(array $row): array
{
    return [
        'status' => (string) $row['status'],
        'provider_profile_id' => (string) $row['provider_profile_id'],
        'team_member_id' => $row['team_member_id'] !== null ? (string) $row['team_member_id'] : null,
        'status_note' => $row['status_note'] ?? null,
        'cancelled_at' => $row['cancelled_at'] ?? null,
    ];
}

if ($method === 'GET') {
    ds_require_method('GET');
    $id = trim((string) ($_GET['id'] ?? ''));

    if ($id !== '') {
        $row = ds_assignment_fetch($id);
        $events = [];
        if (ds_table_exists('provider_assignment_events')) {
            $stmt = $pdo->prepare(
                'SELECT e.*, u.email AS actor_email FROM provider_assignment_events e
                 LEFT JOIN users u ON CAST(u.id AS BINARY) = CAST(e.actor_user_id AS BINARY)
                 WHERE e.assignment_id = ? ORDER BY e.created_at ASC'
            );
            $stmt->execute([$id]);
            $events = array_map(static fn (array $e): array => [
                'id' => (string) $e['id'],
                'event' => (string) $e['event'],
                'fromStatus' => $e['from_status'],
                'toStatus' => $e['to_status'],
                'note' => $e['note'],
                'actor' => $e['actor_email'],
                'createdAt' => $e['created_at'],
            ], $stmt->fetchAll() ?: []);
        }
        ds_success(['assignment' => ds_assignment_dto($row), 'events' => $events, 'statuses' => $statuses]);
    }

    $status = strtolower(trim((string) ($_GET['status'] ?? '')));
    $search = trim((string) ($_GET['q'] ?? ''));
    $customerId = trim((string) ($_GET['customerId'] ?? ''));
    $providerId = trim((string) ($_GET['providerProfileId'] ?? ''));
    $page = max(1, (int) ($_GET['page'] ?? 1));
    $perPage = min(50, max(10, (int) ($_GET['perPage'] ?? 25)));
    $offset = ($page - 1) * $perPage;

    $where = ['1=1'];
    $params = [];
    if ($status !== '' && isset($statuses[$status])) {
        $where[] = 'a.status = ?';
        $params[] = $status;
    }
    if ($customerId !== '') {
        $where[] = 'CAST(a.customer_user_id AS BINARY) = CAST(? AS BINARY)';
        $params[] = $customerId;
    }
    if ($providerId !== '') {
        $where[] = 'a.provider_profile_id = ?';
        $params[] = $providerId;
    }
    if ($search !== '') {
        $where[] = '(cu.email LIKE ? OR cu.first_name LIKE ? OR cu.last_name LIKE ? OR p.display_name LIKE ? OR a.reason LIKE ?)';
        $like = '%' . $search . '%';
        array_push($params, $like, $like, $like, $like, $like);
    }
    $whereSql = implode(' AND ', $where);

    $countStmt = $pdo->prepare(
        "SELECT COUNT(*) AS c FROM provider_assignments a
         LEFT JOIN users cu ON CAST(cu.id AS BINARY) = CAST(a.customer_user_id AS BINARY)
         LEFT JOIN provider_profiles p ON CAST(p.id AS BINARY) = CAST(a.provider_profile_id AS BINARY)
         WHERE $whereSql"
    );
    $countStmt->execute($params);
    $total = (int) ($countStmt->fetch()['c'] ?? 0);

    $stmt = $pdo->prepare(
        "SELECT a.*, CONCAT_WS(' ', cu.first_name, cu.last_name) AS customer_name,
                cu.email AS customer_email, cu.phone AS customer_phone,
                p.display_name AS provider_name, p.provider_type,
                t.display_name AS team_name
         FROM provider_assignments a
         LEFT JOIN users cu ON CAST(cu.id AS BINARY) = CAST(a.customer_user_id AS BINARY)
         LEFT JOIN provider_profiles p ON CAST(p.id AS BINARY) = CAST(a.provider_profile_id AS BINARY)
         LEFT JOIN agency_team_members t ON CAST(t.id AS BINARY) = CAST(a.team_member_id AS BINARY)
         WHERE $whereSql ORDER BY a.created_at DESC LIMIT $perPage OFFSET $offset"
    );
    $stmt->execute($params);

    $counts = [];
    foreach (array_keys($statuses) as $key) {
        $c = $pdo->prepare('SELECT COUNT(*) AS c FROM provider_assignments WHERE status = ?');
        $c->execute([$key]);
        $counts[$key] = (int) ($c->fetch()['c'] ?? 0);
    }

    ds_success([
        'assignments' => array_map('ds_assignment_dto', $stmt->fetchAll() ?: []),
        'counts' => $counts,
        'statuses' => $statuses,
        'total' => $total,
        'page' => $page,
        'perPage' => $perPage,
    ]);
}

ds_require_method('POST');
ds_require_same_origin();
ds_require_permission('assignments.write');
ds_rate_limit('admin_assignments', 120, 15 * 60);

$body = ds_json_body();
$action = strtolower(trim((string) ($body['action'] ?? '')));
$assignmentId = trim((string) ($body['assignmentId'] ?? ''));
$now = ds_now_sql();

if ($action === 'create') {
    $customerId = trim((string) ($body['customerUserId'] ?? ''));
    $providerProfileId = trim((string) ($body['providerProfileId'] ?? ''));
    $teamMemberId = trim((string) ($body['teamMemberId'] ?? ''));
    $serviceId = trim((string) ($body['serviceId'] ?? ''));
    $preferredAt = trim((string) ($body['preferredAt'] ?? ''));
    $reason = trim((string) ($body['reason'] ?? ''));
    $notes = trim((string) ($body['notes'] ?? ''));
    $initialStatus = strtolower(trim((string) ($body['status'] ?? 'proposed')));
    if (!in_array($initialStatus, ['proposed', 'pending_provider_response'], true)) {
        $initialStatus = 'proposed';
    }

    if ($customerId === '' || $providerProfileId === '') {
        ds_error(400, 'VALIDATION_ERROR', 'Select a customer and a provider.');
    }
    if (mb_strlen($reason) < 3) {
        ds_error(400, 'REASON_REQUIRED', 'Give a reason for this assignment.');
    }

    $stmt = $pdo->prepare("SELECT id, email, account_status FROM users WHERE id = ? AND role = 'user' LIMIT 1");
    $stmt->execute([$customerId]);
    $customer = $stmt->fetch();
    if (!$customer) {
        ds_error(404, 'NOT_FOUND', 'Customer not found.');
    }
    if ((string) $customer['account_status'] !== 'active') {
        ds_error(409, 'NOT_ELIGIBLE', 'Only active customer accounts can be assigned.');
    }

    $eligible = ds_assignment_provider_eligible($providerProfileId);
    if (empty($eligible['ok'])) {
        ds_error(409, 'NOT_ELIGIBLE', (string) ($eligible['message'] ?? 'Provider is not eligible.'));
    }
    $profile = $eligible['profile'];

    if ($teamMemberId !== '') {
        $team = ds_assignment_team_member($teamMemberId, $providerProfileId);
        if (empty($team['ok'])) {
            ds_error(409, 'NOT_ELIGIBLE', (string) ($team['message'] ?? 'Team member is not eligible.'));
        }
    } elseif ((string) ($profile['provider_type'] ?? '') === 'agency' && !empty($body['requireTeamMember'])) {
        ds_error(400, 'VALIDATION_ERROR', 'Select the agency professional for this assignment.');
    }

    $serviceName = null;
    if ($serviceId !== '') {
        $stmt = $pdo->prepare('SELECT id, name, provider_profile_id, is_active FROM services WHERE id = ? LIMIT 1');
        $stmt->execute([$serviceId]);
        $service = $stmt->fetch();
        if (!$service) {
            ds_error(404, 'NOT_FOUND', 'Service not found.');
        }
        $serviceProvider = $service['provider_profile_id'] !== null ? (string) $service['provider_profile_id'] : null;
        if ($serviceProvider !== null && $serviceProvider !== $providerProfileId) {
            ds_error(400, 'VALIDATION_ERROR', 'That service belongs to a different provider.');
        }
        $serviceName = (string) $service['name'];
    }

    $preferredSql = null;
    if ($preferredAt !== '') {
        $ts = strtotime($preferredAt);
        if ($ts === false) {
            ds_error(400, 'VALIDATION_ERROR', 'Invalid preferred date/time.');
        }
        $preferredSql = date('Y-m-d H:i:s.000', $ts);
    }

    $assignmentId = ds_new_id();
    $pdo->beginTransaction();
    try {
        $pdo->prepare(
            'INSERT INTO provider_assignments
             (id, customer_user_id, provider_profile_id, team_member_id, service_id, service_name,
              preferred_at, reason, notes, status, assigned_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $assignmentId, $customerId, $providerProfileId, $teamMemberId !== '' ? $teamMemberId : null,
            $serviceId !== '' ? $serviceId : null, $serviceName, $preferredSql, $reason,
            $notes !== '' ? $notes : null, $initialStatus, $admin['id'], $now, $now,
        ]);
        $pdo->prepare(
            'INSERT INTO provider_assignment_events (id, assignment_id, actor_user_id, event, from_status, to_status, note, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([ds_new_id(), $assignmentId, $admin['id'], 'created', null, $initialStatus, 'Assignment created by admin.', $now]);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    $row = ds_assignment_fetch($assignmentId);
    ds_audit('assignment.created', 'provider_assignment', $assignmentId, [
        'customerUserId' => $customerId,
        'providerProfileId' => $providerProfileId,
        'teamMemberId' => $teamMemberId,
        'status' => $initialStatus,
    ], $admin['id']);
    $undoId = ds_reversible_record(
        'assignment.create',
        'Assignment created for ' . (string) ($row['customer_name'] ?? 'customer'),
        'provider_assignments',
        $assignmentId,
        [
            'status' => 'cancelled',
            'provider_profile_id' => $providerProfileId,
            'team_member_id' => $teamMemberId !== '' ? $teamMemberId : null,
            'status_note' => 'Assignment creation undone',
            'cancelled_at' => $now,
        ],
        ds_assignment_reverse_snapshot($row),
        ['status' => $initialStatus],
        $admin['id']
    );
    $notified = false;
    try {
        if (ds_mail_configured()) {
            $notified = ds_assignment_notify($row, 'created');
        }
    } catch (Throwable $e) {
        $notified = false;
    }
    ds_success(['assignment' => ds_assignment_dto($row), 'notified' => $notified, 'undoable' => true, 'undoActionId' => $undoId]);
}

if ($assignmentId === '') {
    ds_error(400, 'VALIDATION_ERROR', 'assignmentId is required.');
}
$before = ds_assignment_fetch($assignmentId);

if ($action === 'update_status' || $action === 'cancel') {
    $to = $action === 'cancel' ? 'cancelled' : strtolower(trim((string) ($body['status'] ?? '')));
    $note = trim((string) ($body['note'] ?? ''));
    $from = (string) $before['status'];
    if (!isset($statuses[$to])) {
        ds_error(400, 'VALIDATION_ERROR', 'Unknown assignment status.');
    }
    $allowed = ds_assignment_transitions()[$from] ?? [];
    if (!in_array($to, $allowed, true)) {
        ds_error(409, 'INVALID_TRANSITION', 'Cannot move an assignment from ' . $from . ' to ' . $to . '.');
    }
    if ((in_array($to, ['declined', 'cancelled'], true) || $action === 'cancel') && mb_strlen($note) < 3) {
        ds_error(400, 'REASON_REQUIRED', 'A reason is required for this status change.');
    }

    $cancelledAt = $to === 'cancelled' ? $now : null;
    $cancelledBy = $to === 'cancelled' ? $admin['id'] : null;
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            'UPDATE provider_assignments SET status = ?, status_note = ?, cancelled_at = ?, cancelled_by = ?, updated_at = ?
             WHERE id = ? AND status = ?'
        );
        $stmt->execute([$to, $note !== '' ? $note : null, $cancelledAt, $cancelledBy, $now, $assignmentId, $from]);
        if ($stmt->rowCount() === 0) {
            $pdo->rollBack();
            ds_error(409, 'CONFLICT', 'This assignment changed. Refresh and try again.');
        }
        ds_assignment_event($assignmentId, $admin['id'], 'status_changed', $from, $to, $note);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    ds_audit('assignment.status_changed', 'provider_assignment', $assignmentId, ['from' => $from, 'to' => $to, 'note' => $note], $admin['id']);
    $after = ds_assignment_fetch($assignmentId);
    $undoId = ds_reversible_record(
        'assignment.status',
        'Assignment ' . $from . ' → ' . $to,
        'provider_assignments',
        $assignmentId,
        ds_assignment_reverse_snapshot($before),
        ds_assignment_reverse_snapshot($after),
        [],
        $admin['id']
    );
    $notified = false;
    try {
        if (ds_mail_configured()) {
            $notified = ds_assignment_notify($after, $to);
        }
    } catch (Throwable $e) {
        $notified = false;
    }
    ds_success(['assignment' => ds_assignment_dto($after), 'notified' => $notified, 'undoable' => true, 'undoActionId' => $undoId]);
}

if ($action === 'reassign') {
    $from = (string) $before['status'];
    if (!in_array($from, ['proposed', 'pending_provider_response', 'accepted'], true)) {
        ds_error(409, 'INVALID_TRANSITION', 'A ' . $from . ' assignment cannot be reassigned.');
    }
    $providerProfileId = trim((string) ($body['providerProfileId'] ?? ''));
    $teamMemberId = trim((string) ($body['teamMemberId'] ?? ''));
    if ($providerProfileId === '') {
        ds_error(400, 'VALIDATION_ERROR', 'Select the new provider.');
    }
    $eligible = ds_assignment_provider_eligible($providerProfileId);
    if (empty($eligible['ok'])) {
        ds_error(409, 'NOT_ELIGIBLE', (string) ($eligible['message'] ?? 'Provider is not eligible.'));
    }
    if ($teamMemberId !== '') {
        $team = ds_assignment_team_member($teamMemberId, $providerProfileId);
        if (empty($team['ok'])) {
            ds_error(409, 'NOT_ELIGIBLE', (string) ($team['message'] ?? 'Team member is not eligible.'));
        }
    }
    $note = trim((string) ($body['note'] ?? ''));
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            'UPDATE provider_assignments SET provider_profile_id = ?, team_member_id = ?, status_note = ?, updated_at = ?
             WHERE id = ? AND status = ? AND provider_profile_id = ?'
        );
        $stmt->execute([
            $providerProfileId, $teamMemberId !== '' ? $teamMemberId : null, $note !== '' ? $note : null,
            $now, $assignmentId, $from, (string) $before['provider_profile_id'],
        ]);
        if ($stmt->rowCount() === 0) {
            $pdo->rollBack();
            ds_error(409, 'CONFLICT', 'This assignment changed. Refresh and try again.');
        }
        ds_assignment_event($assignmentId, $admin['id'], 'reassigned', $from, $from, 'Provider reassigned. ' . $note);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
    ds_audit('assignment.reassigned', 'provider_assignment', $assignmentId, [
        'fromProviderProfileId' => (string) $before['provider_profile_id'],
        'providerProfileId' => $providerProfileId,
        'teamMemberId' => $teamMemberId,
    ], $admin['id']);
    $after = ds_assignment_fetch($assignmentId);
    $undoId = ds_reversible_record(
        'assignment.reassign',
        'Assignment reassigned',
        'provider_assignments',
        $assignmentId,
        ds_assignment_reverse_snapshot($before),
        ds_assignment_reverse_snapshot($after),
        [],
        $admin['id']
    );
    ds_success(['assignment' => ds_assignment_dto($after), 'undoable' => true, 'undoActionId' => $undoId]);
}

if ($action === 'note') {
    $note = trim((string) ($body['note'] ?? ''));
    if (mb_strlen($note) < 3) {
        ds_error(400, 'VALIDATION_ERROR', 'Write a note first.');
    }
    ds_assignment_event($assignmentId, $admin['id'], 'note', (string) $before['status'], (string) $before['status'], $note);
    ds_audit('assignment.note', 'provider_assignment', $assignmentId, ['note' => $note], $admin['id']);
    ds_success(['noted' => true]);
}

ds_error(400, 'VALIDATION_ERROR', 'Unhandled assignment action.');
