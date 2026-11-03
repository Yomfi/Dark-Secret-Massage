<?php
declare(strict_types=1);

/** Website announcements + recent CMS change feed for the Updates section. */

require_once dirname(__DIR__) . '/config/bootstrap.php';

$admin = ds_require_permission('content.read');
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$pdo = ds_pdo();

if (!ds_table_exists('cms_announcements')) {
    ds_error(503, 'SCHEMA_NOT_MIGRATED', 'Announcements need migration. Run: php scripts/migrate.php --apply');
}

if ($method === 'GET') {
    $rows = $pdo->query(
        'SELECT * FROM cms_announcements ORDER BY COALESCE(published_at, updated_at) DESC LIMIT 100'
    )->fetchAll() ?: [];

    $recent = [];
    if (ds_table_exists('admin_audit_log')) {
        $recent = $pdo->query(
            "SELECT id, action, entity_type, entity_id, actor_user_id, created_at
             FROM admin_audit_log
             WHERE action LIKE 'content.%'
                OR action LIKE 'media.%'
                OR action LIKE 'service.%'
                OR action LIKE 'announcement.%'
             ORDER BY created_at DESC LIMIT 40"
        )->fetchAll() ?: [];
    }

    ds_success([
        'announcements' => array_map(static function (array $r): array {
            return [
                'id' => (string) $r['id'],
                'title' => (string) $r['title'],
                'bodyHtml' => (string) ($r['body_html'] ?? ''),
                'status' => (string) $r['status'],
                'publishedAt' => $r['published_at'],
                'updatedAt' => $r['updated_at'],
                'createdAt' => $r['created_at'],
            ];
        }, $rows),
        'recentChanges' => array_map(static function (array $r): array {
            return [
                'id' => (string) $r['id'],
                'action' => (string) $r['action'],
                'entityType' => $r['entity_type'],
                'entityId' => $r['entity_id'],
                'actorUserId' => $r['actor_user_id'],
                'createdAt' => $r['created_at'],
            ];
        }, $recent),
    ]);
}

ds_require_method('POST');
ds_require_same_origin();
ds_require_permission('content.write');
ds_rate_limit('admin_announcements', 40, 15 * 60);

$body = ds_json_body();
$action = strtolower(trim((string) ($body['action'] ?? 'save')));
$now = ds_now_sql();

if ($action === 'save') {
    $id = trim((string) ($body['id'] ?? ''));
    $title = trim((string) ($body['title'] ?? ''));
    $bodyHtml = (string) ($body['bodyHtml'] ?? '');
    if ($title === '') {
        ds_error(400, 'VALIDATION_ERROR', 'Title is required.');
    }
    if ($id === '') {
        $id = ds_new_id();
        $pdo->prepare(
            'INSERT INTO cms_announcements (id, title, body_html, status, created_by, updated_by, created_at, updated_at)
             VALUES (?, ?, ?, \'draft\', ?, ?, ?, ?)'
        )->execute([$id, $title, $bodyHtml, $admin['id'], $admin['id'], $now, $now]);
        ds_audit('announcement.created', 'announcement', $id, ['title' => $title], $admin['id']);
    } else {
        $pdo->prepare(
            'UPDATE cms_announcements SET title = ?, body_html = ?, updated_by = ?, updated_at = ? WHERE id = ?'
        )->execute([$title, $bodyHtml, $admin['id'], $now, $id]);
        ds_audit('announcement.updated', 'announcement', $id, ['title' => $title], $admin['id']);
    }
    ds_success(['id' => $id, 'status' => 'draft']);
}

if ($action === 'publish' || $action === 'unpublish') {
    $id = trim((string) ($body['id'] ?? ''));
    if ($id === '') {
        ds_error(400, 'VALIDATION_ERROR', 'id is required.');
    }
    if ($action === 'publish') {
        $pdo->prepare(
            'UPDATE cms_announcements SET status = \'published\', published_at = ?, updated_by = ?, updated_at = ? WHERE id = ?'
        )->execute([$now, $admin['id'], $now, $id]);
    } else {
        $pdo->prepare(
            'UPDATE cms_announcements SET status = \'draft\', updated_by = ?, updated_at = ? WHERE id = ?'
        )->execute([$admin['id'], $now, $id]);
    }
    ds_audit('announcement.' . $action, 'announcement', $id, [], $admin['id']);
    ds_success(['id' => $id, 'status' => $action === 'publish' ? 'published' : 'draft']);
}

if ($action === 'delete') {
    $id = trim((string) ($body['id'] ?? ''));
    if ($id === '') {
        ds_error(400, 'VALIDATION_ERROR', 'id is required.');
    }
    $pdo->prepare('DELETE FROM cms_announcements WHERE id = ?')->execute([$id]);
    ds_audit('announcement.deleted', 'announcement', $id, [], $admin['id']);
    ds_success(['deleted' => true]);
}

ds_error(400, 'VALIDATION_ERROR', 'Unknown announcements action.');
