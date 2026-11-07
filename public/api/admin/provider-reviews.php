<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/bootstrap.php';

$admin = ds_require_permission('reviews.read');
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if (!ds_table_exists('provider_verification')) {
    ds_error(503, 'NOT_CONFIGURED', 'Verification table is not installed.');
}

$pdo = ds_pdo();

/** Statuses that still require an admin decision. */
const DS_REVIEW_PENDING = ['pending_review', 'changes_requested'];
/** Statuses that carry a final decision and belong in review history. */
const DS_REVIEW_DECIDED = ['verified', 'rejected'];

if ($method === 'GET') {
    ds_require_method('GET');

    $scope = strtolower(trim((string) ($_GET['scope'] ?? 'all')));
    if (!in_array($scope, ['all', 'pending', 'history'], true)) {
        $scope = 'all';
    }
    $search = trim((string) ($_GET['q'] ?? ''));

    $where = [];
    $params = [];
    if ($scope === 'pending') {
        $where[] = "v.verification_status IN ('pending_review','changes_requested')";
    } elseif ($scope === 'history') {
        $where[] = "v.verification_status IN ('verified','rejected')";
    } else {
        $where[] = "v.verification_status IN ('pending_review','changes_requested','verified','rejected')";
    }
    if ($search !== '') {
        $where[] = '(u.email LIKE ? OR p.display_name LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
        $like = '%' . $search . '%';
        array_push($params, $like, $like, $like, $like);
    }

    $stmt = $pdo->prepare(
        'SELECT v.*, u.first_name, u.last_name, u.email, u.phone,
                u.phone_verified_at AS user_phone_verified_at,
                u.email_verified_at AS user_email_verified_at,
                p.display_name, p.slug, p.city, p.provider_type, p.profile_completed_at,
                du.first_name AS decided_first_name, du.last_name AS decided_last_name, du.email AS decided_email
         FROM provider_verification v
         INNER JOIN users u ON u.id = v.provider_user_id
         LEFT JOIN provider_profiles p ON p.user_id = v.provider_user_id
         LEFT JOIN users du ON CAST(du.id AS BINARY) = CAST(v.verified_by AS BINARY)
         WHERE ' . implode(' AND ', $where) . '
         ORDER BY COALESCE(v.submitted_for_review_at, v.updated_at) DESC
         LIMIT 200'
    );
    $stmt->execute($params);
    $rows = $stmt->fetchAll() ?: [];

    $list = array_map(static function (array $row): array {
        $docs = [];
        if (ds_table_exists('provider_identity_documents')) {
            $docStmt = ds_pdo()->prepare(
                'SELECT id, id_type, status, created_at FROM provider_identity_documents
                 WHERE provider_user_id = ? ORDER BY created_at DESC LIMIT 5'
            );
            $docStmt->execute([$row['provider_user_id']]);
            $docs = $docStmt->fetchAll() ?: [];
        }

        $status = (string) $row['verification_status'];
        $decidedName = trim((string) ($row['decided_first_name'] ?? '') . ' ' . (string) ($row['decided_last_name'] ?? ''));
        if ($decidedName === '') {
            $decidedName = (string) ($row['decided_email'] ?? '');
        }

        return [
            'providerUserId' => (string) $row['provider_user_id'],
            'displayName' => (string) ($row['display_name'] ?: trim(($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? ''))),
            'email' => (string) $row['email'],
            'phone' => (string) ($row['phone'] ?? ''),
            'slug' => $row['slug'],
            'city' => (string) ($row['city'] ?? ''),
            'providerType' => (string) ($row['provider_type'] ?? 'individual'),
            'phoneVerified' => !empty($row['phone_verified_at']) || !empty($row['user_phone_verified_at']),
            'emailVerified' => !empty($row['email_verified_at']) || !empty($row['user_email_verified_at']),
            'identityStatus' => (string) $row['identity_status'],
            'paymentStatus' => (string) $row['payment_status'],
            'membershipFeeEnabled' => ds_membership_fee_enabled(),
            'membershipFree' => !ds_membership_fee_enabled(),
            'verificationStatus' => $status,
            'canDecide' => in_array($status, DS_REVIEW_PENDING, true),
            'canReopen' => in_array($status, DS_REVIEW_DECIDED, true),
            'submittedAt' => $row['submitted_for_review_at'] ?? $row['created_at'],
            'decidedAt' => $row['verified_at'] ?? null,
            'decidedBy' => $decidedName !== '' ? $decidedName : null,
            'adminNotes' => $row['admin_notes'],
            'rejectionReason' => $row['rejection_reason'],
            'identityDocuments' => array_map(static function (array $d): array {
                return [
                    'id' => (string) $d['id'],
                    'idType' => (string) $d['id_type'],
                    'status' => (string) $d['status'],
                    'createdAt' => $d['created_at'],
                    // File paths intentionally omitted from list payload.
                ];
            }, $docs),
        ];
    }, $rows);

    $pending = array_values(array_filter($list, static fn (array $r): bool => $r['canDecide']));
    $history = array_values(array_filter($list, static fn (array $r): bool => !$r['canDecide']));

    ds_success([
        'providers' => $scope === 'history' ? $history : ($scope === 'pending' ? $pending : $list),
        'pending' => $pending,
        'history' => $history,
        'counts' => ['pending' => count($pending), 'history' => count($history)],
    ]);
}

