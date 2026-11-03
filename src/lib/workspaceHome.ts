import type { AuthUserDto } from './api';

/** Staff/CMS roles — customers and providers are never treated as staff here. */
export function isStaffUser(user: AuthUserDto | null | undefined): boolean {
  if (!user) return false;
  return (
    Boolean(user.isStaff) ||
    ['admin', 'moderator', 'support_admin'].includes(user.role)
  );
}

/** Safe post-login path for `/admin/login` only (admin routes, no open redirect). */
export function safeAdminRedirect(raw: string | null | undefined): string {
  const value = (raw || '').trim();
  if (value.startsWith('/admin') && !value.startsWith('//') && !value.includes('\\')) {
    return value;
  }
  return '/admin';
}

/** Post-login home path for the signed-in account. */
export function workspaceHomeForUser(user: AuthUserDto | null | undefined): string {
  if (!user) return '/login';
  if (isStaffUser(user)) {
    return '/admin';
  }
  if (user.role === 'massage_provider' || user.role === 'provider') {
    return '/provider/workspace';
  }
  return '/dashboard';
}

export function userHasPermission(
  user: AuthUserDto | null | undefined,
  permission: string,
): boolean {
  if (!user?.permissions?.length) {
    // Legacy staff without permission payload — allow admin workspace shell;
    // server still enforces.
    if (user && ['admin', 'moderator', 'support_admin'].includes(user.role)) {
      return true;
    }
    return false;
  }
  return user.permissions.includes(permission);
}
