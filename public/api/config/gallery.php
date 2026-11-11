<?php
declare(strict_types=1);

/** Provider public gallery: uploads, thumbs, sync to profile JSON columns. */

function ds_gallery_limit(): int
{
    return 12;
}

function ds_provider_media_dir(string $profileId): string
{
    $dir = dirname(__DIR__, 2) . '/images/uploads/providers/' . preg_replace('/[^a-zA-Z0-9_-]/', '', $profileId);
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    return $dir;
}

function ds_customer_avatar_url(string $userId): ?string
{
    if (!ds_table_exists('provider_gallery_images')) {
        return null;
    }
    $stmt = ds_pdo()->prepare(
        "SELECT path FROM provider_gallery_images
         WHERE provider_profile_id = ? AND kind = 'customer_avatar' AND moderation_status = 'approved'
         ORDER BY created_at DESC LIMIT 1"
    );
    $stmt->execute(['customer-' . $userId]);
    $row = $stmt->fetch();
    return $row && !empty($row['path']) ? (string) $row['path'] : null;
}

function ds_provider_media_url(string $profileId, string $filename): string
{
    $safeProfile = rawurlencode(preg_replace('/[^a-zA-Z0-9_-]/', '', $profileId) ?: 'x');
    return '/images/uploads/providers/' . $safeProfile . '/' . rawurlencode($filename);
}

