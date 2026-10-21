<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

$admin = ds_require_admin();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if (!ds_table_exists('provider_verification')) {
    ds_error(503, 'NOT_CONFIGURED', 'Verification table is not installed.');
}

$pdo = ds_pdo();

if ($method === 'GET') {
    ds_require_method('GET');
    $rows = $pdo->query(
        'SELECT v.*, u.first_name, u.last_name, u.email, u.phone,
                u.phone_verified_at AS user_phone_verified_at,
                u.email_verified_at AS user_email_verified_at,
                p.display_name, p.slug, p.city, p.profile_completed_at
         FROM provider_verification v
         INNER JOIN users u ON u.id = v.provider_user_id
         LEFT JOIN provider_profiles p ON p.user_id = v.provider_user_id
         ORDER BY COALESCE(v.submitted_for_review_at, v.created_at) DESC
         LIMIT 100'
    )->fetchAll();

    $list = array_map(static function (array $row): array {
        $docs = [];
        if (ds_table_exists('provider_identity_documents')) {
            $stmt = ds_pdo()->prepare(
                'SELECT id, id_type, status, created_at FROM provider_identity_documents
                 WHERE provider_user_id = ? ORDER BY created_at DESC LIMIT 5'
            );
            $stmt->execute([$row['provider_user_id']]);
            $docs = $stmt->fetchAll();
        }

        return [
            'providerUserId' => $row['provider_user_id'],
            'displayName' => $row['display_name'] ?: trim(($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? '')),
            'email' => $row['email'],
            'phone' => $row['phone'],
            'slug' => $row['slug'],
            'city' => $row['city'],
            'phoneVerified' => !empty($row['phone_verified_at']) || !empty($row['user_phone_verified_at']),
            'emailVerified' => !empty($row['email_verified_at']) || !empty($row['user_email_verified_at']),
            'identityStatus' => $row['identity_status'],
            'paymentStatus' => $row['payment_status'],
            'verificationStatus' => $row['verification_status'],
            'submittedAt' => $row['submitted_for_review_at'] ?? $row['created_at'],
            'adminNotes' => $row['admin_notes'],
            'rejectionReason' => $row['rejection_reason'],
            'identityDocuments' => array_map(static function (array $d): array {
                return [
                    'id' => $d['id'],
                    'idType' => $d['id_type'],
                    'status' => $d['status'],
                    'createdAt' => $d['created_at'],
                    // File paths intentionally omitted from list payload.
                ];
            }, $docs),
        ];
    }, $rows ?: []);

    ds_success(['providers' => $list]);
}

ds_require_method('POST');
ds_rate_limit('admin_provider_review', 60, 15 * 60);

$body = ds_json_body();
$providerUserId = trim((string) ($body['providerUserId'] ?? ''));
$action = strtolower(trim((string) ($body['action'] ?? '')));
$notes = trim((string) ($body['notes'] ?? ''));
$reason = trim((string) ($body['rejectionReason'] ?? ''));

if ($providerUserId === '' || !in_array($action, ['approve', 'reject', 'request_changes'], true)) {
    ds_error(400, 'VALIDATION_ERROR', 'Invalid review action.');
}

$verification = ds_ensure_provider_verification($providerUserId);
$now = ds_now_sql();

if ($action === 'approve') {
    // Payment success alone must not verify — admin still decides, but we record requirements.
    $pdo->prepare(
        'UPDATE provider_verification SET
            verification_status = \'verified\',
            identity_status = IF(identity_status = \'pending\', \'approved\', identity_status),
            verified_at = ?, verified_by = ?, admin_notes = ?, rejection_reason = NULL, updated_at = ?
         WHERE provider_user_id = ?'
    )->execute([$now, $admin['id'], $notes !== '' ? $notes : null, $now, $providerUserId]);

    if (ds_table_exists('provider_identity_documents')) {
        $pdo->prepare(
            'UPDATE provider_identity_documents SET status = \'approved\', updated_at = ?
             WHERE provider_user_id = ? AND status = \'pending\''
        )->execute([$now, $providerUserId]);
    }

    ds_success(['verificationStatus' => 'verified']);
}

if ($action === 'reject') {
    $pdo->prepare(
        'UPDATE provider_verification SET
            verification_status = \'rejected\',
            rejection_reason = ?, admin_notes = ?, updated_at = ?
         WHERE provider_user_id = ?'
    )->execute([
        $reason !== '' ? $reason : 'Verification rejected.',
        $notes !== '' ? $notes : null,
        $now,
        $providerUserId,
    ]);
    ds_success(['verificationStatus' => 'rejected']);
}

$pdo->prepare(
    'UPDATE provider_verification SET
        verification_status = \'changes_requested\',
        admin_notes = ?, rejection_reason = ?, updated_at = ?
     WHERE provider_user_id = ?'
)->execute([
    $notes !== '' ? $notes : 'Please update your submission.',
    $reason !== '' ? $reason : null,
    $now,
    $providerUserId,
]);

ds_success(['verificationStatus' => 'changes_requested']);
