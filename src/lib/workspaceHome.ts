import type { AuthUserDto } from './api';

/** Post-login home path for the signed-in account. */
export function workspaceHomeForUser(user: AuthUserDto | null | undefined): string {
  if (!user) return '/login';
  if (user.isStaff || ['admin', 'moderator', 'support_admin'].includes(user.role)) {
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
