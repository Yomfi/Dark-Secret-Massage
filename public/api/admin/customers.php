<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

$admin = ds_require_permission('customers.read');
if (!ds_cms_ready()) {
    ds_error(503, 'SCHEMA_NOT_MIGRATED', 'This area needs the database migration. Run: php scripts/migrate.php --apply');
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$pdo = ds_pdo();

if ($method === 'GET') {
    $detailId = trim((string) ($_GET['id'] ?? ''));
    if ($detailId !== '') {
        $stmt = $pdo->prepare(
            "SELECT id, first_name, last_name, email, phone, account_status, email_verified_at, created_at, updated_at
             FROM users WHERE id = ? AND role = 'user' LIMIT 1"
        );
        $stmt->execute([$detailId]);
        $row = $stmt->fetch();
        if (!$row) {
            ds_error(404, 'NOT_FOUND', 'Customer not found.');
        }

        $bookings = [];
        if (ds_table_exists('bookings')) {
            $b = $pdo->prepare(
                'SELECT id, reference, status, service_name, price, currency, scheduled_at, time_slot,
                        location_type, address, created_at, updated_at
                 FROM bookings WHERE customer_user_id = ? ORDER BY COALESCE(scheduled_at, created_at) DESC LIMIT 50'
            );
            $b->execute([$detailId]);
            $bookings = array_map(static function (array $bk): array {
                return [
                    'id' => (string) $bk['id'],
                    'reference' => $bk['reference'],
                    'status' => (string) $bk['status'],
                    'serviceName' => (string) $bk['service_name'],
                    'price' => (float) $bk['price'],
                    'currency' => (string) $bk['currency'],
                    'scheduledAt' => $bk['scheduled_at'],
                    'timeSlot' => $bk['time_slot'],
                    'locationType' => $bk['location_type'],
                    'address' => $bk['address'],
                    'createdAt' => $bk['created_at'],
                ];
            }, $b->fetchAll() ?: []);
        }

        $notes = [];
        if (ds_table_exists('customer_notes')) {
            $n = $pdo->prepare(
                'SELECT n.id, n.body, n.created_at, u.first_name, u.last_name, u.email
                 FROM customer_notes n
                 LEFT JOIN users u ON u.id = n.author_user_id
                 WHERE n.customer_user_id = ?
                 ORDER BY n.created_at DESC LIMIT 40'
            );
            $n->execute([$detailId]);
            $notes = array_map(static function (array $note): array {
                return [
                    'id' => (string) $note['id'],
                    'body' => (string) $note['body'],
                    'createdAt' => $note['created_at'],
                    'author' => trim(($note['first_name'] ?? '') . ' ' . ($note['last_name'] ?? ''))
                        ?: ($note['email'] ?? 'Staff'),
                ];
            }, $n->fetchAll() ?: []);
        }

        $privacy = [];
        if (ds_table_exists('privacy_requests')) {
            $p = $pdo->prepare(
                'SELECT id, request_type, status, notes, created_at, resolved_at
                 FROM privacy_requests WHERE customer_user_id = ? ORDER BY created_at DESC LIMIT 20'
            );
            $p->execute([$detailId]);
            $privacy = array_map(static function (array $pr): array {
                return [
                    'id' => (string) $pr['id'],
                    'type' => (string) $pr['request_type'],
                    'status' => (string) $pr['status'],
                    'notes' => $pr['notes'],
                    'createdAt' => $pr['created_at'],
                    'resolvedAt' => $pr['resolved_at'],
                ];
            }, $p->fetchAll() ?: []);
        }

        ds_success([
            'customer' => [
                'id' => (string) $row['id'],
                'name' => trim(($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? '')),
                'firstName' => (string) ($row['first_name'] ?? ''),
                'lastName' => (string) ($row['last_name'] ?? ''),
                'email' => (string) $row['email'],
                'phone' => (string) ($row['phone'] ?? ''),
                'status' => (string) $row['account_status'],
                'emailVerified' => !empty($row['email_verified_at']),
                'isQa' => function_exists('ds_is_qa_email') && ds_is_qa_email((string) $row['email']),
                'createdAt' => $row['created_at'] ?? null,
                'updatedAt' => $row['updated_at'] ?? null,
            ],
            'bookings' => $bookings,
            'notes' => $notes,
            'privacyRequests' => $privacy,
        ]);
    }

    $search = trim((string) ($_GET['q'] ?? ''));
    $page = max(1, (int) ($_GET['page'] ?? 1));
    $perPage = min(50, max(10, (int) ($_GET['perPage'] ?? 20)));
    $offset = ($page - 1) * $perPage;

    $where = ["role = 'user'"];
    $params = [];
    if ($search !== '') {
        $where[] = '(email LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR phone LIKE ?)';
        $like = '%' . $search . '%';
        array_push($params, $like, $like, $like, $like);
    }
    $whereSql = 'WHERE ' . implode(' AND ', $where);

    $total = 0;
    $list = [];
    try {
        $stmt = $pdo->prepare("SELECT COUNT(*) AS c FROM users $whereSql");
        $stmt->execute($params);
        $total = (int) ($stmt->fetch()['c'] ?? 0);

        $stmt = $pdo->prepare(
            "SELECT id, first_name, last_name, email, phone, account_status, email_verified_at, created_at
             FROM users $whereSql ORDER BY created_at DESC LIMIT $perPage OFFSET $offset"
        );
        $stmt->execute($params);
        $list = $stmt->fetchAll() ?: [];
    } catch (Throwable $e) {
        $list = [];
    }

    $bookingCounts = [];
    if ($list !== [] && ds_table_exists('bookings')) {
        $ids = array_column($list, 'id');
        $in = implode(',', array_fill(0, count($ids), '?'));
        try {
            $stmt = $pdo->prepare(
                "SELECT customer_user_id, COUNT(*) AS c, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS done
                 FROM bookings WHERE customer_user_id IN ($in) GROUP BY customer_user_id"
            );
            $stmt->execute($ids);
            foreach ($stmt->fetchAll() ?: [] as $row) {
                $bookingCounts[(string) $row['customer_user_id']] = [
                    'total' => (int) $row['c'],
                    'completed' => (int) $row['done'],
                ];
            }
        } catch (Throwable $e) {
            $bookingCounts = [];
        }
    }

    ds_success([
        'customers' => array_map(static function (array $row) use ($bookingCounts): array {
            $stats = $bookingCounts[(string) $row['id']] ?? ['total' => 0, 'completed' => 0];
            return [
                'id' => (string) $row['id'],
                'name' => trim(($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? '')),
                'email' => (string) $row['email'],
                'phone' => (string) ($row['phone'] ?? ''),
                'status' => (string) $row['account_status'],
                'emailVerified' => !empty($row['email_verified_at']),
                'isQa' => function_exists('ds_is_qa_email') && ds_is_qa_email((string) $row['email']),
                'createdAt' => $row['created_at'] ?? null,
                'bookings' => $stats['total'],
                'completedBookings' => $stats['completed'],
            ];
        }, $list),
        'page' => $page,
        'perPage' => $perPage,
        'total' => $total,
    ]);
}

ds_require_method('POST');
ds_require_same_origin();
ds_require_permission('customers.write');
ds_rate_limit('admin_customers', 60, 15 * 60);

$body = ds_json_body();
$userId = trim((string) ($body['userId'] ?? ''));
$action = strtolower(trim((string) ($body['action'] ?? '')));

if ($action === 'add_note') {
    if ($userId === '' || !ds_table_exists('customer_notes')) {
        ds_error(400, 'VALIDATION_ERROR', 'Customer and notes table required.');
    }
    $noteBody = trim((string) ($body['body'] ?? ''));
    if ($noteBody === '' || mb_strlen($noteBody) > 4000) {
        ds_error(400, 'VALIDATION_ERROR', 'Note text is required (max 4000 characters).');
    }
    $stmt = $pdo->prepare("SELECT id FROM users WHERE id = ? AND role = 'user' LIMIT 1");
    $stmt->execute([$userId]);
    if (!$stmt->fetch()) {
        ds_error(404, 'NOT_FOUND', 'Customer not found.');
    }
    $id = ds_new_id();
    $pdo->prepare(
        'INSERT INTO customer_notes (id, customer_user_id, author_user_id, body, created_at) VALUES (?, ?, ?, ?, ?)'
    )->execute([$id, $userId, $admin['id'], $noteBody, ds_now_sql()]);
    ds_audit('customer.note_added', 'user', $userId, ['noteId' => $id], $admin['id']);
    ds_success(['noteId' => $id]);
}

if ($action === 'update_profile') {
    if ($userId === '') {
        ds_error(400, 'VALIDATION_ERROR', 'userId is required.');
    }
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ? AND role = 'user' LIMIT 1");
    $stmt->execute([$userId]);
    $target = $stmt->fetch();
    if (!$target) {
        ds_error(404, 'NOT_FOUND', 'Customer not found.');
    }
    $firstName = trim((string) ($body['firstName'] ?? $target['first_name']));
    $lastName = trim((string) ($body['lastName'] ?? $target['last_name']));
    $phone = trim((string) ($body['phone'] ?? $target['phone']));
    if ($firstName === '' || mb_strlen($firstName) > 100) {
        ds_error(400, 'VALIDATION_ERROR', 'First name is required.');
    }
    $pdo->prepare('UPDATE users SET first_name = ?, last_name = ?, phone = ?, updated_at = ? WHERE id = ?')
        ->execute([$firstName, $lastName, $phone, ds_now_sql(), $userId]);
    ds_audit('customer.profile_updated', 'user', $userId, [
        'firstName' => $firstName,
        'lastName' => $lastName,
    ], $admin['id']);
    ds_success(['userId' => $userId, 'updated' => true]);
}

if ($action === 'privacy_request') {
    ds_require_permission('privacy.write');
    if ($userId === '' || !ds_table_exists('privacy_requests')) {
        ds_error(400, 'VALIDATION_ERROR', 'Customer and privacy table required.');
    }
    $type = strtolower(trim((string) ($body['requestType'] ?? '')));
    if (!in_array($type, ['export', 'deletion'], true)) {
        ds_error(400, 'VALIDATION_ERROR', 'requestType must be export or deletion.');
    }
    $notes = trim((string) ($body['notes'] ?? ''));
    $id = ds_new_id();
    $now = ds_now_sql();
    $pdo->prepare(
        'INSERT INTO privacy_requests (id, customer_user_id, request_type, status, notes, created_by, created_at, updated_at)
         VALUES (?, ?, ?, \'open\', ?, ?, ?, ?)'
    )->execute([$id, $userId, $type, $notes !== '' ? $notes : null, $admin['id'], $now, $now]);
    ds_audit('customer.privacy_' . $type, 'user', $userId, ['requestId' => $id], $admin['id']);
    ds_success(['requestId' => $id, 'status' => 'open']);
}

if ($action === 'resolve_privacy') {
    ds_require_permission('privacy.write');
    $requestId = trim((string) ($body['requestId'] ?? ''));
    $status = strtolower(trim((string) ($body['status'] ?? 'resolved')));
    if ($requestId === '' || !in_array($status, ['resolved', 'rejected', 'open'], true)) {
        ds_error(400, 'VALIDATION_ERROR', 'Invalid privacy resolution.');
    }
    $now = ds_now_sql();
    $pdo->prepare(
        'UPDATE privacy_requests SET status = ?, resolved_by = ?, resolved_at = ?, updated_at = ? WHERE id = ?'
    )->execute([$status, $admin['id'], $status === 'open' ? null : $now, $now, $requestId]);
    ds_audit('customer.privacy_resolved', 'privacy_request', $requestId, ['status' => $status], $admin['id']);
    ds_success(['requestId' => $requestId, 'status' => $status]);
}

if ($action === 'close_account') {
    if ($userId === '') {
        ds_error(400, 'VALIDATION_ERROR', 'userId is required.');
    }
    $confirm = trim((string) ($body['confirm'] ?? ''));
    if ($confirm !== 'CLOSE') {
        ds_error(400, 'CONFIRMATION_REQUIRED', 'Send confirm=CLOSE to close this account.');
    }
    $stmt = $pdo->prepare("SELECT id FROM users WHERE id = ? AND role = 'user' LIMIT 1");
    $stmt->execute([$userId]);
    if (!$stmt->fetch()) {
        ds_error(404, 'NOT_FOUND', 'Customer not found.');
    }
    $pdo->prepare('UPDATE users SET account_status = \'deleted\', updated_at = ? WHERE id = ?')
        ->execute([ds_now_sql(), $userId]);
    ds_audit('customer.closed', 'user', $userId, [], $admin['id']);
    ds_success(['userId' => $userId, 'status' => 'deleted']);
}

if ($userId === '' || !in_array($action, ['suspend', 'activate'], true)) {
    ds_error(400, 'VALIDATION_ERROR', 'Invalid customer action.');
}

$stmt = $pdo->prepare("SELECT id, role FROM users WHERE id = ? AND role = 'user' LIMIT 1");
$stmt->execute([$userId]);
$target = $stmt->fetch();
if (!$target) {
    ds_error(404, 'NOT_FOUND', 'Customer not found.');
}

$status = $action === 'suspend' ? 'suspended' : 'active';
$pdo->prepare('UPDATE users SET account_status = ?, updated_at = ? WHERE id = ?')
    ->execute([$status, ds_now_sql(), $userId]);

ds_audit('customer.' . $action, 'user', $userId, [], $admin['id']);
ds_success(['userId' => $userId, 'status' => $status]);
