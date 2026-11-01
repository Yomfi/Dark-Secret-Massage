import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { authApi } from '../lib/api';
import { getAuthErrorMessage } from '../auth/AuthContext';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Alert, Button, TextField } from '../components/ui';

export const ResetPasswordPage: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Reset password — Massager Studio';
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must include a letter and a number.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ token, password, confirmPassword });
      setDone(true);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout
        title="Choose a new password"
        description="This reset link is missing its token. Request a new password reset email to continue."
        footer={
          <Link to="/forgot-password" className="inline-flex min-h-11 items-center font-semibold text-brand-gold-light hover:text-brand-gold">
            Request a new link
          </Link>
        }
      >
        <Alert variant="warning">
          Reset links work once and expire after an hour.
        </Alert>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout
        title="Password updated"
        description="You can now sign in with your new password."
        footer={
          <Link to="/login" className="inline-flex min-h-11 items-center font-semibold text-brand-gold-light hover:text-brand-gold">
            Back to sign in
          </Link>
        }
      >
        <Button
          fullWidth
          onClick={() => {
            window.location.href = '/login';
          }}
        >
          Sign in
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Choose a new password"
      description="Enter a new password for your account. Reset links work once and expire after an hour."
      footer={
        <Link to="/login" className="inline-flex min-h-11 items-center font-semibold text-brand-gold-light hover:text-brand-gold">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? <Alert variant="error">{error}</Alert> : null}

        <TextField
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          hint="At least 8 characters, with a letter and a number."
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

        <Button type="submit" fullWidth loading={loading} loadingLabel="Updating">
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
};
