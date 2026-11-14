<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

$admin = ds_require_permission('services.read');
if (!ds_cms_ready()) {
    ds_error(503, 'SCHEMA_NOT_MIGRATED', 'This area needs the database migration. Run: php scripts/migrate.php --apply');
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
    $rows = ds_pdo()->query(
        'SELECT * FROM services WHERE provider_profile_id IS NULL ORDER BY sort_order ASC, name ASC'
    )->fetchAll() ?: [];
    ds_success([
        'services' => array_map(static function (array $row): array {
            $dto = ds_service_row_to_public($row);
            $dto['updatedAt'] = $row['updated_at'] ?? null;
            return $dto;
        }, $rows),
    ]);
}

ds_require_same_origin();
ds_require_permission('services.write');

if ($method === 'DELETE') {
    $body = ds_json_body();
    $id = trim((string) ($body['id'] ?? ''));
    if ($id === '') {
        ds_error(400, 'VALIDATION_ERROR', 'Service id is required.');
    }
    ds_pdo()->prepare('DELETE FROM services WHERE id = ? AND provider_profile_id IS NULL')->execute([$id]);
    ds_audit('service.delete', 'service', $id, [], $admin['id']);
    ds_success(['deleted' => true]);
}

ds_require_method('POST');
ds_rate_limit('admin_services', 60, 15 * 60);

$body = ds_json_body();
$id = trim((string) ($body['id'] ?? ''));
$name = trim((string) ($body['name'] ?? ''));
$description = trim((string) ($body['description'] ?? ''));
$duration = (int) ($body['durationMinutes'] ?? 60);
$price = (float) ($body['price'] ?? 0);
$currency = strtoupper(trim((string) ($body['currency'] ?? 'GHS')));
$image = trim((string) ($body['image'] ?? ''));
$category = trim((string) ($body['category'] ?? ''));
$active = !empty($body['active']);
$sortOrder = (int) ($body['sortOrder'] ?? 0);

if ($name === '' || mb_strlen($name) > 160) {
    ds_error(400, 'VALIDATION_ERROR', 'Enter a service name (max 160 characters).');
}
if ($duration < 15 || $duration > 480) {
    ds_error(400, 'VALIDATION_ERROR', 'Duration must be between 15 and 480 minutes.');
}
if ($price < 0 || $price > 100000) {
    ds_error(400, 'VALIDATION_ERROR', 'Enter a valid price.');
}
if ($currency === '' || strlen($currency) > 8) {
    $currency = 'GHS';
}

// Adults-only catalogue entries are always stored in the adult category so the
// public catalogue can label them, whatever the form submitted.
if (ds_is_adult_service_name($name)) {
    $category = 'adult';
}

$now = ds_now_sql();
$pdo = ds_pdo();

if ($id !== '') {
    $stmt = $pdo->prepare('SELECT id FROM services WHERE id = ? AND provider_profile_id IS NULL LIMIT 1');
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        ds_error(404, 'NOT_FOUND', 'Service not found.');
    }
    $pdo->prepare(
        'UPDATE services SET name = ?, description = ?, duration_minutes = ?, price = ?, currency = ?,
            image_path = ?, category = ?, is_active = ?, sort_order = ?, updated_at = ?
         WHERE id = ? AND provider_profile_id IS NULL'
    )->execute([
        $name, $description !== '' ? $description : null, $duration, $price, $currency,
        $image !== '' ? $image : null, $category !== '' ? $category : null,
        $active ? 1 : 0, $sortOrder, $now, $id,
    ]);
    ds_audit('service.update', 'service', $id, ['active' => $active], $admin['id']);
    ds_success(['saved' => true, 'id' => $id]);
}

$id = ds_new_id();
$pdo->prepare(
    'INSERT INTO services
     (id, provider_profile_id, name, description, duration_minutes, price, currency, image_path,
      category, is_active, sort_order, created_by, created_at, updated_at)
     VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
)->execute([
    $id, $name, $description !== '' ? $description : null, $duration, $price, $currency,
    $image !== '' ? $image : null, $category !== '' ? $category : null,
    $active ? 1 : 0, $sortOrder, $admin['id'], $now, $now,
]);

ds_audit('service.create', 'service', $id, ['name' => $name], $admin['id']);
ds_success(['saved' => true, 'id' => $id]);
