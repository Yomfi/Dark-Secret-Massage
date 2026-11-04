<?php
declare(strict_types=1);

/**
 * Provider Profile & Gallery / Agency Branding & Gallery.
 * Ownership-checked uploads; never serves identity documents.
 */

require_once dirname(__DIR__) . '/config/bootstrap.php';

$user = ds_require_user();
if (($user['role'] ?? '') !== 'massage_provider') {
    ds_error(403, 'FORBIDDEN', 'Provider access only.');
}
ds_ensure_provider_moderation_schema();

$profile = ds_provider_profile_by_user((string) $user['id']);
if (!$profile) {
    ds_error(404, 'NOT_FOUND', 'Complete your provider profile before managing photos.');
}
$profileId = (string) $profile['id'];
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
    $includePending = true;
    ds_success([
        'limit' => ds_gallery_limit(),
        'providerType' => (string) ($profile['provider_type'] ?? 'individual'),
        'primaryImage' => $profile['primary_image'] ?? null,
        'coverImage' => $profile['cover_image'] ?? null,
        'images' => ds_gallery_list_for_profile($profileId, $includePending),
        'teamMembers' => ((string) ($profile['provider_type'] ?? '') === 'agency')
            ? ds_agency_team_members($profileId, false)
            : [],
    ]);
}

ds_require_same_origin();
ds_assert_provider_can_operate($user);
ds_rate_limit('provider_gallery_' . $user['id'], 40, 15 * 60);

if ($method === 'DELETE') {
    $body = ds_json_body();
    $id = trim((string) ($body['id'] ?? ''));
    $stmt = ds_pdo()->prepare('SELECT * FROM provider_gallery_images WHERE id = ? AND provider_profile_id = ? LIMIT 1');
    $stmt->execute([$id, $profileId]);
    $row = $stmt->fetch();
    if (!$row) {
        ds_error(404, 'NOT_FOUND', 'Image not found.');
    }
    if ((string) ($row['moderation_status'] ?? '') === 'hidden') {
        ds_error(403, 'MODERATED', 'This image was hidden by an admin and cannot be restored from your workspace.');
    }
    ds_unlink_provider_media_file($row['path'] ?? null);
    ds_unlink_provider_media_file($row['thumb_path'] ?? null);
    ds_pdo()->prepare('DELETE FROM provider_gallery_images WHERE id = ?')->execute([$id]);
    ds_gallery_sync_profile_fields($profileId);
    ds_audit('provider.gallery.delete', 'provider_gallery_image', $id, ['profileId' => $profileId], $user['id']);
    ds_success(['deleted' => true]);
}