ds_require_method('POST');
ds_require_same_origin();
ds_require_permission('reviews.write');
ds_rate_limit('admin_provider_review', 60, 15 * 60);

$body = ds_json_body();
$providerUserId = trim((string) ($body['providerUserId'] ?? ''));
$action = strtolower(trim((string) ($body['action'] ?? '')));
$notes = trim((string) ($body['notes'] ?? ''));
$reason = trim((string) ($body['rejectionReason'] ?? ''));

if ($providerUserId === '' || !in_array($action, ['approve', 'reject', 'request_changes', 'reopen'], true)) {
    ds_error(400, 'VALIDATION_ERROR', 'Invalid review action.');
}

$target = ds_find_user_by_id($providerUserId);
if (!$target || !ds_is_provider_role((string) ($target['role'] ?? ''))) {
    ds_error(404, 'NOT_FOUND', 'Provider account not found.');
}

$verification = ds_ensure_provider_verification($providerUserId);
$previousStatus = (string) ($verification['verification_status'] ?? 'unverified');
$now = ds_now_sql();

if ($action === 'approve' && !in_array($previousStatus, DS_REVIEW_PENDING, true)) {
    ds_error(409, 'INVALID_REVIEW_STATE', 'This application is no longer pending a decision.');
}
if ($action === 'reopen' && !in_array($previousStatus, DS_REVIEW_DECIDED, true)) {
    ds_error(409, 'INVALID_REVIEW_STATE', 'Only approved or rejected applications can be reopened.');
}
if (in_array($action, ['approve', 'reopen'], true) && $notes === '' && $reason !== '') {
    $notes = $reason;
}
if (in_array($action, ['reject', 'request_changes'], true) && mb_strlen($reason) < 3) {
    ds_error(400, 'REASON_REQUIRED', 'Give the provider a clear reason so they can act on it.');
}

$pendingIn = "'pending_review','changes_requested'";
$decidedIn = "'verified','rejected'";

$pdo->beginTransaction();
try {
    if ($action === 'approve') {
        $stmt = $pdo->prepare(
            "UPDATE provider_verification SET
                verification_status = 'verified',
                identity_status = IF(identity_status = 'pending', 'approved', identity_status),
                verified_at = ?, verified_by = ?, admin_notes = ?, rejection_reason = NULL, updated_at = ?
             WHERE provider_user_id = ? AND verification_status IN ($pendingIn)"
        );
        $stmt->execute([$now, $admin['id'], $notes !== '' ? $notes : null, $now, $providerUserId]);
        if ($stmt->rowCount() === 0) {
            $pdo->rollBack();
            ds_error(409, 'INVALID_REVIEW_STATE', 'This application was already decided. Refresh the queue.');
        }
        if (ds_table_exists('provider_identity_documents')) {
            $pdo->prepare(
                "UPDATE provider_identity_documents SET status = 'approved', updated_at = ?
                 WHERE provider_user_id = ? AND status = 'pending'"
            )->execute([$now, $providerUserId]);
        }
    } elseif ($action === 'reject') {
        $stmt = $pdo->prepare(
            "UPDATE provider_verification SET
                verification_status = 'rejected',
                rejection_reason = ?, admin_notes = ?, verified_at = NULL, verified_by = NULL, updated_at = ?
             WHERE provider_user_id = ? AND verification_status IN ($pendingIn)"
        );
        $stmt->execute([$reason, $notes !== '' ? $notes : null, $now, $providerUserId]);
        if ($stmt->rowCount() === 0) {
            $pdo->rollBack();
            ds_error(409, 'INVALID_REVIEW_STATE', 'This application was already decided. Refresh the queue.');
        }
    } elseif ($action === 'request_changes') {
        $stmt = $pdo->prepare(
            "UPDATE provider_verification SET
                verification_status = 'changes_requested',
                rejection_reason = ?, admin_notes = ?, verified_at = NULL, verified_by = NULL, updated_at = ?
             WHERE provider_user_id = ? AND verification_status IN ($pendingIn)"
        );
        $stmt->execute([$reason, $notes !== '' ? $notes : null, $now, $providerUserId]);
        if ($stmt->rowCount() === 0) {
            $pdo->rollBack();
            ds_error(409, 'INVALID_REVIEW_STATE', 'This application is no longer pending. Refresh the queue.');
        }
    } else {
        $stmt = $pdo->prepare(
            "UPDATE provider_verification SET
                verification_status = 'pending_review',
                submitted_for_review_at = ?, verified_at = NULL, verified_by = NULL, updated_at = ?
             WHERE provider_user_id = ? AND verification_status IN ($decidedIn)"
        );
        $stmt->execute([$now, $now, $providerUserId]);
        if ($stmt->rowCount() === 0) {
            $pdo->rollBack();
            ds_error(409, 'INVALID_REVIEW_STATE', 'Only a decided application can be reopened.');
        }
    }
    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    throw $e;
}

$newStatus = [
    'approve' => 'verified',
    'reject' => 'rejected',
    'request_changes' => 'changes_requested',
    'reopen' => 'pending_review',
][$action];

ds_audit('provider.review_' . $action, 'provider', $providerUserId, [
    'from' => $previousStatus,
    'to' => $newStatus,
    'reason' => $reason,
    'notes' => $notes,
], $admin['id']);

ds_success([
    'verificationStatus' => $newStatus,
    'previousStatus' => $previousStatus,
]);
