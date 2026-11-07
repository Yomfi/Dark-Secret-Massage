import React, { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { getAuthErrorMessage, useAuth } from '../auth/AuthContext';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Alert, Button, TextField } from '../components/ui';
import { isStaffUser, safeAdminRedirect, workspaceHomeForUser } from '../lib/workspaceHome';

/**
 * Dedicated staff/admin sign-in. Always renders for unauthenticated visitors at
 * `/admin/login` — never redirects them to the public homepage.
 * Customer/provider sessions are not promoted; they see a denial instead of CMS.
 */
export const AdminLoginPage: React.FC = () => {
  const { user, isAuthenticated, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = safeAdminRedirect(params.get('redirect'));

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-surface text-zinc-400">
        <p className="text-sm font-medium tracking-wide uppercase">Checking session…</p>
      </div>
    );
  }

  if (isAuthenticated && isStaffUser(user)) {
    return <Navigate to={redirect} replace />;
  }

  if (isAuthenticated && user && !isStaffUser(user)) {
    return (
      <AuthLayout
        title="Staff access only"
        description="This area is for Massager Studio staff. Your customer or provider account cannot open the admin workspace."
        footer={
          <Link
            to={workspaceHomeForUser(user)}
            className="font-semibold text-brand-purple-light hover:text-brand-purple"
          >
            Go to your account
          </Link>
        }
      >
        <Alert variant="error">
          Access denied. No staff privileges were granted to this account.
        </Alert>
      </AuthLayout>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDenied(false);
    if (!identifier.trim() || !password) {
      setError('Enter your staff email and password.');
      return;
    }
    setLoading(true);
    try {
      const signedIn = await login(identifier.trim(), password);
      if (!isStaffUser(signedIn)) {
        setDenied(true);
        setError('This sign-in is for Massager Studio staff only. Your account was not given admin access.');
        return;
      }
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Staff sign in"
      description="Sign in with your Massager Studio staff account to open the admin workspace."
      footer={
        <>
          Looking for a customer or provider account?{' '}
          <Link to="/login" className="font-semibold text-brand-purple-light hover:text-brand-purple">
            Use the public sign-in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? <Alert variant="error">{error}</Alert> : null}

        <TextField
          label="Staff email"
          name="identifier"
          type="email"
          autoComplete="username"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />

        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button type="submit" fullWidth loading={loading} loadingLabel="Signing in">
          Sign in to admin
        </Button>
      </form>
    </AuthLayout>
  );
};
