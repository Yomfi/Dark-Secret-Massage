<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';
require_once dirname(__DIR__) . '/config/actions.php';
require_once dirname(__DIR__) . '/config/locations.php';

$admin = ds_require_permission('providers.read');
if (!ds_cms_ready()) {
    ds_error(503, 'SCHEMA_NOT_MIGRATED', 'This area needs the database migration. Run: php scripts/migrate.php --apply');
}
ds_ensure_provider_moderation_schema();

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
    $detailId = trim((string) ($_GET['id'] ?? ''));
    if ($detailId !== '') {
        ds_admin_provider_detail($detailId);
    }

    $kind = strtolower(trim((string) ($_GET['kind'] ?? 'all')));
    $search = trim((string) ($_GET['q'] ?? ''));

    $where = ["u.role = 'massage_provider'"];
    $params = [];
    $locationRegion = trim((string) ($_GET['region'] ?? ''));
    $locationCity = trim((string) ($_GET['city'] ?? ''));
    if ($locationRegion !== '') {
        $where[] = 'p.region = ?';
        $params[] = $locationRegion;
    }
    if ($locationCity !== '') {
        $where[] = '(p.city = ? OR p.area_neighbourhood = ?)';
        $params[] = $locationCity;
        $params[] = $locationCity;
    }
    if (in_array($kind, ['individual', 'agency'], true) && ds_column_exists('provider_profiles', 'provider_type')) {
        $where[] = 'p.provider_type = ?';
        $params[] = $kind;
    }
    if ($search !== '') {
        $where[] = '(u.email LIKE ? OR p.display_name LIKE ? OR u.first_name LIKE ?)';
        $like = '%' . $search . '%';
        array_push($params, $like, $like, $like);
    }

    $rows = [];
    try {
        $stmt = ds_pdo()->prepare(
            'SELECT u.id AS user_id, u.email, u.phone, u.account_status, u.email_verified_at, u.created_at,
                    u.suspend_reason, u.suspended_until, u.block_reason,
                    p.id AS profile_id, p.slug, p.display_name, p.provider_type, p.city, p.region, p.is_published, p.published_at,
                    p.removed_at, p.primary_image, p.cover_image,
                    v.verification_status, v.identity_status, v.rejection_reason, v.submitted_for_review_at,
                    v.verification_choice, v.business_status, v.identity_submitted_at, v.selfie_submitted_at
             FROM users u
             LEFT JOIN provider_profiles p ON p.user_id = u.id
             LEFT JOIN provider_verification v ON v.provider_user_id = u.id
             WHERE ' . implode(' AND ', $where) . '
             ORDER BY COALESCE(v.submitted_for_review_at, u.created_at) DESC LIMIT 200'
        );
        $stmt->execute($params);
        $rows = $stmt->fetchAll() ?: [];
    } catch (Throwable $e) {
        $rows = [];
    }

    ds_success([
        'providers' => array_map(static fn (array $row): array => ds_admin_provider_list_dto($row), $rows),
    ]);
}

ds_require_method('POST');
ds_require_same_origin();
ds_require_permission('providers.write');
ds_rate_limit('admin_providers', 60, 15 * 60);

$body = ds_json_body();
$userId = trim((string) ($body['providerUserId'] ?? ''));
$action = strtolower(trim((string) ($body['action'] ?? '')));
$allowed = [
    'suspend', 'activate', 'publish', 'unpublish',
    'remove', 'restore', 'block', 'unblock',
    'reject_account', 'reopen_account',
    'update_profile', 'moderate_image',
    'permanently_delete',
];
if ($userId === '' || !in_array($action, $allowed, true)) {
    ds_error(400, 'VALIDATION_ERROR', 'Invalid provider action.');
}

$target = ds_find_user_by_id($userId);
if (!$target || (string) ($target['role'] ?? '') !== 'massage_provider') {
    ds_error(404, 'NOT_FOUND', 'Provider account not found.');
}
if (ds_is_staff_user_role((string) ($target['role'] ?? '')) || in_array((string) ($target['role'] ?? ''), ['admin', 'moderator', 'support_admin'], true)) {
    ds_error(403, 'FORBIDDEN', 'Staff accounts cannot be managed from provider tools.');
}

$profile = ds_provider_profile_by_user($userId);
$now = ds_now_sql();
$reason = trim((string) ($body['reason'] ?? ''));
$notes = trim((string) ($body['notes'] ?? ''));