function ds_ensure_provider_moderation_schema(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;
    $pdo = ds_pdo();

    if (ds_table_exists('users')) {
        foreach ([
            'auth_epoch' => 'INT NOT NULL DEFAULT 0',
            'suspend_reason' => 'VARCHAR(500) NULL',
            'suspended_until' => 'DATETIME(3) NULL',
            'suspend_notes' => 'TEXT NULL',
            'block_reason' => 'VARCHAR(500) NULL',
        ] as $column => $definition) {
            if (!ds_column_exists('users', $column)) {
                try {
                    $pdo->exec('ALTER TABLE users ADD COLUMN `' . $column . '` ' . $definition);
                } catch (Throwable $e) {
                    // Concurrent alter.
                }
            }
        }
        if (function_exists('ds_flush_table_columns')) {
            ds_flush_table_columns('users');
        }
    }

    if (ds_table_exists('provider_profiles')) {
        foreach ([
            'removed_at' => 'DATETIME(3) NULL',
            'removed_by' => 'VARCHAR(191) NULL',
            'remove_reason' => 'VARCHAR(500) NULL',
        ] as $column => $definition) {
            if (!ds_column_exists('provider_profiles', $column)) {
                try {
                    $pdo->exec('ALTER TABLE provider_profiles ADD COLUMN `' . $column . '` ' . $definition);
                } catch (Throwable $e) {
                    // Concurrent alter.
                }
            }
        }
        if (function_exists('ds_flush_table_columns')) {
            ds_flush_table_columns('provider_profiles');
        }
    }

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS provider_gallery_images (
            id VARCHAR(191) NOT NULL,
            provider_profile_id VARCHAR(191) NOT NULL,
            team_member_id VARCHAR(191) NULL,
            kind VARCHAR(24) NOT NULL DEFAULT 'gallery',
            path VARCHAR(512) NOT NULL,
            thumb_path VARCHAR(512) NULL,
            filename VARCHAR(255) NOT NULL,
            mime VARCHAR(100) NULL,
            size_bytes INT NOT NULL DEFAULT 0,
            width INT NULL,
            height INT NULL,
            alt_text VARCHAR(255) NULL,
            description VARCHAR(500) NULL,
            sort_order INT NOT NULL DEFAULT 0,
            moderation_status VARCHAR(24) NOT NULL DEFAULT 'approved',
            moderated_by VARCHAR(191) NULL,
            moderated_at DATETIME(3) NULL,
            moderation_reason VARCHAR(500) NULL,
            uploaded_by VARCHAR(191) NULL,
            created_at DATETIME(3) NOT NULL,
            updated_at DATETIME(3) NOT NULL,
            PRIMARY KEY (id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
    );
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS provider_moderation_events (
            id VARCHAR(191) NOT NULL,
            provider_user_id VARCHAR(191) NOT NULL,
            actor_user_id VARCHAR(191) NULL,
            action VARCHAR(40) NOT NULL,
            reason VARCHAR(500) NULL,
            notes TEXT NULL,
            until_at DATETIME(3) NULL,
            meta_json TEXT NULL,
            created_at DATETIME(3) NOT NULL,
            PRIMARY KEY (id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
    );
    foreach ([
        'CREATE INDEX provider_gallery_profile_idx ON provider_gallery_images (provider_profile_id)',
        'CREATE INDEX provider_gallery_mod_idx ON provider_gallery_images (moderation_status)',
        'CREATE INDEX provider_mod_user_idx ON provider_moderation_events (provider_user_id)',
        'CREATE INDEX provider_mod_created_idx ON provider_moderation_events (created_at)',
    ] as $sql) {
        try {
            $pdo->exec($sql);
        } catch (Throwable $e) {
            // Index exists.
        }
    }
}

/**
 * Process an uploaded image: MIME + signature check, EXIF strip via re-encode,
 * max display size + thumbnail. Returns public URL paths.
 *
 * @return array{path:string,thumbPath:?string,filename:string,mime:string,sizeBytes:int,width:?int,height:?int}
 */
function ds_process_provider_image(array $file, string $profileId, int $maxBytes = 5242880): array
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        ds_error(400, 'UPLOAD_ERROR', 'File upload failed.');
    }
    if (($file['size'] ?? 0) <= 0 || ($file['size'] ?? 0) > $maxBytes) {
        ds_error(400, 'UPLOAD_ERROR', 'Image must be under 5MB.');
    }

    $tmp = (string) ($file['tmp_name'] ?? '');
    if ($tmp === '' || !is_uploaded_file($tmp)) {
        ds_error(400, 'UPLOAD_ERROR', 'Invalid upload.');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($tmp) ?: '';
    $allowed = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];
    if (!isset($allowed[$mime])) {
        ds_error(400, 'UPLOAD_ERROR', 'Only JPEG, PNG or WebP images are allowed.');
    }

    $info = @getimagesize($tmp);
    if ($info === false || empty($info[0]) || empty($info[1])) {
        ds_error(400, 'UPLOAD_ERROR', 'File is not a valid image.');
    }
    $srcW = (int) $info[0];
    $srcH = (int) $info[1];
    if ($srcW < 80 || $srcH < 80) {
        ds_error(400, 'UPLOAD_ERROR', 'Image is too small (minimum 80×80).');
    }
    if ($srcW > 8000 || $srcH > 8000) {
        ds_error(400, 'UPLOAD_ERROR', 'Image dimensions are too large.');
    }

    $ext = $allowed[$mime];
    $base = ds_new_id();
    $dir = ds_provider_media_dir($profileId);
    $displayName = $base . '.' . $ext;
    $thumbName = $base . '-thumb.' . $ext;
    $displayPath = $dir . '/' . $displayName;
    $thumbPath = $dir . '/' . $thumbName;

    $src = ds_image_create_from_file($tmp, $mime);
    if (!$src) {
        ds_error(400, 'UPLOAD_ERROR', 'Unable to read image data.');
    }
    $oriented = ds_image_apply_exif_orientation($src, $tmp, $mime);
    $src = $oriented['im'];
    $srcW = $oriented['width'];
    $srcH = $oriented['height'];

    // Re-encode to strip EXIF / location metadata and create display size (max 1600).
    $display = ds_image_resize_contain($src, $srcW, $srcH, 1600, 1600);
    if (!ds_image_write($display['im'], $displayPath, $mime)) {
        imagedestroy($src);
        imagedestroy($display['im']);
        ds_error(500, 'UPLOAD_ERROR', 'Unable to store image.');
    }

    $thumb = ds_image_resize_contain($src, $srcW, $srcH, 480, 480);
    $thumbOk = ds_image_write($thumb['im'], $thumbPath, $mime);
    imagedestroy($src);
    imagedestroy($display['im']);
    imagedestroy($thumb['im']);

    $url = ds_provider_media_url($profileId, $displayName);
    $thumbUrl = $thumbOk ? ds_provider_media_url($profileId, $thumbName) : null;

    return [
        'path' => $url,
        'thumbPath' => $thumbUrl,
        'filename' => $displayName,
        'mime' => $mime,
        'sizeBytes' => is_file($displayPath) ? (int) filesize($displayPath) : 0,
        'width' => $display['width'],
        'height' => $display['height'],
    ];
}

