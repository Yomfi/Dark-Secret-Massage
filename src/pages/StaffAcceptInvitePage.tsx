import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { getAuthErrorMessage, useAuth } from '../auth/AuthContext';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Alert, Button, TextField } from '../components/ui';

export const StaffAcceptInvitePage: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const { refreshSession } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Accept staff invite — Massager Studio';
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 10) {
      setError('Password must be at least 10 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await apiRequest<{ accepted: boolean }>('/auth/accept-staff-invite.php', {
        method: 'POST',
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      await refreshSession();
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout
        title="Staff invitation"
        description="This invite link is missing its token. Ask an administrator to send a fresh invitation."
        footer={
          <Link to="/login" className="inline-flex min-h-11 items-center font-semibold text-brand-purple-light hover:text-brand-purple">
            Back to sign in
          </Link>
        }
      >
        <Alert variant="warning">Invitation links expire after 72 hours and can only be used once.</Alert>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Join the team"
      description="Set a password to activate your Massager Studio staff account."
      footer={
        <Link to="/login" className="inline-flex min-h-11 items-center font-semibold text-brand-purple-light hover:text-brand-purple">
          Already activated? Sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? <Alert variant="error">{error}</Alert> : null}

        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          hint="At least 10 characters."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <TextField
          label="Confirm password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <Button type="submit" fullWidth loading={loading} loadingLabel="Activating">
          Activate account
        </Button>
      </form>
    </AuthLayout>
  );
};

export default StaffAcceptInvitePage;