if ($action === 'reject_account' || $action === 'reopen_account') {
    if ($action === 'reject_account') {
        if ($reason === '') {
            ds_error(400, 'VALIDATION_ERROR', 'A rejection reason is required.');
        }
        if (!in_array((string) ($target['account_status'] ?? ''), ['pending_verification', 'pending'], true)) {
            ds_error(409, 'INVALID_ACCOUNT_STATE', 'Only a pending registration can be rejected. Use suspend or block for an active account.');
        }
    }
    ds_ensure_provider_moderation_schema();
    $pdo = ds_pdo();
    $pdo->beginTransaction();
    try {
        if ($action === 'reject_account' && $profile && ds_column_exists('provider_profiles', 'is_published')) {
            $pdo->prepare('UPDATE provider_profiles SET is_published = 0, updated_at = ? WHERE user_id = ?')
                ->execute([$now, $userId]);
        }
        // Keep identity verification untouched. Account state is derived from
        // this event, not from verification_status. Persist canonical action
        // names so the account-state resolver reads the same vocabulary.
        $eventAction = $action === 'reject_account' ? 'account_reject' : 'account_reopen';
        ds_moderation_log($userId, $eventAction, $admin['id'], $reason !== '' ? $reason : null, $notes !== '' ? $notes : null, null, [
            'identityVerificationChanged' => false,
        ]);
        ds_audit('provider.' . $action, 'provider', $userId, [
            'reason' => $reason,
            'identityVerificationChanged' => false,
        ], $admin['id']);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
    if ($action === 'reject_account') {
        try {
            ds_send_template(
                'account_rejected',
                (string) ($target['email'] ?? ''),
                (string) ($target['first_name'] ?? ''),
                [
                    'reason' => $reason,
                    'link' => ds_app_link('/provider/dashboard'),
                ],
                ['user' => $userId]
            );
        } catch (Throwable $e) {
            // The persisted decision is authoritative even if mail is unavailable.
        }
    }
    ds_success([
        'accountStatus' => $action === 'reject_account' ? 'rejected' : (string) ($target['account_status'] ?? 'pending_verification'),
        'identityStatus' => (string) (ds_provider_identity_summary($userId)['identityStatus'] ?? 'not_submitted'),
    ]);
}

if ($action === 'update_profile') {
    if (!$profile) {
        ds_error(404, 'NOT_FOUND', 'Provider profile not found.');
    }
    $displayName = trim((string) ($body['displayName'] ?? $profile['display_name'] ?? ''));
    $city = trim((string) ($body['city'] ?? $profile['city'] ?? ''));
    $about = trim((string) ($body['about'] ?? $profile['about'] ?? ''));
    $serviceArea = trim((string) ($body['serviceArea'] ?? $profile['service_area'] ?? ''));
    $workingDays = trim((string) ($body['workingDays'] ?? $profile['working_days'] ?? ''));
    $workingHours = trim((string) ($body['workingHours'] ?? $profile['working_hours'] ?? ''));
    ds_pdo()->prepare(
        'UPDATE provider_profiles SET display_name = ?, city = ?, about = ?, service_area = ?,
         working_days = ?, working_hours = ?, updated_at = ? WHERE id = ?'
    )->execute([
        $displayName !== '' ? $displayName : $profile['display_name'],
        $city !== '' ? $city : null,
        $about !== '' ? $about : null,
        $serviceArea !== '' ? $serviceArea : null,
        $workingDays !== '' ? $workingDays : null,
        $workingHours !== '' ? $workingHours : null,
        $now,
        $profile['id'],
    ]);
    ds_audit('provider.profile_update', 'provider_profile', (string) $profile['id'], [], $admin['id']);
    ds_moderation_log($userId, 'profile_update', $admin['id'], null, $notes !== '' ? $notes : null);
    ds_success(['updated' => true]);
}

if ($action === 'moderate_image') {
    $imageId = trim((string) ($body['imageId'] ?? ''));
    $moderation = strtolower(trim((string) ($body['moderation'] ?? '')));
    if ($imageId === '' || !in_array($moderation, ['approve', 'hide', 'remove'], true)) {
        ds_error(400, 'VALIDATION_ERROR', 'imageId and moderation (approve|hide|remove) are required.');
    }
    $stmt = ds_pdo()->prepare('SELECT g.*, p.user_id FROM provider_gallery_images g INNER JOIN provider_profiles p ON p.id = g.provider_profile_id WHERE g.id = ? LIMIT 1');
    $stmt->execute([$imageId]);
    $img = $stmt->fetch();
    if (!$img || (string) $img['user_id'] !== $userId) {
        ds_error(404, 'NOT_FOUND', 'Gallery image not found for this provider.');
    }
    if ($moderation === 'remove') {
        ds_unlink_provider_media_file($img['path'] ?? null);
        ds_unlink_provider_media_file($img['thumb_path'] ?? null);
        ds_pdo()->prepare('DELETE FROM provider_gallery_images WHERE id = ?')->execute([$imageId]);
        ds_gallery_sync_profile_fields((string) $img['provider_profile_id']);
        ds_moderation_log($userId, 'image_remove', $admin['id'], $reason !== '' ? $reason : 'Image removed', $notes !== '' ? $notes : null, null, ['imageId' => $imageId]);
        ds_audit('provider.gallery.moderate_remove', 'provider_gallery_image', $imageId, [], $admin['id']);
        ds_success(['removed' => true]);
    }
    $status = $moderation === 'approve' ? 'approved' : 'hidden';
    ds_pdo()->prepare(
        'UPDATE provider_gallery_images SET moderation_status = ?, moderated_by = ?, moderated_at = ?, moderation_reason = ?, updated_at = ? WHERE id = ?'
    )->execute([$status, $admin['id'], $now, $reason !== '' ? $reason : null, $now, $imageId]);
    ds_gallery_sync_profile_fields((string) $img['provider_profile_id']);
    ds_moderation_log($userId, 'image_' . $moderation, $admin['id'], $reason !== '' ? $reason : null, $notes !== '' ? $notes : null, null, ['imageId' => $imageId]);
    ds_audit('provider.gallery.moderate', 'provider_gallery_image', $imageId, ['status' => $status], $admin['id']);
    ds_success(['moderationStatus' => $status]);
}

if ($action === 'suspend' || $action === 'activate') {
    if ($action === 'suspend' && $reason === '') {
        ds_error(400, 'VALIDATION_ERROR', 'A suspension reason is required.');
    }
    $until = trim((string) ($body['until'] ?? ''));
    $untilSql = null;
    if ($until !== '') {
        $ts = strtotime($until);
        if ($ts === false) {
            ds_error(400, 'VALIDATION_ERROR', 'Invalid suspension end date.');
        }
        $untilSql = date('Y-m-d H:i:s.000', $ts);
    }
    $status = $action === 'suspend' ? 'suspended' : 'active';
    $pdo = ds_pdo();
    $pdo->beginTransaction();
    try {
        if ($action === 'suspend') {
            $pdo->prepare(
                'UPDATE users SET account_status = ?, suspend_reason = ?, suspended_until = ?, suspend_notes = ?, updated_at = ? WHERE id = ?'
            )->execute([$status, $reason, $untilSql, $notes !== '' ? $notes : null, $now, $userId]);
            if (ds_column_exists('provider_profiles', 'is_published')) {
                $pdo->prepare('UPDATE provider_profiles SET is_published = 0, updated_at = ? WHERE user_id = ?')
                    ->execute([$now, $userId]);
            }
        } else {
            $pdo->prepare(
                'UPDATE users SET account_status = ?, suspend_reason = NULL, suspended_until = NULL, suspend_notes = NULL, updated_at = ? WHERE id = ?'
            )->execute([$status, $now, $userId]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
    ds_moderation_log($userId, $action, $admin['id'], $reason !== '' ? $reason : null, $notes !== '' ? $notes : null, $untilSql);
    ds_audit('provider.' . $action, 'user', $userId, ['reason' => $reason, 'until' => $untilSql], $admin['id']);
    $undoId = ds_reversible_record(
        'provider.account.' . $action,
        ($action === 'suspend' ? 'Suspended ' : 'Reactivated ') . (string) ($target['email'] ?? 'provider'),
        'users',
        $userId,
        [
            'account_status' => (string) ($target['account_status'] ?? 'active'),
            'suspend_reason' => $target['suspend_reason'] ?? null,
            'suspended_until' => $target['suspended_until'] ?? null,
            'suspend_notes' => $target['suspend_notes'] ?? null,
        ],
        [
            'account_status' => $status,
            'suspend_reason' => $action === 'suspend' ? $reason : null,
            'suspended_until' => $action === 'suspend' ? $untilSql : null,
            'suspend_notes' => $action === 'suspend' && $notes !== '' ? $notes : null,
        ],
        [],
        $admin['id']
    );
    ds_success(['userId' => $userId, 'accountStatus' => $status, 'undoActionId' => $undoId]);
}

if ($action === 'block' || $action === 'unblock') {
    if ($action === 'block' && $reason === '') {
        ds_error(400, 'VALIDATION_ERROR', 'A block reason is required.');
    }
    $status = $action === 'block' ? 'banned' : 'active';
    $pdo = ds_pdo();
    $pdo->beginTransaction();
    try {
        if ($action === 'block') {
            $pdo->prepare('UPDATE users SET account_status = ?, block_reason = ?, updated_at = ? WHERE id = ?')
                ->execute([$status, $reason, $now, $userId]);
            if (ds_column_exists('provider_profiles', 'is_published')) {
                $pdo->prepare('UPDATE provider_profiles SET is_published = 0, updated_at = ? WHERE user_id = ?')
                    ->execute([$now, $userId]);
            }
            ds_bump_auth_epoch($userId);
        } else {
            $pdo->prepare('UPDATE users SET account_status = ?, block_reason = NULL, updated_at = ? WHERE id = ?')
                ->execute([$status, $now, $userId]);
            // Unblock does not auto-verify or auto-publish.
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
    ds_moderation_log($userId, $action, $admin['id'], $reason !== '' ? $reason : null, $notes !== '' ? $notes : null);
    ds_audit('provider.' . $action, 'user', $userId, ['reason' => $reason], $admin['id']);
    $undoId = ds_reversible_record(
        'provider.account.' . $action,
        ($action === 'block' ? 'Blocked ' : 'Unblocked ') . (string) ($target['email'] ?? 'provider'),
        'users',
        $userId,
        ['account_status' => (string) ($target['account_status'] ?? 'active'), 'block_reason' => $target['block_reason'] ?? null],
        ['account_status' => $status, 'block_reason' => $action === 'block' ? $reason : null],
        [],
        $admin['id']
    );
    ds_success(['userId' => $userId, 'accountStatus' => $status, 'undoActionId' => $undoId]);
}

if ($action === 'remove' || $action === 'restore') {
    if (!$profile) {
        ds_error(404, 'NOT_FOUND', 'Provider profile not found.');
    }
    if ($action === 'remove' && $reason === '') {
        ds_error(400, 'VALIDATION_ERROR', 'A removal reason is required.');
    }
    $pdo = ds_pdo();
    $pdo->beginTransaction();
    try {
        if ($action === 'remove') {
            $pdo->prepare(
                'UPDATE provider_profiles SET is_published = 0, removed_at = ?, removed_by = ?, remove_reason = ?, updated_at = ? WHERE id = ?'
            )->execute([$now, $admin['id'], $reason, $now, $profile['id']]);
        } else {
            $pdo->prepare(
                'UPDATE provider_profiles SET removed_at = NULL, removed_by = NULL, remove_reason = NULL, updated_at = ? WHERE id = ?'
            )->execute([$now, $profile['id']]);
            // Restore does not auto-publish or change verification.
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
    ds_moderation_log($userId, $action === 'remove' ? 'remove_profile' : 'restore_profile', $admin['id'], $reason !== '' ? $reason : null, $notes !== '' ? $notes : null);
    ds_audit('provider.' . $action, 'provider_profile', (string) $profile['id'], ['reason' => $reason], $admin['id']);
    ds_success(['userId' => $userId, 'removed' => $action === 'remove']);
}

if ($action === 'publish' || $action === 'unpublish') {
    if (!$profile) {
        ds_error(404, 'NOT_FOUND', 'Provider profile not found.');
    }
    if (!ds_column_exists('provider_profiles', 'is_published')) {
        ds_error(503, 'NOT_CONFIGURED', 'Publication column missing. Run the CMS migration.');
    }
    if ($action === 'publish') {
        if (ds_is_qa_email((string) ($target['email'] ?? ''))) {
            ds_error(409, 'TEST_ACCOUNT', 'Test accounts cannot be published to the public site.');
        }
        if (!empty($profile['removed_at'])) {
            ds_error(409, 'PROFILE_REMOVED', 'Restore the profile before publishing.');
        }
        if ((string) ($target['account_status'] ?? '') !== 'active') {
            ds_error(409, 'NOT_ELIGIBLE', 'Only active accounts can be published.');
        }
        if (empty($target['email_verified_at'])) {
            ds_error(409, 'NOT_ELIGIBLE', 'Email confirmation is required before publishing.');
        }
        // Publication is an editorial decision independent of identity review.
        // It never changes verification_status and never grants booking access.
        ds_pdo()->prepare('UPDATE provider_profiles SET is_published = 1, published_at = ?, updated_at = ? WHERE user_id = ?')
            ->execute([$now, $now, $userId]);
        ds_moderation_log($userId, 'publish', $admin['id']);
        ds_audit('provider.publish', 'provider_profile', (string) $profile['id'], [], $admin['id']);
        $undoId = ds_reversible_record('provider.publish', 'Published ' . (string) ($profile['display_name'] ?? 'provider'), 'provider_profiles', (string) $profile['id'], ['is_published' => (int) ($profile['is_published'] ?? 0)], ['is_published' => 1], [], $admin['id']);
        ds_success(['userId' => $userId, 'published' => true, 'undoActionId' => $undoId]);
    }
    ds_pdo()->prepare('UPDATE provider_profiles SET is_published = 0, updated_at = ? WHERE user_id = ?')
        ->execute([$now, $userId]);
    ds_moderation_log($userId, 'unpublish', $admin['id']);
    ds_audit('provider.unpublish', 'provider_profile', (string) $profile['id'], [], $admin['id']);
    $undoId = ds_reversible_record('provider.unpublish', 'Unpublished ' . (string) ($profile['display_name'] ?? 'provider'), 'provider_profiles', (string) $profile['id'], ['is_published' => (int) ($profile['is_published'] ?? 1)], ['is_published' => 0], [], $admin['id']);
    ds_success(['userId' => $userId, 'published' => false, 'undoActionId' => $undoId]);
}

if ($action === 'permanently_delete') {
    ds_require_permission('providers.delete');
    $confirm = trim((string) ($body['confirm'] ?? ''));
    if ($confirm !== 'DELETE') {
        ds_error(400, 'CONFIRMATION_REQUIRED', 'Type DELETE to confirm permanent deletion.');
    }
    if ($reason === '') {
        ds_error(400, 'VALIDATION_ERROR', 'A deletion reason is required.');
    }

    $bookingCount = 0;
    if ($profile && ds_table_exists('bookings')) {
        $bc = ds_pdo()->prepare('SELECT COUNT(*) AS c FROM bookings WHERE provider_profile_id = ?');
        $bc->execute([(string) $profile['id']]);
        $bookingCount = (int) ($bc->fetch()['c'] ?? 0);
    }

    $pdo = ds_pdo();
    $pdo->beginTransaction();
    try {
        // Soft-delete account; anonymize PII; keep booking rows intact.
        $anonEmail = 'deleted+' . substr(hash('sha256', $userId), 0, 16) . '@invalid.local';
        $pdo->prepare(
            'UPDATE users SET email = ?, phone = NULL, first_name = ?, last_name = ?,
             account_status = ?, password_hash = ?, block_reason = ?, updated_at = ? WHERE id = ?'
        )->execute([
            $anonEmail,
            'Deleted',
            'Provider',
            'deleted',
            password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT),
            $reason,
            $now,
            $userId,
        ]);
        if ($profile) {
            $pdo->prepare(
                'UPDATE provider_profiles SET display_name = ?, about = NULL, public_phone = 0, public_whatsapp = 0,
                 public_email = 0, primary_image = NULL, cover_image = NULL, gallery_json = ?,
                 is_published = 0, removed_at = ?, remove_reason = ?, updated_at = ? WHERE id = ?'
            )->execute([
                'Removed provider',
                json_encode([]),
                $now,
                $reason,
                $now,
                $profile['id'],
            ]);
            // Hide gallery rows but retain files until a separate retention job — do not hard-delete uploads here.
            if (ds_table_exists('provider_gallery_images')) {
                $pdo->prepare(
                    "UPDATE provider_gallery_images SET moderation_status = 'removed', moderated_by = ?, moderated_at = ?, moderation_reason = ?, updated_at = ?
                     WHERE provider_profile_id = ?"
                )->execute([$admin['id'], $now, 'Account permanently deleted', $now, $profile['id']]);
            }
        }
        ds_bump_auth_epoch($userId);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
    ds_moderation_log($userId, 'permanently_delete', $admin['id'], $reason, $notes !== '' ? $notes : null, null, [
        'bookingsPreserved' => $bookingCount,
    ]);
    ds_audit('provider.permanently_delete', 'user', $userId, [
        'reason' => $reason,
        'bookingsPreserved' => $bookingCount,
    ], $admin['id']);
    ds_success([
        'deleted' => true,
        'mode' => 'anonymized',
        'bookingsPreserved' => $bookingCount,
    ]);
}

ds_error(400, 'VALIDATION_ERROR', 'Unhandled provider action.');

function ds_admin_provider_list_dto(array $row): array
{
    $account = (string) ($row['account_status'] ?? 'active');
    $accountState = ds_provider_account_state([
        'id' => (string) ($row['user_id'] ?? ''),
        'account_status' => $account,
    ]);
    $account = (string) $accountState['status'];
    $removed = !empty($row['removed_at']);
    return [
        'userId' => (string) $row['user_id'],
        'profileId' => $row['profile_id'] !== null ? (string) $row['profile_id'] : null,
        'displayName' => (string) ($row['display_name'] ?? trim((string) ($row['email'] ?? ''))),
        'email' => (string) $row['email'],
        'phone' => (string) ($row['phone'] ?? ''),
        'kind' => (string) ($row['provider_type'] ?? 'individual'),
        'city' => (string) ($row['city'] ?? ''),
        'region' => (string) ($row['region'] ?? ''),
        'district' => isset($row['district']) && $row['district'] !== null ? (string) $row['district'] : null,
        'area' => isset($row['area_neighbourhood']) && $row['area_neighbourhood'] !== null ? (string) $row['area_neighbourhood'] : null,
        'slug' => $row['slug'] !== null ? (string) $row['slug'] : null,
        'accountStatus' => $account,
        'accountRejectionReason' => $accountState['reason'],
        'listingStatus' => $removed ? 'removed' : (((int) ($row['is_published'] ?? 0) === 1) ? 'published' : 'unpublished'),
        'removed' => $removed,
        'emailVerified' => !empty($row['email_verified_at']),
        'verificationStatus' => (string) ($row['verification_status'] ?? 'unverified'),
        'identityStatus' => (string) ($row['identity_status'] ?? 'not_submitted'),
        'rejectionReason' => $row['rejection_reason'] ?? null,
        'published' => (int) ($row['is_published'] ?? 0) === 1 && !$removed,
        'publishedAt' => $row['published_at'] ?? null,
        'primaryImage' => $row['primary_image'] ?? null,
        'suspendReason' => $row['suspend_reason'] ?? null,
        'suspendedUntil' => $row['suspended_until'] ?? null,
        'blockReason' => $row['block_reason'] ?? null,
        'submittedAt' => $row['submitted_for_review_at'] ?? null,
        'createdAt' => $row['created_at'] ?? null,
    ];
}

function ds_admin_provider_detail(string $userId): void
{
    global $admin;
    $user = ds_find_user_by_id($userId);
    if (!$user || (string) ($user['role'] ?? '') !== 'massage_provider') {
        ds_error(404, 'NOT_FOUND', 'Provider not found.');
    }
    $profile = ds_provider_profile_by_user($userId);
    $verification = null;
    if (ds_table_exists('provider_verification')) {
        $stmt = ds_pdo()->prepare('SELECT * FROM provider_verification WHERE provider_user_id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $verification = $stmt->fetch() ?: null;
    }

    $bookings = [];
    if ($profile && ds_table_exists('bookings')) {
        $b = ds_pdo()->prepare(
            'SELECT id, reference, status, service_name, price, currency, scheduled_at, customer_name, created_at
             FROM bookings WHERE provider_profile_id = ? ORDER BY created_at DESC LIMIT 40'
        );
        $b->execute([(string) $profile['id']]);
        foreach ($b->fetchAll() ?: [] as $row) {
            $bookings[] = [
                'id' => (string) $row['id'],
                'reference' => $row['reference'],
                'status' => $row['status'],
                'serviceName' => $row['service_name'],
                'price' => (float) $row['price'],
                'currency' => $row['currency'],
                'scheduledAt' => $row['scheduled_at'],
                'customerName' => $row['customer_name'],
                'createdAt' => $row['created_at'],
            ];
        }
    }

    $services = [];
    if ($profile && ds_table_exists('services')) {
        $s = ds_pdo()->prepare('SELECT id, name, duration_minutes, price, currency, is_active FROM services WHERE provider_profile_id = ? ORDER BY sort_order ASC');
        $s->execute([(string) $profile['id']]);
        foreach ($s->fetchAll() ?: [] as $row) {
            $services[] = [
                'id' => (string) $row['id'],
                'name' => (string) $row['name'],
                'durationMinutes' => (int) $row['duration_minutes'],
                'price' => (float) $row['price'],
                'currency' => (string) $row['currency'],
                'active' => (int) $row['is_active'] === 1,
            ];
        }
    }

    $history = [];
    if (ds_table_exists('provider_moderation_events')) {
        $h = ds_pdo()->prepare(
            'SELECT * FROM provider_moderation_events WHERE provider_user_id = ? ORDER BY created_at DESC LIMIT 80'
        );
        $h->execute([$userId]);
        foreach ($h->fetchAll() ?: [] as $row) {
            $history[] = [
                'id' => (string) $row['id'],
                'action' => (string) $row['action'],
                'reason' => $row['reason'],
                'notes' => $row['notes'],
                'untilAt' => $row['until_at'],
                'actorUserId' => $row['actor_user_id'],
                'createdAt' => $row['created_at'],
            ];
        }
    }

    $images = $profile ? ds_gallery_list_for_profile((string) $profile['id'], true) : [];
    $team = ($profile && (string) ($profile['provider_type'] ?? '') === 'agency')
        ? ds_agency_team_members((string) $profile['id'], false)
        : [];

    $listRow = [
        'user_id' => $userId,
        'email' => $user['email'],
        'phone' => $user['phone'] ?? '',
        'account_status' => $user['account_status'],
        'email_verified_at' => $user['email_verified_at'] ?? null,
        'created_at' => $user['created_at'] ?? null,
        'suspend_reason' => $user['suspend_reason'] ?? null,
        'suspended_until' => $user['suspended_until'] ?? null,
        'block_reason' => $user['block_reason'] ?? null,
        'profile_id' => $profile['id'] ?? null,
        'slug' => $profile['slug'] ?? null,
        'display_name' => $profile['display_name'] ?? null,
        'provider_type' => $profile['provider_type'] ?? 'individual',
        'city' => $profile['city'] ?? '',
        'region' => $profile['region'] ?? '',
        'district' => $profile['district'] ?? null,
        'area_neighbourhood' => $profile['area_neighbourhood'] ?? null,
        'is_published' => $profile['is_published'] ?? 0,
        'published_at' => $profile['published_at'] ?? null,
        'removed_at' => $profile['removed_at'] ?? null,
        'primary_image' => $profile['primary_image'] ?? null,
        'cover_image' => $profile['cover_image'] ?? null,
        'verification_status' => $verification['verification_status'] ?? 'unverified',
        'identity_status' => $verification['identity_status'] ?? 'not_submitted',
        'verification_choice' => $verification['verification_choice'] ?? null,
        'business_status' => $verification['business_status'] ?? null,
        'rejection_reason' => $verification['rejection_reason'] ?? null,
        'submitted_for_review_at' => $verification['submitted_for_review_at'] ?? null,
        'identity_submitted_at' => $verification['identity_submitted_at'] ?? null,
        'selfie_submitted_at' => $verification['selfie_submitted_at'] ?? null,
    ];

    $verificationSummary = ds_provider_verification_summary($verification ?? [], $userId);
    $identityDocuments = [];
    if (ds_table_exists('provider_identity_documents')) {
        try {
            $docStmt = ds_pdo()->prepare(
                'SELECT id, id_type, id_image_path, selfie_image_path, status, verification_choice, is_current, created_at
                 FROM provider_identity_documents WHERE provider_user_id = ?
                 ORDER BY is_current DESC, created_at DESC, id DESC LIMIT 10'
            );
            $docStmt->execute([$userId]);
            foreach ($docStmt->fetchAll() ?: [] as $doc) {
                $identityDocuments[] = [
                    'id' => (string) $doc['id'],
                    'idType' => (string) $doc['id_type'],
                    'status' => (string) $doc['status'],
                    'hasId' => trim((string) ($doc['id_image_path'] ?? '')) !== '',
                    'hasSelfie' => trim((string) ($doc['selfie_image_path'] ?? '')) !== '',
                    'verificationChoice' => $doc['verification_choice'] ?? null,
                    'createdAt' => $doc['created_at'],
                ];
            }
        } catch (Throwable $e) {
            $identityDocuments = [];
        }
    }

    ds_success([
        'provider' => ds_admin_provider_list_dto($listRow),
        'profile' => $profile ? [
            'id' => (string) $profile['id'],
            'slug' => $profile['slug'],
            'displayName' => $profile['display_name'],
            'businessName' => $profile['business_name'] ?? null,
            'about' => $profile['about'] ?? '',
            'city' => $profile['city'] ?? '',
            'region' => $profile['region'] ?? '',
            'district' => $profile['district'] ?? null,
            'area' => $profile['area_neighbourhood'] ?? null,
            'serviceArea' => $profile['service_area'] ?? '',
            'serviceAreas' => ds_provider_service_areas($profile),
            'serviceRegions' => array_values(array_map('strval', ds_json_decode_field($profile['service_regions_json'] ?? null))),
            'offersHomeVisit' => ds_provider_offers_home_visit($profile),
            'offersStudio' => ds_provider_offers_studio($profile),
            'latitude' => ds_user_has_permission($admin, 'providers.write') && isset($profile['latitude']) && $profile['latitude'] !== null
                ? (float) $profile['latitude'] : null,
            'longitude' => ds_user_has_permission($admin, 'providers.write') && isset($profile['longitude']) && $profile['longitude'] !== null
                ? (float) $profile['longitude'] : null,
            'workingDays' => $profile['working_days'] ?? '',
            'workingHours' => $profile['working_hours'] ?? '',
            'startingPrice' => isset($profile['starting_price']) ? (float) $profile['starting_price'] : null,
            'currency' => $profile['currency'] ?? 'GHS',
            'primaryImage' => $profile['primary_image'] ?? null,
            'coverImage' => $profile['cover_image'] ?? null,
            'removeReason' => $profile['remove_reason'] ?? null,
            'removedAt' => $profile['removed_at'] ?? null,
        ] : null,
        'verification' => [
            'status' => $verificationSummary['status'],
            'identityStatus' => $verificationSummary['identityStatus'],
            'verificationChoice' => $verificationSummary['verificationChoice'],
            'businessStatus' => $verificationSummary['businessStatus'],
            'rejectionReason' => $verificationSummary['rejectionReason'],
            'adminNotes' => $verificationSummary['adminNotes'],
            'submittedAt' => $verificationSummary['submittedAt'],
            'identitySubmittedAt' => $verificationSummary['identitySubmittedAt'],
            'selfieSubmittedAt' => $verificationSummary['selfieSubmittedAt'],
            'hasIdDocument' => $verificationSummary['hasIdDocument'],
            'hasSelfie' => $verificationSummary['hasSelfie'],
            'verifiedAt' => $verificationSummary['verifiedAt'],
            'identityDocuments' => $identityDocuments,
            'reviewHistory' => ds_provider_review_history($userId),
        ],
        'images' => $images,
        'services' => $services,
        'bookings' => $bookings,
        'teamMembers' => $team,
        'moderationHistory' => $history,
        'badges' => ds_admin_provider_badges($user, $profile, $verification),
    ]);
}

function ds_admin_provider_badges(array $user, ?array $profile, ?array $verification): array
{
    $accountState = ds_provider_account_state($user);
    $account = (string) $accountState['status'];
    $badges = [];
    if ($account === 'active') {
        $badges[] = 'Active';
    }
    if ($account === 'rejected') {
        $badges[] = 'Account Rejected';
    }
    if ($account === 'suspended') {
        $badges[] = 'Suspended';
    }
    if ($account === 'banned') {
        $badges[] = 'Blocked';
    }
    if ($account === 'deleted') {
        $badges[] = 'Deleted';
    }
    $v = (string) ($verification['verification_status'] ?? 'unverified');
    if (in_array($v, ['pending_review', 'changes_requested'], true)) {
        $badges[] = 'Pending Review';
    }
    if (!empty($profile['removed_at'])) {
        $badges[] = 'Removed';
    }
    if ($profile && empty($profile['removed_at']) && (int) ($profile['is_published'] ?? 0) === 1) {
        $badges[] = 'Published';
    } elseif ($profile) {
        $badges[] = 'Unpublished';
    }
    return $badges;
}
