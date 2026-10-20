import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../lib/api';
import { getAuthErrorMessage } from '../auth/AuthContext';

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
    <div className="min-h-screen bg-[#060608] text-[#e4e4e9] flex flex-col">
      <header className="border-b border-white/[0.06] px-4 h-14 flex items-center">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-sm font-bold tracking-[0.28em] uppercase text-white">Dark Secret</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-[#0a0a10] p-6 sm:p-8 space-y-5"
        >
          <h1 className="text-3xl font-bold text-white tracking-tight">Forgot password</h1>
          <p className="text-base text-zinc-400 font-normal">
            Enter your email and we&apos;ll send reset instructions if an account exists.
          </p>
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
              {message}
            </div>
          )}
          <label className="block">
            <span className="block text-sm font-semibold text-zinc-200 mb-1.5">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white focus:outline-none focus:border-purple-500"
              required
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-purple-600 py-3.5 text-sm font-semibold uppercase tracking-wider text-white disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
          <Link to="/login" className="block text-center text-sm text-purple-300 font-semibold">
            Back to sign in
          </Link>
        </form>
      </main>
    </div>
  );
};