if ($method === 'PATCH') {
    $body = ds_json_body();
    $action = strtolower(trim((string) ($body['action'] ?? 'update')));

    if ($action === 'reorder') {
        $order = $body['order'] ?? [];
        if (!is_array($order)) {
            ds_error(400, 'VALIDATION_ERROR', 'order must be an array of image ids.');
        }
        $pdo = ds_pdo();
        $pdo->beginTransaction();
        try {
            $upd = $pdo->prepare(
                'UPDATE provider_gallery_images SET sort_order = ?, updated_at = ? WHERE id = ? AND provider_profile_id = ?'
            );
            $i = 0;
            foreach ($order as $imageId) {
                $upd->execute([(int) $i, ds_now_sql(), (string) $imageId, $profileId]);
                $i++;
            }
            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
        ds_gallery_sync_profile_fields($profileId);
        ds_success(['reordered' => true, 'images' => ds_gallery_list_for_profile($profileId, true)]);
    }

    $id = trim((string) ($body['id'] ?? ''));
    $stmt = ds_pdo()->prepare('SELECT * FROM provider_gallery_images WHERE id = ? AND provider_profile_id = ? LIMIT 1');
    $stmt->execute([$id, $profileId]);
    $row = $stmt->fetch();
    if (!$row) {
        ds_error(404, 'NOT_FOUND', 'Image not found.');
    }
    if ((string) ($row['moderation_status'] ?? '') === 'hidden') {
        ds_error(403, 'MODERATED', 'Hidden images cannot be edited.');
    }

    if ($action === 'set_primary') {
        $kind = (string) ($profile['provider_type'] ?? 'individual') === 'agency' ? 'logo' : 'profile';
        $pdo = ds_pdo();
        $pdo->beginTransaction();
        try {
            $pdo->prepare(
                "UPDATE provider_gallery_images SET kind = 'gallery', updated_at = ?
                 WHERE provider_profile_id = ? AND kind IN ('profile','logo') AND team_member_id IS NULL"
            )->execute([ds_now_sql(), $profileId]);
            $pdo->prepare(
                'UPDATE provider_gallery_images SET kind = ?, sort_order = 0, updated_at = ? WHERE id = ? AND provider_profile_id = ?'
            )->execute([$kind, ds_now_sql(), $id, $profileId]);
            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
        ds_gallery_sync_profile_fields($profileId);
        ds_success(['primary' => true, 'images' => ds_gallery_list_for_profile($profileId, true)]);
    }

    if ($action === 'set_cover') {
        $pdo = ds_pdo();
        $pdo->beginTransaction();
        try {
            $pdo->prepare(
                "UPDATE provider_gallery_images SET kind = 'gallery', updated_at = ?
                 WHERE provider_profile_id = ? AND kind = 'cover' AND team_member_id IS NULL"
            )->execute([ds_now_sql(), $profileId]);
            $pdo->prepare(
                "UPDATE provider_gallery_images SET kind = 'cover', updated_at = ? WHERE id = ? AND provider_profile_id = ?"
            )->execute([ds_now_sql(), $id, $profileId]);
            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
        ds_gallery_sync_profile_fields($profileId);
        ds_success(['cover' => true, 'images' => ds_gallery_list_for_profile($profileId, true)]);
    }

    $alt = array_key_exists('altText', $body) ? trim((string) $body['altText']) : null;
    $desc = array_key_exists('description', $body) ? trim((string) $body['description']) : null;
    $sets = [];
    $params = [];
    if ($alt !== null) {
        $sets[] = 'alt_text = ?';
        $params[] = $alt !== '' ? $alt : null;
    }
    if ($desc !== null) {
        $sets[] = 'description = ?';
        $params[] = $desc !== '' ? $desc : null;
    }
    if ($sets === []) {
        ds_error(400, 'VALIDATION_ERROR', 'Nothing to update.');
    }
    $sets[] = 'updated_at = ?';
    $params[] = ds_now_sql();
    $params[] = $id;
    $params[] = $profileId;
    ds_pdo()->prepare(
        'UPDATE provider_gallery_images SET ' . implode(', ', $sets) . ' WHERE id = ? AND provider_profile_id = ?'
    )->execute($params);
    ds_success(['updated' => true, 'images' => ds_gallery_list_for_profile($profileId, true)]);
}

ds_require_method('POST');

if (empty($_FILES['file'])) {
    ds_error(400, 'VALIDATION_ERROR', 'Choose an image to upload.');
}

$kind = strtolower(trim((string) ($_POST['kind'] ?? 'gallery')));
$allowedKinds = ['profile', 'cover', 'logo', 'gallery', 'facility', 'service', 'team'];
if (!in_array($kind, $allowedKinds, true)) {
    ds_error(400, 'VALIDATION_ERROR', 'Invalid image kind.');
}

$teamMemberId = trim((string) ($_POST['teamMemberId'] ?? ''));
if ($kind === 'team') {
    if ($teamMemberId === '') {
        ds_error(400, 'VALIDATION_ERROR', 'teamMemberId is required for team photos.');
    }
    $tm = ds_pdo()->prepare('SELECT id FROM agency_team_members WHERE id = ? AND agency_profile_id = ? LIMIT 1');
    $tm->execute([$teamMemberId, $profileId]);
    if (!$tm->fetch()) {
        ds_error(404, 'NOT_FOUND', 'Team member not found on this agency.');
    }
} else {
    $teamMemberId = '';
}

$countStmt = ds_pdo()->prepare(
    "SELECT COUNT(*) AS c FROM provider_gallery_images
     WHERE provider_profile_id = ? AND moderation_status IN ('approved','pending','hidden')"
);
$countStmt->execute([$profileId]);
$count = (int) ($countStmt->fetch()['c'] ?? 0);
if ($count >= ds_gallery_limit() && !in_array($kind, ['profile', 'logo', 'cover'], true)) {
    ds_error(400, 'GALLERY_LIMIT', 'Gallery limit of ' . ds_gallery_limit() . ' images reached.');
}

$processed = ds_process_provider_image($_FILES['file'], $profileId);
$now = ds_now_sql();
$id = ds_new_id();

$pdo = ds_pdo();
$pdo->beginTransaction();
try {
    if (in_array($kind, ['profile', 'logo', 'cover'], true) && $teamMemberId === '') {
        // Replace previous primary/logo/cover kind rows (keep file cleanup after commit).
        $old = $pdo->prepare(
            'SELECT * FROM provider_gallery_images WHERE provider_profile_id = ? AND kind = ? AND team_member_id IS NULL'
        );
        $old->execute([$profileId, $kind]);
        $oldRows = $old->fetchAll() ?: [];
        $pdo->prepare(
            'DELETE FROM provider_gallery_images WHERE provider_profile_id = ? AND kind = ? AND team_member_id IS NULL'
        )->execute([$profileId, $kind]);
    } else {
        $oldRows = [];
    }

    $sortStmt = $pdo->prepare(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM provider_gallery_images WHERE provider_profile_id = ?'
    );
    $sortStmt->execute([$profileId]);
    $sort = (int) ($sortStmt->fetch()['n'] ?? 0);

    $pdo->prepare(
        'INSERT INTO provider_gallery_images
         (id, provider_profile_id, team_member_id, kind, path, thumb_path, filename, mime, size_bytes,
          width, height, alt_text, description, sort_order, moderation_status, uploaded_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $id,
        $profileId,
        $teamMemberId !== '' ? $teamMemberId : null,
        $kind,
        $processed['path'],
        $processed['thumbPath'],
        $processed['filename'],
        $processed['mime'],
        $processed['sizeBytes'],
        $processed['width'],
        $processed['height'],
        trim((string) ($_POST['altText'] ?? '')) ?: null,
        trim((string) ($_POST['description'] ?? '')) ?: null,
        in_array($kind, ['profile', 'logo', 'cover'], true) ? 0 : $sort,
        'approved',
        $user['id'],
        $now,
        $now,
    ]);

    if ($kind === 'team' && $teamMemberId !== '') {
        $pdo->prepare('UPDATE agency_team_members SET profile_image = ?, updated_at = ? WHERE id = ? AND agency_profile_id = ?')
            ->execute([$processed['path'], $now, $teamMemberId, $profileId]);
    }

    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    ds_unlink_provider_media_file($processed['path']);
    ds_unlink_provider_media_file($processed['thumbPath'] ?? null);
    throw $e;
}

foreach ($oldRows ?? [] as $oldRow) {
    ds_unlink_provider_media_file($oldRow['path'] ?? null);
    ds_unlink_provider_media_file($oldRow['thumb_path'] ?? null);
}

ds_gallery_sync_profile_fields($profileId);
ds_audit('provider.gallery.upload', 'provider_gallery_image', $id, [
    'kind' => $kind,
    'profileId' => $profileId,
], $user['id']);

ds_success([
    'image' => ds_gallery_image_dto([
        'id' => $id,
        'kind' => $kind,
        'path' => $processed['path'],
        'thumb_path' => $processed['thumbPath'],
        'filename' => $processed['filename'],
        'mime' => $processed['mime'],
        'size_bytes' => $processed['sizeBytes'],
        'width' => $processed['width'],
        'height' => $processed['height'],
        'alt_text' => trim((string) ($_POST['altText'] ?? '')),
        'description' => trim((string) ($_POST['description'] ?? '')),
        'sort_order' => 0,
        'moderation_status' => 'approved',
        'moderation_reason' => null,
        'team_member_id' => $teamMemberId !== '' ? $teamMemberId : null,
        'created_at' => $now,
    ], true),
    'images' => ds_gallery_list_for_profile($profileId, true),
]);
