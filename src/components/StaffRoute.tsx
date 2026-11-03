import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { workspaceHomeForUser } from '../lib/workspaceHome';

/** Guards admin/staff CMS routes. Session required; staff role required. */
export const StaffRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f3ea] text-[#6b6252]">
        <p className="text-sm font-medium tracking-wide uppercase">Checking session…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  const isStaff =
    Boolean(user?.isStaff) ||
    ['admin', 'moderator', 'support_admin'].includes(user?.role ?? '');

  if (!isStaff) {
    return <Navigate to={workspaceHomeForUser(user)} replace />;
  }

  return <>{children}</>;
};
