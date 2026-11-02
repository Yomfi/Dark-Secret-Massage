<?php
declare(strict_types=1);

/** Provider-owned service catalogue (individual or agency). */

require_once dirname(__DIR__) . '/config/bootstrap.php';

$user = ds_require_provider();
if (!ds_cms_ready()) {
    ds_error(503, 'SCHEMA_NOT_MIGRATED', 'This area needs the database migration. Run: php scripts/migrate.php --apply');
}

$profile = ds_provider_profile_by_user($user['id']);
if (!$profile) {
    ds_error(400, 'VALIDATION_ERROR', 'Complete your profile before managing services.');
}
$profileId = (string) $profile['id'];
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$pdo = ds_pdo();

$list = static function () use ($pdo, $profileId): array {
    $stmt = $pdo->prepare(
        'SELECT * FROM services WHERE provider_profile_id = ? ORDER BY sort_order ASC, name ASC'
    );
    $stmt->execute([$profileId]);
    return array_map('ds_service_row_to_public', $stmt->fetchAll() ?: []);
};

if ($method === 'GET') {
    ds_success(['services' => $list()]);
}

ds_require_same_origin();

if ($method === 'DELETE') {
    $body = ds_json_body();
    $id = trim((string) ($body['id'] ?? ''));
    $stmt = $pdo->prepare('DELETE FROM services WHERE id = ? AND provider_profile_id = ?');
    $stmt->execute([$id, $profileId]);
    ds_success(['deleted' => true, 'services' => $list()]);
}

ds_require_method('POST');
ds_rate_limit('provider_services', 40, 15 * 60);

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
    ds_error(400, 'VALIDATION_ERROR', 'Enter a service name.');
}
if ($duration < 15 || $duration > 480) {
    ds_error(400, 'VALIDATION_ERROR', 'Duration must be between 15 and 480 minutes.');
}
if ($price < 0 || $price > 100000) {
    ds_error(400, 'VALIDATION_ERROR', 'Enter a valid price.');
}
if (strlen($currency) > 8 || $currency === '') {
    $currency = 'GHS';
}

$now = ds_now_sql();
if ($id !== '') {
    $check = $pdo->prepare('SELECT id FROM services WHERE id = ? AND provider_profile_id = ? LIMIT 1');
    $check->execute([$id, $profileId]);
    if (!$check->fetch()) {
        ds_error(404, 'NOT_FOUND', 'Service not found.');
    }
    $pdo->prepare(
        'UPDATE services SET name = ?, description = ?, duration_minutes = ?, price = ?, currency = ?,
            image_path = ?, category = ?, is_active = ?, sort_order = ?, updated_at = ?
         WHERE id = ? AND provider_profile_id = ?'
    )->execute([$name, $description !== '' ? $description : null, $duration, $price, $currency,
        $image !== '' ? $image : null, $category !== '' ? $category : null, $active ? 1 : 0,
        $sortOrder, $now, $id, $profileId]);
    ds_success(['saved' => true, 'id' => $id, 'services' => $list()]);
}

$id = ds_new_id();
$pdo->prepare(
    'INSERT INTO services (id, provider_profile_id, name, description, duration_minutes, price, currency,
        image_path, category, is_active, sort_order, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
)->execute([$id, $profileId, $name, $description !== '' ? $description : null, $duration, $price,
    $currency, $image !== '' ? $image : null, $category !== '' ? $category : null,
    $active ? 1 : 0, $sortOrder, $user['id'], $now, $now]);

ds_success(['saved' => true, 'id' => $id, 'services' => $list()], 201);
