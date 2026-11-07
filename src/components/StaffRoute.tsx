import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { isStaffUser, workspaceHomeForUser } from '../lib/workspaceHome';

/** Guards admin/staff CMS routes. Unauthenticated → /admin/login; non-staff → their workspace. */
export const StaffRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f2ff] text-[#675f73]">
        <p className="text-sm font-medium tracking-wide uppercase">Checking session…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirect = `${location.pathname}${location.search}`;
    return (
      <Navigate to={`/admin/login?redirect=${encodeURIComponent(redirect)}`} replace />
    );
  }

  if (!isStaffUser(user)) {
    // Deny CMS access without promoting the account.
    return <Navigate to={workspaceHomeForUser(user)} replace />;
  }

  return <>{children}</>;
};
