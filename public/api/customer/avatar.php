<?php
declare(strict_types=1);

/**
 * Customer profile photo. Reuses the existing public media pipeline and
 * gallery table with an isolated customer-<userId> owner key, so no schema
 * migration is needed and one customer can never address another's image.
 */

require_once dirname(__DIR__) . '/config/bootstrap.php';

$user = ds_require_user();
if (!in_array((string) ($user['role'] ?? ''), ['user', 'customer'], true)) {
    ds_error(403, 'FORBIDDEN', 'Customer access only.');
}
ds_require_same_origin();
ds_rate_limit('customer_avatar_' . $user['id'], 20, 15 * 60);
ds_ensure_provider_moderation_schema();

$ownerKey = 'customer-' . (string) $user['id'];
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
    ds_success(['avatarUrl' => ds_customer_avatar_url((string) $user['id'])]);
}

if ($method === 'DELETE') {
    $stmt = ds_pdo()->prepare(
        "SELECT * FROM provider_gallery_images WHERE provider_profile_id = ? AND kind = 'customer_avatar'"
    );
    $stmt->execute([$ownerKey]);
    $rows = $stmt->fetchAll() ?: [];
    foreach ($rows as $row) {
        ds_unlink_provider_media_file($row['path'] ?? null);
        ds_unlink_provider_media_file($row['thumb_path'] ?? null);
    }
    ds_pdo()->prepare(
        "DELETE FROM provider_gallery_images WHERE provider_profile_id = ? AND kind = 'customer_avatar'"
    )->execute([$ownerKey]);
    ds_audit('customer.avatar.remove', 'user', (string) $user['id'], [], (string) $user['id']);
    ds_success(['removed' => true, 'avatarUrl' => null]);
}

ds_require_method('POST');
if (empty($_FILES['file'])) {
    ds_error(400, 'VALIDATION_ERROR', 'Choose or take a profile photo.');
}

$processed = ds_process_provider_image($_FILES['file'], $ownerKey, 5 * 1024 * 1024);
$id = ds_new_id();
$now = ds_now_sql();
$pdo = ds_pdo();
$pdo->beginTransaction();
try {
    $old = $pdo->prepare(
        "SELECT * FROM provider_gallery_images WHERE provider_profile_id = ? AND kind = 'customer_avatar'"
    );
    $old->execute([$ownerKey]);
    $previous = $old->fetchAll() ?: [];
    $pdo->prepare(
        "DELETE FROM provider_gallery_images WHERE provider_profile_id = ? AND kind = 'customer_avatar'"
    )->execute([$ownerKey]);
    $pdo->prepare(
        "INSERT INTO provider_gallery_images
         (id, provider_profile_id, team_member_id, kind, path, thumb_path, filename, mime, size_bytes,
          width, height, alt_text, description, sort_order, moderation_status, uploaded_by, created_at, updated_at)
         VALUES (?, ?, NULL, 'customer_avatar', ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, 'approved', ?, ?, ?)"
    )->execute([
        $id,
        $ownerKey,
        $processed['path'],
        $processed['thumbPath'],
        $processed['filename'],
        $processed['mime'],
        $processed['sizeBytes'],
        $processed['width'],
        $processed['height'],
        'Customer profile photo',
        (string) $user['id'],
        $now,
        $now,
    ]);
    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    ds_unlink_provider_media_file($processed['path'] ?? null);
    ds_unlink_provider_media_file($processed['thumbPath'] ?? null);
    throw $e;
}
foreach ($previous as $row) {
    ds_unlink_provider_media_file($row['path'] ?? null);
    ds_unlink_provider_media_file($row['thumb_path'] ?? null);
}
ds_audit('customer.avatar.upload', 'user', (string) $user['id'], [], (string) $user['id']);

ds_success([
    'saved' => true,
    'avatarUrl' => $processed['path'],
    'thumbUrl' => $processed['thumbPath'] ?? $processed['path'],
]);
