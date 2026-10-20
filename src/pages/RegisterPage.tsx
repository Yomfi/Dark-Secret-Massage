import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuthErrorMessage, useAuth } from '../auth/AuthContext';

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
      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        termsAccepted: true,
      });
      navigate('/onboarding', { replace: true });
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060608] text-[#e4e4e9] flex flex-col">
      <header className="border-b border-white/[0.06] px-4 h-14 flex items-center">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-sm font-bold tracking-[0.28em] uppercase text-white">Dark Secret</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-lg rounded-3xl border border-white/[0.08] bg-[#0a0a10] p-6 sm:p-8 space-y-4"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-purple-300">Create account</p>
            <h1 className="mt-2 text-3xl font-bold text-white tracking-tight">Join Dark Secret</h1>
            <p className="mt-2 text-base text-zinc-400 font-normal">
              Account creation is simple. Pathway preferences come next.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200 font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="First name" value={form.firstName} onChange={(v) => patch({ firstName: v })} />
            <Field label="Last name" value={form.lastName} onChange={(v) => patch({ lastName: v })} />
          </div>
          <Field label="Email" type="email" value={form.email} onChange={(v) => patch({ email: v })} />
          <Field label="Phone" value={form.phone} onChange={(v) => patch({ phone: v })} placeholder="+233…" />
          <Field
            label="Password"
            type="password"
            value={form.password}
            onChange={(v) => patch({ password: v })}
          />
          <Field
            label="Confirm password"
            type="password"
            value={form.confirmPassword}
            onChange={(v) => patch({ confirmPassword: v })}
          />

          <label className="flex items-start gap-3 text-sm text-zinc-300 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={form.termsAccepted}
              onChange={(e) => patch({ termsAccepted: e.target.checked })}
              className="mt-1 accent-purple-500"
            />
            <span>I accept the Dark Secret terms and privacy policy.</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-purple-600 py-3.5 text-sm font-semibold uppercase tracking-wider text-white hover:bg-purple-500 disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>

          <p className="text-sm text-zinc-400 text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-purple-300 font-semibold hover:text-purple-200">
              Sign in
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
};

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-zinc-200 mb-1.5">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white focus:outline-none focus:border-purple-500"
      />
    </label>
  );
}