/**
 * Apply EXIF orientation before resizing, then discard metadata on re-encode.
 *
 * @param resource|\GdImage $im
 * @return array{im:resource|\GdImage,width:int,height:int}
 */
function ds_image_apply_exif_orientation($im, string $path, string $mime): array
{
    $width = imagesx($im);
    $height = imagesy($im);
    if ($mime !== 'image/jpeg' || !function_exists('exif_read_data')) {
        return ['im' => $im, 'width' => $width, 'height' => $height];
    }
    $exif = @exif_read_data($path);
    $orientation = (int) ($exif['Orientation'] ?? 1);
    if ($orientation === 3) {
        $rotated = imagerotate($im, 180, 0);
    } elseif ($orientation === 6) {
        $rotated = imagerotate($im, -90, 0);
    } elseif ($orientation === 8) {
        $rotated = imagerotate($im, 90, 0);
    } else {
        $rotated = false;
    }
    if ($rotated === false) {
        return ['im' => $im, 'width' => $width, 'height' => $height];
    }
    imagedestroy($im);
    if (in_array($orientation, [2, 4, 5, 7], true)) {
        imageflip($rotated, IMG_FLIP_HORIZONTAL);
    }
    return ['im' => $rotated, 'width' => imagesx($rotated), 'height' => imagesy($rotated)];
}

/** @return resource|\GdImage|false */
function ds_image_create_from_file(string $path, string $mime)
{
    return match ($mime) {
        'image/jpeg' => @imagecreatefromjpeg($path),
        'image/png' => @imagecreatefrompng($path),
        'image/webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($path) : false,
        default => false,
    };
}

/**
 * @param resource|\GdImage $src
 * @return array{im:resource|\GdImage,width:int,height:int}
 */
function ds_image_resize_contain($src, int $srcW, int $srcH, int $maxW, int $maxH): array
{
    $scale = min(1.0, min($maxW / max(1, $srcW), $maxH / max(1, $srcH)));
    $w = max(1, (int) round($srcW * $scale));
    $h = max(1, (int) round($srcH * $scale));
    $dst = imagecreatetruecolor($w, $h);
    if ($dst === false) {
        ds_error(500, 'UPLOAD_ERROR', 'Image processing failed.');
    }
    imagealphablending($dst, false);
    imagesavealpha($dst, true);
    $transparent = imagecolorallocatealpha($dst, 0, 0, 0, 127);
    imagefilledrectangle($dst, 0, 0, $w, $h, $transparent);
    imagecopyresampled($dst, $src, 0, 0, 0, 0, $w, $h, $srcW, $srcH);
    return ['im' => $dst, 'width' => $w, 'height' => $h];
}

/** @param resource|\GdImage $im */
function ds_image_write($im, string $path, string $mime): bool
{
    return match ($mime) {
        'image/jpeg' => imagejpeg($im, $path, 85),
        'image/png' => imagepng($im, $path, 6),
        'image/webp' => function_exists('imagewebp') ? imagewebp($im, $path, 82) : false,
        default => false,
    };
}

