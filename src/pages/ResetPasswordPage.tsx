import { BrandLogo } from '../components/BrandLogo';
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../lib/api';
import { getAuthErrorMessage } from '../auth/AuthContext';

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

  return (
    <div className="min-h-screen bg-[#060608] text-[#e4e4e9] flex flex-col">
      <header className="border-b border-white/[0.06] px-4 h-14 flex items-center">
        <Link to="/" className="inline-flex items-center" aria-label="Massager Studio home">
          <BrandLogo variant="plate" withWordmark markHeight={26} />
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-[#0a0a10] p-6 sm:p-8 space-y-5">
          <h1 className="text-3xl font-bold text-white tracking-tight">Choose a new password</h1>

          {!token && (
            <>
              <p className="text-base text-zinc-400">
                This reset link is missing its token. Request a new password reset email to continue.
              </p>
              <Link to="/forgot-password" className="block text-center text-sm text-brand-gold-light font-semibold">
                Request a new link
              </Link>
            </>
          )}

          {token && done && (
            <>
              <p className="text-base text-zinc-300">
                Your password has been updated. You can now sign in with your new password.
              </p>
              <Link
                to="/login"
                className="block w-full rounded-full bg-brand-gold py-3.5 text-center text-sm font-semibold uppercase tracking-wider text-brand-ink hover:bg-brand-gold-light"
              >
                Sign in
              </Link>
            </>
          )}

          {token && !done && (
            <form onSubmit={onSubmit} className="space-y-4">
              <p className="text-base text-zinc-400 font-normal">
                Enter a new password for your account. Reset links work once and expire after an hour.
              </p>

              {error && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              )}

              <label className="block">
                <span className="block text-sm font-semibold text-zinc-200 mb-1.5">New password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white focus:outline-none focus:border-brand-gold"
                />
              </label>

              <label className="block">
                <span className="block text-sm font-semibold text-zinc-200 mb-1.5">Confirm password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white focus:outline-none focus:border-brand-gold"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-brand-gold py-3.5 text-sm font-semibold uppercase tracking-wider text-brand-ink hover:bg-brand-gold-light disabled:opacity-60 cursor-pointer"
              >
                {loading ? 'Updating…' : 'Update password'}
              </button>

              <Link to="/login" className="block text-center text-sm text-brand-gold-light font-semibold">
                Back to sign in
              </Link>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};
