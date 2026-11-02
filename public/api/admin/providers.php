<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

$admin = ds_require_admin();
if (!ds_cms_ready()) {
    ds_cms_migrate();
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
    $kind = strtolower(trim((string) ($_GET['kind'] ?? 'all')));
    $search = trim((string) ($_GET['q'] ?? ''));

    $where = ["u.role = 'massage_provider'"];
    $params = [];
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
                    p.id AS profile_id, p.slug, p.display_name, p.provider_type, p.city, p.is_published, p.published_at,
                    v.verification_status, v.identity_status, v.rejection_reason, v.submitted_for_review_at
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
        'providers' => array_map(static fn (array $row): array => [
            'userId' => (string) $row['user_id'],
            'profileId' => $row['profile_id'] !== null ? (string) $row['profile_id'] : null,
            'displayName' => (string) ($row['display_name'] ?? trim(($row['email'] ?? ''))),
            'email' => (string) $row['email'],
            'phone' => (string) ($row['phone'] ?? ''),
            'kind' => (string) ($row['provider_type'] ?? 'individual'),
            'city' => (string) ($row['city'] ?? ''),
            'slug' => $row['slug'] !== null ? (string) $row['slug'] : null,
            'accountStatus' => (string) $row['account_status'],
            'emailVerified' => !empty($row['email_verified_at']),
            'verificationStatus' => (string) ($row['verification_status'] ?? 'unverified'),
            'identityStatus' => (string) ($row['identity_status'] ?? 'not_submitted'),
            'rejectionReason' => $row['rejection_reason'] ?? null,
            'published' => (int) ($row['is_published'] ?? 0) === 1,
            'publishedAt' => $row['published_at'] ?? null,
            'submittedAt' => $row['submitted_for_review_at'] ?? null,
            'createdAt' => $row['created_at'] ?? null,
        ], $rows),
    ]);
}

ds_require_method('POST');
ds_require_same_origin();
ds_rate_limit('admin_providers', 60, 15 * 60);

$body = ds_json_body();
$userId = trim((string) ($body['providerUserId'] ?? ''));
$action = strtolower(trim((string) ($body['action'] ?? '')));

if ($userId === '' || !in_array($action, ['suspend', 'activate', 'publish', 'unpublish'], true)) {
    ds_error(400, 'VALIDATION_ERROR', 'Invalid provider action.');
}

$profile = ds_provider_profile_by_user($userId);
if (!$profile) {
    ds_error(404, 'NOT_FOUND', 'Provider profile not found.');
}

$now = ds_now_sql();

if ($action === 'suspend' || $action === 'activate') {
    $status = $action === 'suspend' ? 'suspended' : 'active';
    ds_pdo()->prepare('UPDATE users SET account_status = ?, updated_at = ? WHERE id = ?')
        ->execute([$status, $now, $userId]);
    if ($status === 'suspended' && ds_column_exists('provider_profiles', 'is_published')) {
        ds_pdo()->prepare('UPDATE provider_profiles SET is_published = 0, updated_at = ? WHERE user_id = ?')
            ->execute([$now, $userId]);
    }
    ds_audit('provider.' . $action, 'user', $userId, [], $admin['id']);
    ds_success(['userId' => $userId, 'accountStatus' => $status]);
}

if (!ds_column_exists('provider_profiles', 'is_published')) {
    ds_error(503, 'NOT_CONFIGURED', 'Publication column missing. Run the CMS migration.');
}

if ($action === 'publish') {
    // Publication requires an admin-approved identity review; never self-granted.
    if (!ds_provider_publicly_eligible_after_publish($userId)) {
        ds_error(409, 'NOT_ELIGIBLE', 'Only verified, active providers with email confirmation can be published.');
    }
    ds_pdo()->prepare('UPDATE provider_profiles SET is_published = 1, published_at = ?, updated_at = ? WHERE user_id = ?')
        ->execute([$now, $now, $userId]);
    ds_audit('provider.publish', 'provider_profile', (string) $profile['id'], [], $admin['id']);
    ds_success(['userId' => $userId, 'published' => true]);
}

ds_pdo()->prepare('UPDATE provider_profiles SET is_published = 0, updated_at = ? WHERE user_id = ?')
    ->execute([$now, $userId]);
ds_audit('provider.unpublish', 'provider_profile', (string) $profile['id'], [], $admin['id']);
ds_success(['userId' => $userId, 'published' => false]);

/** Verified + active + email confirmed, ignoring the publish flag itself. */
function ds_provider_publicly_eligible_after_publish(string $userId): bool
{
    $user = ds_find_user_by_id($userId);
    if (!$user || (string) $user['account_status'] !== 'active' || empty($user['email_verified_at'])) {
        return false;
    }
    $stmt = ds_pdo()->prepare('SELECT verification_status FROM provider_verification WHERE provider_user_id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    return $row && (string) $row['verification_status'] === 'verified';
}