function ds_gallery_image_dto(array $row, bool $includeHidden = false): ?array
{
    $status = (string) ($row['moderation_status'] ?? 'approved');
    if (!$includeHidden && !in_array($status, ['approved', 'pending'], true)) {
        return null;
    }
    return [
        'id' => (string) $row['id'],
        'kind' => (string) ($row['kind'] ?? 'gallery'),
        'url' => (string) $row['path'],
        'thumbUrl' => $row['thumb_path'] !== null ? (string) $row['thumb_path'] : (string) $row['path'],
        'filename' => (string) ($row['filename'] ?? ''),
        'mime' => (string) ($row['mime'] ?? ''),
        'sizeBytes' => (int) ($row['size_bytes'] ?? 0),
        'width' => isset($row['width']) ? (int) $row['width'] : null,
        'height' => isset($row['height']) ? (int) $row['height'] : null,
        'altText' => (string) ($row['alt_text'] ?? ''),
        'description' => (string) ($row['description'] ?? ''),
        'sortOrder' => (int) ($row['sort_order'] ?? 0),
        'moderationStatus' => $status,
        'moderationReason' => $row['moderation_reason'] !== null ? (string) $row['moderation_reason'] : null,
        'teamMemberId' => $row['team_member_id'] !== null ? (string) $row['team_member_id'] : null,
        'createdAt' => $row['created_at'] ?? null,
    ];
}

/** @return list<array<string,mixed>> */
function ds_gallery_list_for_profile(string $profileId, bool $includeHidden = false, ?string $kind = null): array
{
    if (!ds_table_exists('provider_gallery_images')) {
        return [];
    }
    $sql = 'SELECT * FROM provider_gallery_images WHERE provider_profile_id = ?';
    $params = [$profileId];
    if ($kind !== null && $kind !== '') {
        $sql .= ' AND kind = ?';
        $params[] = $kind;
    }
    if (!$includeHidden) {
        $sql .= " AND moderation_status IN ('approved','pending')";
    }
    $sql .= ' ORDER BY sort_order ASC, created_at ASC';
    $stmt = ds_pdo()->prepare($sql);
    $stmt->execute($params);
    $out = [];
    foreach ($stmt->fetchAll() ?: [] as $row) {
        $dto = ds_gallery_image_dto($row, $includeHidden);
        if ($dto) {
            $out[] = $dto;
        }
    }
    return $out;
}

/** Rebuild primary_image / cover_image / gallery_json from approved gallery rows. */
function ds_gallery_sync_profile_fields(string $profileId): void
{
    if (!ds_table_exists('provider_gallery_images') || !ds_table_exists('provider_profiles')) {
        return;
    }
    $stmt = ds_pdo()->prepare(
        "SELECT * FROM provider_gallery_images
         WHERE provider_profile_id = ? AND moderation_status = 'approved' AND team_member_id IS NULL
         ORDER BY sort_order ASC, created_at ASC"
    );
    $stmt->execute([$profileId]);
    $rows = $stmt->fetchAll() ?: [];

    $profile = null;
    $logo = null;
    $cover = null;
    $gallery = [];
    foreach ($rows as $row) {
        $kind = (string) ($row['kind'] ?? 'gallery');
        $path = (string) $row['path'];
        if ($kind === 'profile' || $kind === 'logo') {
            if ($profile === null) {
                $profile = $path;
            }
            if ($kind === 'logo' && $logo === null) {
                $logo = $path;
            }
        } elseif ($kind === 'cover') {
            if ($cover === null) {
                $cover = $path;
            }
        } else {
            $gallery[] = $path;
        }
    }
    // Prefer logo as agency primary; fall back to profile then first gallery.
    $primary = $logo ?? $profile ?? ($gallery[0] ?? null);
    if ($cover === null && $primary !== null) {
        $cover = $primary;
    }

    $now = ds_now_sql();
    ds_pdo()->prepare(
        'UPDATE provider_profiles SET primary_image = ?, cover_image = ?, gallery_json = ?, updated_at = ? WHERE id = ?'
    )->execute([
        $primary,
        $cover,
        json_encode(array_values($gallery), JSON_UNESCAPED_SLASHES),
        $now,
        $profileId,
    ]);
}

