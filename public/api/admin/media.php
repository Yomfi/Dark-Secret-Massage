<?php
declare(strict_types=1);

/** CMS media library: upload, list and delete public images. */

require_once dirname(__DIR__) . '/config/bootstrap.php';

$admin = ds_require_permission('media.read');
if (!ds_cms_ready()) {
    ds_error(503, 'SCHEMA_NOT_MIGRATED', 'This area needs the database migration. Run: php scripts/migrate.php --apply');
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
    $rows = [];
    if (ds_table_exists('media_assets')) {
        $rows = ds_pdo()->query('SELECT * FROM media_assets ORDER BY created_at DESC LIMIT 200')->fetchAll() ?: [];
    }
    ds_success([
        'media' => array_map(static fn (array $r): array => [
            'id' => (string) $r['id'],
            'url' => (string) $r['path'],
            'filename' => (string) $r['filename'],
            'mime' => (string) ($r['mime'] ?? ''),
            'sizeBytes' => (int) $r['size_bytes'],
            'altText' => (string) ($r['alt_text'] ?? ''),
            'createdAt' => $r['created_at'],
        ], $rows),
    ]);
}

if ($method === 'PATCH') {
    ds_require_same_origin();
    ds_require_permission('media.write');
    $body = ds_json_body();
    $id = trim((string) ($body['id'] ?? ''));
    $alt = trim((string) ($body['altText'] ?? ''));
    if ($id === '') {
        ds_error(400, 'VALIDATION_ERROR', 'Media id is required.');
    }
    if (ds_column_exists('media_assets', 'alt_text')) {
        ds_pdo()->prepare('UPDATE media_assets SET alt_text = ? WHERE id = ?')->execute([$alt !== '' ? $alt : null, $id]);
    }
    ds_audit('media.alt_updated', 'media_asset', $id, ['altText' => $alt], $admin['id']);
    ds_success(['id' => $id, 'altText' => $alt]);
}

ds_require_same_origin();
ds_require_permission('media.write');

if ($method === 'DELETE') {
    $body = ds_json_body();
    $id = trim((string) ($body['id'] ?? ''));
    $stmt = ds_pdo()->prepare('SELECT * FROM media_assets WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        ds_error(404, 'NOT_FOUND', 'Media item not found.');
    }
    $relative = (string) $row['path'];
    if (str_starts_with($relative, '/images/uploads/cms/')) {
        $file = ds_cms_media_dir() . '/' . basename($relative);
        if (is_file($file)) {
            @unlink($file);
        }
    }
    ds_pdo()->prepare('DELETE FROM media_assets WHERE id = ?')->execute([$id]);
    ds_audit('media.deleted', 'media_asset', $id, ['filename' => (string) $row['filename']], $admin['id']);
    ds_success(['deleted' => true]);
}

ds_require_method('POST');
ds_rate_limit('admin_media', 40, 15 * 60);

if (empty($_FILES['file'])) {
    ds_error(400, 'VALIDATION_ERROR', 'Choose an image to upload.');
}

$file = $_FILES['file'];
if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    ds_error(400, 'UPLOAD_ERROR', 'Upload failed. Try a smaller image.');
}
if (($file['size'] ?? 0) <= 0 || ($file['size'] ?? 0) > 5 * 1024 * 1024) {
    ds_error(400, 'UPLOAD_ERROR', 'Images must be under 5MB.');
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file['tmp_name']) ?: '';
$allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
if (!isset($allowed[$mime])) {
    ds_error(400, 'UPLOAD_ERROR', 'Only JPEG, PNG or WebP images are allowed.');
}

$dir = ds_cms_media_dir();
$base = ds_slugify(pathinfo((string) $file['name'], PATHINFO_FILENAME));
$filename = substr($base, 0, 60) . '-' . substr(bin2hex(random_bytes(4)), 0, 8) . '.' . $allowed[$mime];
$dest = $dir . '/' . $filename;

if (!move_uploaded_file($file['tmp_name'], $dest)) {
    ds_error(500, 'UPLOAD_ERROR', 'Unable to store the uploaded image.');
}

$id = ds_new_id();
ds_pdo()->prepare(
    'INSERT INTO media_assets (id, path, filename, mime, size_bytes, uploaded_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)'
)->execute([$id, ds_cms_media_url($filename), $filename, $mime, (int) $file['size'], $admin['id'], ds_now_sql()]);

ds_audit('media.uploaded', 'media_asset', $id, ['filename' => $filename], $admin['id']);

ds_success(['id' => $id, 'url' => ds_cms_media_url($filename), 'filename' => $filename]);
