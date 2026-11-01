import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuthErrorMessage, useAuth } from '../auth/AuthContext';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Alert, Button, CheckboxField, TextField } from '../components/ui';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    termsAccepted: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const patch = (p: Partial<typeof form>) => setForm((f) => ({ ...f, ...p }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.termsAccepted) {
      setError('Please accept the terms to continue.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const result = await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        termsAccepted: true,
      });
      // Email verification is the registration gate; the phone is contact info only.
      navigate(result.verificationEmailSent ? '/verify-email?sent=1' : '/verify-email?sent=0', {
        replace: true,
      });
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      width="lg"
      title="Create your account"
      description="Account creation is simple. Your pathway preferences come next."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-gold-light hover:text-brand-gold">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? <Alert variant="error">{error}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="First name"
            name="firstName"
            autoComplete="given-name"
            required
            value={form.firstName}
            onChange={(e) => patch({ firstName: e.target.value })}
          />
          <TextField
            label="Last name"
            name="lastName"
            autoComplete="family-name"
            required
            value={form.lastName}
            onChange={(e) => patch({ lastName: e.target.value })}
          />
        </div>

        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(e) => patch({ email: e.target.value })}
        />

        <TextField
          label="Phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+233…"
          required
          value={form.phone}
          onChange={(e) => patch({ phone: e.target.value })}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            hint="At least 8 characters, with a letter and a number."
            value={form.password}
            onChange={(e) => patch({ password: e.target.value })}
          />
          <TextField
            label="Confirm password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={form.confirmPassword}
            onChange={(e) => patch({ confirmPassword: e.target.value })}
          />
        </div>

        <CheckboxField
          name="terms"
          checked={form.termsAccepted}
          onChange={(e) => patch({ termsAccepted: e.target.checked })}
          label="I accept the Massager Studio terms and privacy policy."
        />

        <Button type="submit" fullWidth loading={loading} loadingLabel="Creating account">
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
};