function ds_moderation_log(
    string $providerUserId,
    string $action,
    ?string $actorId,
    ?string $reason = null,
    ?string $notes = null,
    ?string $untilAt = null,
    array $meta = []
): void {
    if (!ds_table_exists('provider_moderation_events')) {
        return;
    }
    ds_pdo()->prepare(
        'INSERT INTO provider_moderation_events
         (id, provider_user_id, actor_user_id, action, reason, notes, until_at, meta_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        ds_new_id(),
        $providerUserId,
        $actorId,
        $action,
        $reason,
        $notes,
        $untilAt,
        $meta === [] ? null : json_encode($meta, JSON_UNESCAPED_SLASHES),
        ds_now_sql(),
    ]);
}

function ds_provider_is_removed(?array $profile): bool
{
    return $profile && !empty($profile['removed_at']);
}

/** Bookable / publicly listable: active account, published, not removed. */
function ds_provider_is_publicly_listable(string $providerUserId): bool
{
    $user = ds_find_user_by_id($providerUserId);
    if (!$user || (string) $user['account_status'] !== 'active') {
        return false;
    }
    $profile = ds_provider_profile_by_user($providerUserId);
    if (!$profile || ds_provider_is_removed($profile)) {
        return false;
    }
    return ds_provider_publicly_eligible($providerUserId);
}

/**
 * Provider may use write APIs (profile edit, gallery, accept bookings).
 * Suspended providers may only read limited status.
 */
function ds_assert_provider_can_operate(array $user): void
{
    $status = (string) ($user['account_status'] ?? '');
    if ($status === 'banned') {
        ds_error(403, 'ACCOUNT_BLOCKED', 'This provider account has been blocked. Contact support if you believe this is a mistake.');
    }
    if ($status === 'suspended') {
        ds_error(403, 'ACCOUNT_SUSPENDED', 'This account is suspended. You can view your status but cannot manage your profile or accept bookings.');
    }
    if ($status === 'deleted') {
        ds_error(403, 'ACCOUNT_DELETED', 'This account is no longer available.');
    }
    $profile = ds_provider_profile_by_user((string) $user['id']);
    if ($profile && ds_provider_is_removed($profile)) {
        // Removed from public platform but account retained — block booking acceptance / publish-affecting writes.
        // Profile text edits and gallery are still allowed so they can prepare for restore.
    }
}

function ds_assert_provider_can_accept_bookings(array $user): void
{
    ds_assert_provider_can_operate($user);
    $profile = ds_provider_profile_by_user((string) $user['id']);
    if ($profile && ds_provider_is_removed($profile)) {
        ds_error(403, 'PROFILE_REMOVED', 'This profile has been removed from the public platform and cannot accept new bookings.');
    }
    if (!ds_provider_publicly_eligible((string) $user['id'])) {
        ds_error(403, 'NOT_PUBLISHED', 'This profile is not currently available for bookings.');
    }
}

function ds_bump_auth_epoch(string $userId): void
{
    if (!ds_column_exists('users', 'auth_epoch')) {
        return;
    }
    ds_pdo()->prepare('UPDATE users SET auth_epoch = COALESCE(auth_epoch, 0) + 1, updated_at = ? WHERE id = ?')
        ->execute([ds_now_sql(), $userId]);
}

function ds_unlink_provider_media_file(?string $publicPath): void
{
    if ($publicPath === null || $publicPath === '') {
        return;
    }
    if (!str_starts_with($publicPath, '/images/uploads/providers/')) {
        return;
    }
    $full = dirname(__DIR__, 2) . $publicPath;
    if (is_file($full)) {
        @unlink($full);
    }
}
