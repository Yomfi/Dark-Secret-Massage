import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getAuthErrorMessage, useAuth } from '../auth/AuthContext';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Alert, Button, TextField } from '../components/ui';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect') || '/onboarding';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim() || !password) {
      setError('Enter your email/phone and password.');
      return;
    }
    setLoading(true);
    try {
      const user = await login(identifier.trim(), password);
      if (!user.onboardingChoice && redirect === '/onboarding') {
        navigate('/onboarding', { replace: true });
      } else {
        navigate(redirect, { replace: true });
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in"
      description="Welcome back. Use the email or phone number on your account."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-semibold text-brand-gold-light hover:text-brand-gold">
            Create account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? <Alert variant="error">{error}</Alert> : null}

        <TextField
          label="Email or phone"
          name="identifier"
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

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="inline-flex min-h-11 items-center text-[13px] font-medium text-brand-gold-light hover:text-brand-gold"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" fullWidth loading={loading} loadingLabel="Signing in">
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
};
