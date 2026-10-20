import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getAuthErrorMessage, useAuth } from '../auth/AuthContext';

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
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-purple-300">Welcome back</p>
            <h1 className="mt-2 text-3xl font-bold text-white tracking-tight">Sign in</h1>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200 font-medium">
              {error}
            </div>
          )}

          <label className="block">
            <span className="block text-sm font-semibold text-zinc-200 mb-1.5">Email or phone</span>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white focus:outline-none focus:border-purple-500"
              autoComplete="username"
            />
          </label>

          <label className="block">
            <span className="block text-sm font-semibold text-zinc-200 mb-1.5">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white focus:outline-none focus:border-purple-500"
              autoComplete="current-password"
            />
          </label>

          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm font-medium text-purple-300 hover:text-purple-200">
              Forgot password
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-purple-600 py-3.5 text-sm font-semibold uppercase tracking-wider text-white hover:bg-purple-500 disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="text-sm text-zinc-400 text-center font-normal">
            New here?{' '}
            <Link to="/register" className="text-purple-300 hover:text-purple-200 font-semibold">
              Create account
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
};
