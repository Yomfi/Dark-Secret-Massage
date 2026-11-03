<?php
declare(strict_types=1);

/**
 * Staff directory: list, invite, role changes, deactivate.
 * Enforces last-full-admin protection and audits mutations.
 */

require_once dirname(__DIR__) . '/config/bootstrap.php';

$admin = ds_require_permission('staff.read');
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$pdo = ds_pdo();

if (!ds_table_exists('staff_profiles')) {
    ds_error(503, 'SCHEMA_NOT_MIGRATED', 'Staff tables need migration. Run: php scripts/migrate.php --apply');
}

function ds_staff_row_dto(array $u, ?array $profile): array
{
    $staffRole = $profile
        ? (string) $profile['staff_role']
        : (ds_legacy_role_to_staff((string) ($u['role'] ?? '')) ?? 'support');
    $active = $profile ? (int) $profile['is_active'] === 1 : true;
    return [
        'userId' => (string) $u['id'],
        'email' => (string) $u['email'],
        'name' => trim(($u['first_name'] ?? '') . ' ' . ($u['last_name'] ?? '')),
        'accountStatus' => (string) ($u['account_status'] ?? 'active'),
        'legacyRole' => (string) ($u['role'] ?? ''),
        'staffRole' => $staffRole,
        'staffRoleLabel' => ds_staff_roles()[$staffRole] ?? $staffRole,
        'isActive' => $active,
        'permissions' => ds_staff_role_permissions($staffRole),
        'invitedAt' => $profile['invited_at'] ?? null,
        'activatedAt' => $profile['activated_at'] ?? null,
        'createdAt' => $u['created_at'] ?? null,
    ];
}

if ($method === 'GET') {
    $rows = $pdo->query(
        "SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.account_status, u.created_at,
                sp.staff_role, sp.is_active, sp.invited_at, sp.activated_at
         FROM users u
         LEFT JOIN staff_profiles sp ON CAST(sp.user_id AS BINARY) = CAST(u.id AS BINARY)
         WHERE u.role IN ('admin','moderator','support_admin')
            OR sp.user_id IS NOT NULL
         ORDER BY u.created_at DESC
         LIMIT 200"
    )->fetchAll() ?: [];

    $staff = array_map(static function (array $row): array {
        $profile = isset($row['staff_role']) ? [
            'staff_role' => $row['staff_role'],
            'is_active' => $row['is_active'],
            'invited_at' => $row['invited_at'],
            'activated_at' => $row['activated_at'],
        ] : null;
        // When LEFT JOIN finds no profile, staff_role is null.
        if ($row['staff_role'] === null && $row['is_active'] === null) {
            $profile = null;
        }
        return ds_staff_row_dto($row, $profile);
    }, $rows);

    $invites = [];
    if (ds_table_exists('staff_invitations')) {
        $invites = $pdo->query(
            "SELECT id, email, staff_role, invited_by, expires_at, accepted_at, created_at
             FROM staff_invitations
             WHERE accepted_at IS NULL AND expires_at > NOW()
             ORDER BY created_at DESC LIMIT 50"
        )->fetchAll() ?: [];
    }

    ds_success([
        'staff' => $staff,
        'invitations' => array_map(static function (array $i): array {
            return [
                'id' => (string) $i['id'],
                'email' => (string) $i['email'],
                'staffRole' => (string) $i['staff_role'],
                'staffRoleLabel' => ds_staff_roles()[(string) $i['staff_role']] ?? $i['staff_role'],
                'expiresAt' => $i['expires_at'],
                'createdAt' => $i['created_at'],
            ];
        }, $invites),
        'roles' => ds_staff_roles(),
        'me' => ds_staff_permissions_payload($admin),
    ]);
}

ds_require_method('POST');
ds_require_same_origin();
ds_require_permission('staff.write');
ds_rate_limit('admin_staff', 40, 15 * 60);

$body = ds_json_body();
$action = strtolower(trim((string) ($body['action'] ?? '')));
$validRoles = array_keys(ds_staff_roles());

