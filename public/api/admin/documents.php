<?php
declare(strict_types=1);

/**
 * Secure identity-document viewer. Admin roles only, no direct paths in URLs
 * beyond an opaque document id, and files are streamed from private storage.
 */

require_once dirname(__DIR__) . '/config/bootstrap.php';

$admin = ds_require_admin();
ds_require_method('GET');

if (!ds_table_exists('provider_identity_documents')) {
    ds_error(503, 'NOT_CONFIGURED', 'Identity documents are not configured.');
}

$id = trim((string) ($_GET['id'] ?? ''));
$side = strtolower(trim((string) ($_GET['side'] ?? 'id')));
if ($id === '') {
    ds_error(400, 'VALIDATION_ERROR', 'Document id is required.');
}

$stmt = ds_pdo()->prepare(
    'SELECT id, provider_user_id, id_image_path, selfie_image_path FROM provider_identity_documents WHERE id = ? LIMIT 1'
);
$stmt->execute([$id]);
$doc = $stmt->fetch();
if (!$doc) {
    ds_error(404, 'NOT_FOUND', 'Document not found.');
}

$relative = $side === 'selfie' ? (string) ($doc['selfie_image_path'] ?? '') : (string) ($doc['id_image_path'] ?? '');
if ($relative === '' || !str_starts_with($relative, 'private/identity/')) {
    ds_error(404, 'NOT_FOUND', 'Document file is unavailable.');
}

$root = realpath(dirname(__DIR__) . '/storage');
$target = realpath(dirname(__DIR__) . '/storage/' . ltrim($relative, '/'));
if ($root === false || $target === false || !str_starts_with($target, $root . DIRECTORY_SEPARATOR) || !is_file($target)) {
    ds_error(404, 'NOT_FOUND', 'Document file is unavailable.');
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($target) ?: 'application/octet-stream';
if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
    ds_error(415, 'UNSUPPORTED', 'Unsupported document type.');
}

ds_audit('document.viewed', 'provider_identity_document', $id, ['side' => $side], $admin['id']);

header('Content-Type: ' . $mime);
header('Content-Length: ' . (string) filesize($target));
header('Content-Disposition: inline; filename="' . $id . '-' . $side . '.' . pathinfo($target, PATHINFO_EXTENSION) . '"');
header('Cache-Control: private, no-store');
header('X-Content-Type-Options: nosniff');
readfile($target);
exit;
