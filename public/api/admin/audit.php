<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

ds_require_permission('audit.read');
if (!ds_cms_ready()) {
    ds_error(503, 'SCHEMA_NOT_MIGRATED', 'This area needs the database migration. Run: php scripts/migrate.php --apply');
}

ds_require_method('GET');

$page = max(1, (int) ($_GET['page'] ?? 1));
$perPage = min(100, max(10, (int) ($_GET['perPage'] ?? 30)));
$offset = ($page - 1) * $perPage;

$pdo = ds_pdo();
$rows = [];
$total = 0;
try {
    $total = (int) ($pdo->query('SELECT COUNT(*) AS c FROM admin_audit_log')->fetch()['c'] ?? 0);
    $rows = $pdo->query(
        "SELECT a.*, u.email AS actor_email, u.first_name AS actor_first
         FROM admin_audit_log a
         LEFT JOIN users u ON u.id = a.actor_user_id
         ORDER BY a.created_at DESC LIMIT $perPage OFFSET $offset"
    )->fetchAll() ?: [];
} catch (Throwable $e) {
    $rows = [];
}

ds_success([
    'entries' => array_map(static function (array $row): array {
        $meta = null;
        if (!empty($row['meta_json'])) {
            $decoded = json_decode((string) $row['meta_json'], true);
            $meta = is_array($decoded) ? $decoded : null;
        }
        return [
            'id' => (string) $row['id'],
            'action' => (string) $row['action'],
            'entityType' => $row['entity_type'],
            'entityId' => $row['entity_id'],
            'meta' => $meta,
            'actor' => $row['actor_email'] ?? null,
            'createdAt' => $row['created_at'],
        ];
    }, $rows),
    'total' => $total,
    'page' => $page,
    'perPage' => $perPage,
]);