if ($action === 'invite') {
    $email = strtolower(trim((string) ($body['email'] ?? '')));
    $staffRole = trim((string) ($body['staffRole'] ?? 'support'));
    $firstName = trim((string) ($body['firstName'] ?? ''));
    $lastName = trim((string) ($body['lastName'] ?? ''));

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        ds_error(400, 'VALIDATION_ERROR', 'A valid email is required.');
    }
    if (!in_array($staffRole, $validRoles, true)) {
        ds_error(400, 'VALIDATION_ERROR', 'Invalid staff role.');
    }

    $stmt = $pdo->prepare('SELECT id, role, email FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $existing = $stmt->fetch();

    $rawToken = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $rawToken);
    $inviteId = ds_new_id();
    $now = ds_now_sql();
    $expires = (new DateTimeImmutable('+72 hours'))->format('Y-m-d H:i:s');

    if ($existing) {
        $userId = (string) $existing['id'];
        // Promote existing user into staff without wiping customer history.
        $legacyRole = $staffRole === 'full_admin' ? 'admin'
            : ($staffRole === 'provider_reviewer' ? 'moderator' : 'support_admin');
        $pdo->prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?')
            ->execute([$legacyRole, $now, $userId]);
        $pdo->prepare(
            'INSERT INTO staff_profiles (user_id, staff_role, is_active, invited_by, invited_at, created_at, updated_at)
             VALUES (?, ?, 1, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE staff_role = VALUES(staff_role), is_active = 1,
               invited_by = VALUES(invited_by), invited_at = VALUES(invited_at), updated_at = VALUES(updated_at)'
        )->execute([$userId, $staffRole, $admin['id'], $now, $now, $now]);

        // Password setup via reset token so we never invent passwords.
        $resetRaw = bin2hex(random_bytes(32));
        $resetHash = hash('sha256', $resetRaw);
        $pdo->prepare(
            'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at)
             VALUES (?, ?, ?, ?, ?)'
        )->execute([ds_new_id(), $userId, $resetHash, $expires, $now]);
        $link = ds_app_link('/reset-password', ['token' => $resetRaw]);
    } else {
        $userId = ds_new_id();
        $legacyRole = $staffRole === 'full_admin' ? 'admin'
            : ($staffRole === 'provider_reviewer' ? 'moderator' : 'support_admin');
        // Placeholder hash; invitee must set password via accept link.
        $placeholder = password_hash(bin2hex(random_bytes(24)), PASSWORD_DEFAULT);
        // Unique placeholder phone — never used for SMS; staff use email login.
        $phonePlaceholder = '+staff' . substr(preg_replace('/\D/', '', $userId) . bin2hex(random_bytes(3)), 0, 12);
        $pdo->prepare(
            'INSERT INTO users (id, email, phone, password_hash, first_name, last_name, role, account_status, email_verified_at, terms_accepted_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, \'active\', ?, ?, ?, ?)'
        )->execute([
            $userId,
            $email,
            $phonePlaceholder,
            $placeholder,
            $firstName !== '' ? $firstName : 'Staff',
            $lastName,
            $legacyRole,
            $now,
            $now,
            $now,
            $now,
        ]);
        $pdo->prepare(
            'INSERT INTO staff_profiles (user_id, staff_role, is_active, invited_by, invited_at, created_at, updated_at)
             VALUES (?, ?, 1, ?, ?, ?, ?)'
        )->execute([$userId, $staffRole, $admin['id'], $now, $now, $now]);

        $pdo->prepare(
            'INSERT INTO staff_invitations (id, email, staff_role, token_hash, invited_by, expires_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        )->execute([$inviteId, $email, $staffRole, $tokenHash, $admin['id'], $expires, $now]);

        $link = ds_app_link('/staff/accept', ['token' => $rawToken]);
    }

    $sent = ds_send_template(
        'staff_invite',
        $email,
        $firstName !== '' ? $firstName : 'there',
        [
            'first_name' => $firstName !== '' ? $firstName : '',
            'role_label' => ds_staff_roles()[$staffRole] ?? $staffRole,
            'link' => $link,
            'expires_hours' => 72,
        ],
        ['actor' => (string) $admin['id'], 'invite' => $inviteId]
    );

    if (!$sent['sent']) {
        ds_error(502, 'MAIL_FAILED', 'Invitation could not be emailed. Check mail configuration.');
    }

    ds_audit('staff.invited', 'user', $userId, [
        'email' => $email,
        'staffRole' => $staffRole,
    ], $admin['id']);

    ds_success([
        'invited' => true,
        'userId' => $userId,
        'email' => $email,
        'staffRole' => $staffRole,
    ]);
}

if ($action === 'set_role') {
    $userId = trim((string) ($body['userId'] ?? ''));
    $staffRole = trim((string) ($body['staffRole'] ?? ''));
    if ($userId === '' || !in_array($staffRole, $validRoles, true)) {
        ds_error(400, 'VALIDATION_ERROR', 'userId and staffRole are required.');
    }
    if ($userId === (string) $admin['id'] && $staffRole !== 'full_admin') {
        // Prevent accidental self-demotion lockout when you are the last full admin.
        if (ds_count_active_full_admins($userId) < 1) {
            ds_error(400, 'LAST_ADMIN', 'You cannot demote yourself as the last full administrator.');
        }
    }

    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $target = $stmt->fetch();
    if (!$target) {
        ds_error(404, 'NOT_FOUND', 'Staff user not found.');
    }

    $current = ds_staff_role_for_user($target);
    if ($current === 'full_admin' && $staffRole !== 'full_admin') {
        if (ds_count_active_full_admins($userId) < 1) {
            ds_error(400, 'LAST_ADMIN', 'Cannot demote the last active full administrator.');
        }
    }

    $now = ds_now_sql();
    $legacyRole = $staffRole === 'full_admin' ? 'admin'
        : ($staffRole === 'provider_reviewer' ? 'moderator' : 'support_admin');
    $pdo->prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?')
        ->execute([$legacyRole, $now, $userId]);
    $pdo->prepare(
        'INSERT INTO staff_profiles (user_id, staff_role, is_active, created_at, updated_at)
         VALUES (?, ?, 1, ?, ?)
         ON DUPLICATE KEY UPDATE staff_role = VALUES(staff_role), is_active = 1, updated_at = VALUES(updated_at)'
    )->execute([$userId, $staffRole, $now, $now]);

    ds_audit('staff.role_changed', 'user', $userId, [
        'from' => $current,
        'to' => $staffRole,
    ], $admin['id']);

    ds_success(['userId' => $userId, 'staffRole' => $staffRole]);
}

if ($action === 'deactivate' || $action === 'activate') {
    $userId = trim((string) ($body['userId'] ?? ''));
    if ($userId === '') {
        ds_error(400, 'VALIDATION_ERROR', 'userId is required.');
    }
    if ($userId === (string) $admin['id']) {
        ds_error(400, 'SELF_LOCKOUT', 'You cannot deactivate your own account.');
    }

    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $target = $stmt->fetch();
    if (!$target) {
        ds_error(404, 'NOT_FOUND', 'Staff user not found.');
    }

    if ($action === 'deactivate' && ds_staff_role_for_user($target) === 'full_admin') {
        if (ds_count_active_full_admins($userId) < 1) {
            ds_error(400, 'LAST_ADMIN', 'Cannot deactivate the last active full administrator.');
        }
    }

    $now = ds_now_sql();
    $active = $action === 'activate' ? 1 : 0;
    $pdo->prepare(
        'INSERT INTO staff_profiles (user_id, staff_role, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE is_active = VALUES(is_active), updated_at = VALUES(updated_at)'
    )->execute([
        $userId,
        ds_staff_role_for_user($target) ?? 'support',
        $active,
        $now,
        $now,
    ]);

    if ($action === 'deactivate') {
        $pdo->prepare('UPDATE users SET account_status = \'suspended\', updated_at = ? WHERE id = ?')
            ->execute([$now, $userId]);
    } else {
        $pdo->prepare('UPDATE users SET account_status = \'active\', updated_at = ? WHERE id = ?')
            ->execute([$now, $userId]);
    }

    ds_audit('staff.' . $action, 'user', $userId, [], $admin['id']);
    ds_success(['userId' => $userId, 'isActive' => $active === 1]);
}

ds_error(400, 'VALIDATION_ERROR', 'Unknown staff action.');
