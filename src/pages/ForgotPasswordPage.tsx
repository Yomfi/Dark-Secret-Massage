import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../lib/api';
import { getAuthErrorMessage } from '../auth/AuthContext';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Alert, Button, TextField } from '../components/ui';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const data = await authApi.forgotPassword(email.trim());
      setMessage(data.message);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot password"
      description="Enter your email and we'll send reset instructions if an account exists."
      footer={
        <Link to="/login" className="inline-flex min-h-11 items-center font-semibold text-brand-purple-light hover:text-brand-purple">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? <Alert variant="error">{error}</Alert> : null}
        {message ? <Alert variant="success">{message}</Alert> : null}

        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Button type="submit" fullWidth loading={loading} loadingLabel="Sending">
          Send reset link
        </Button>
      </form>
    </AuthLayout>
  );
};
