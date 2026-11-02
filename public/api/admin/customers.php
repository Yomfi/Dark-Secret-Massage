<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

$admin = ds_require_admin();
if (!ds_cms_ready()) {
    ds_error(503, 'SCHEMA_NOT_MIGRATED', 'This area needs the database migration. Run: php scripts/migrate.php --apply');
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
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
    $pdo = ds_pdo();

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
ds_rate_limit('admin_customers', 60, 15 * 60);

$body = ds_json_body();
$userId = trim((string) ($body['userId'] ?? ''));
$action = strtolower(trim((string) ($body['action'] ?? '')));

if ($userId === '' || !in_array($action, ['suspend', 'activate'], true)) {
    ds_error(400, 'VALIDATION_ERROR', 'Invalid customer action.');
}

$stmt = ds_pdo()->prepare("SELECT id, role FROM users WHERE id = ? AND role = 'user' LIMIT 1");
$stmt->execute([$userId]);
$target = $stmt->fetch();
if (!$target) {
    ds_error(404, 'NOT_FOUND', 'Customer not found.');
}

$status = $action === 'suspend' ? 'suspended' : 'active';
ds_pdo()->prepare('UPDATE users SET account_status = ?, updated_at = ? WHERE id = ?')
    ->execute([$status, ds_now_sql(), $userId]);

ds_audit('customer.' . $action, 'user', $userId, [], $admin['id']);
ds_success(['userId' => $userId, 'status' => $status]);
