<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';
require_once dirname(__DIR__) . '/config/actions.php';

$admin = ds_require_permission('actions.undo');
ds_ensure_assignments_schema();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$pdo = ds_pdo();

if ($method === 'GET') {
    $limit = min(50, max(1, (int) ($_GET['limit'] ?? 20)));
    $stmt = $pdo->query(
        "SELECT r.*, u.email AS actor_email
         FROM admin_reversible_actions r
         LEFT JOIN users u ON CAST(u.id AS BINARY) = CAST(r.actor_user_id AS BINARY)
         ORDER BY r.created_at DESC LIMIT $limit"
    );
    $rows = $stmt->fetchAll() ?: [];

    ds_success([
        'actions' => array_map(static function (array $row): array {
            $meta = null;
            if (!empty($row['meta_json'])) {
                $decoded = json_decode((string) $row['meta_json'], true);
                $meta = is_array($decoded) ? $decoded : null;
            }
            return [
                'id' => (string) $row['id'],
                'action' => (string) $row['action'],
                'label' => (string) $row['label'],
                'entityType' => (string) $row['entity_table'],
                'entityId' => (string) $row['entity_id'],
                'meta' => $meta,
                'actor' => $row['actor_email'] ?? null,
                'createdAt' => $row['created_at'],
                'undoneAt' => $row['undone_at'],
                'canUndo' => empty($row['undone_at']) && !empty($row['before_json']) && (string) $row['before_json'] !== '{}',
                'canRedo' => !empty($row['undone_at']),
            ];
        }, $rows),
    ]);
}

ds_require_method('POST');
ds_require_same_origin();
ds_rate_limit('admin_undo', 60, 15 * 60);

$body = ds_json_body();
$actionId = trim((string) ($body['actionId'] ?? ''));
$mode = strtolower(trim((string) ($body['mode'] ?? 'undo')));
if ($actionId === '') {
    ds_error(400, 'VALIDATION_ERROR', 'actionId is required.');
}

$result = ds_reversible_apply($actionId, $mode, $admin);
ds_success($result + ['mode' => $mode]);
