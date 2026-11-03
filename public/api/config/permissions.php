<?php
declare(strict_types=1);

/**
 * Staff RBAC for Massager Studio CMS.
 * Legacy users.role values (admin, moderator, support_admin) map to staff roles
 * when no staff_profiles row exists.
 */

function ds_staff_roles(): array
{
    return [
        'full_admin' => 'Full administrator',
        'content_editor' => 'Content editor',
        'booking_ops' => 'Booking operations',
        'provider_reviewer' => 'Provider reviewer',
        'support' => 'Support',
    ];
}

/** Permission keys used by admin APIs. */
function ds_permission_catalog(): array
{
    return [
        'dashboard.read',
        'content.read', 'content.write',
        'media.read', 'media.write',
        'services.read', 'services.write',
        'customers.read', 'customers.write',
        'providers.read', 'providers.write',
        'reviews.read', 'reviews.write',
        'documents.read',
        'bookings.read', 'bookings.write',
        'staff.read', 'staff.write',
        'system.read', 'system.write',
        'audit.read',
        'reports.read',
        'privacy.write',
    ];
}

function ds_staff_role_permissions(string $staffRole): array
{
    $all = ds_permission_catalog();
    return match ($staffRole) {
        'full_admin' => $all,
        'content_editor' => [
            'dashboard.read',
            'content.read', 'content.write',
            'media.read', 'media.write',
            'services.read', 'services.write',
            'reports.read',
        ],
        'booking_ops' => [
            'dashboard.read',
            'bookings.read', 'bookings.write',
            'customers.read',
            'providers.read',
            'reports.read',
        ],
        'provider_reviewer' => [
            'dashboard.read',
            'providers.read', 'providers.write',
            'reviews.read', 'reviews.write',
            'documents.read',
            'customers.read',
        ],
        'support' => [
            'dashboard.read',
            'customers.read', 'customers.write',
            'bookings.read',
            'privacy.write',
            'audit.read',
        ],
        default => ['dashboard.read'],
    };
}

function ds_legacy_role_to_staff(string $userRole): ?string
{
    return match ($userRole) {
        'admin' => 'full_admin',
        'moderator' => 'provider_reviewer',
        'support_admin' => 'support',
        default => null,
    };
}

function ds_is_staff_user_role(string $role): bool
{
    return in_array($role, ['admin', 'moderator', 'support_admin'], true)
        || array_key_exists($role, ds_staff_roles());
}

/**
 * Resolve effective staff role for a user row.
 * Prefer staff_profiles when present; else map legacy users.role.
 */
function ds_staff_role_for_user(array $user): ?string
{
    $userId = (string) ($user['id'] ?? '');
    if ($userId !== '' && ds_table_exists('staff_profiles')) {
        $stmt = ds_pdo()->prepare('SELECT staff_role, is_active FROM staff_profiles WHERE user_id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        if ($row) {
            if (!(int) $row['is_active']) {
                return null;
            }
            return (string) $row['staff_role'];
        }
    }

    $legacy = ds_legacy_role_to_staff((string) ($user['role'] ?? ''));
    return $legacy;
}

function ds_user_has_permission(array $user, string $permission): bool
{
    $staffRole = ds_staff_role_for_user($user);
    if ($staffRole === null) {
        return false;
    }
    return in_array($permission, ds_staff_role_permissions($staffRole), true);
}

function ds_require_permission(string $permission): array
{
    $user = ds_require_user();
    if (!ds_user_has_permission($user, $permission)) {
        ds_error(403, 'FORBIDDEN', 'You do not have permission for this action.');
    }
    return $user;
}

/** Count active full administrators (staff_profiles or legacy admin role). */
function ds_count_active_full_admins(?string $excludeUserId = null): int
{
    $pdo = ds_pdo();
    $count = 0;

    if (ds_table_exists('staff_profiles')) {
        $sql = "SELECT COUNT(*) FROM staff_profiles sp
                INNER JOIN users u ON u.id = sp.user_id
                WHERE sp.staff_role = 'full_admin' AND sp.is_active = 1
                  AND COALESCE(u.account_status, 'active') = 'active'";
        $params = [];
        if ($excludeUserId) {
            $sql .= ' AND sp.user_id <> ?';
            $params[] = $excludeUserId;
        }
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $count = (int) $stmt->fetchColumn();
    }

    // Legacy admins without staff_profiles still count.
    if (ds_table_exists('staff_profiles')) {
        $sql = "SELECT COUNT(*) FROM users u
                LEFT JOIN staff_profiles sp ON sp.user_id = u.id
                WHERE u.role = 'admin'
                  AND COALESCE(u.account_status, 'active') = 'active'
                  AND sp.user_id IS NULL";
    } else {
        $sql = "SELECT COUNT(*) FROM users u
                WHERE u.role = 'admin'
                  AND COALESCE(u.account_status, 'active') = 'active'";
    }
    $params = [];
    if ($excludeUserId) {
        $sql .= ' AND u.id <> ?';
        $params[] = $excludeUserId;
    }
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $count += (int) $stmt->fetchColumn();

    return $count;
}

function ds_staff_permissions_payload(array $user): array
{
    $staffRole = ds_staff_role_for_user($user);
    $perms = $staffRole ? ds_staff_role_permissions($staffRole) : [];
    return [
        'staffRole' => $staffRole,
        'staffRoleLabel' => $staffRole ? (ds_staff_roles()[$staffRole] ?? $staffRole) : null,
        'permissions' => $perms,
        'isStaff' => $staffRole !== null,
    ];
}
