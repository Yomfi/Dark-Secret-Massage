import { BrandLogo } from '../components/BrandLogo';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../lib/api';
import { getAuthErrorMessage } from '../auth/AuthContext';

type State = 'missing' | 'pending' | 'verified' | 'failed';

export const VerifyEmailPage: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState<State>(token ? 'pending' : 'missing');
  const [error, setError] = useState<string | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    document.title = 'Confirm email — Massager Studio';
  }, []);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;

    authApi
      .verifyEmail(token)
      .then(() => setState('verified'))
      .catch((err) => {
        setError(getAuthErrorMessage(err));
        setState('failed');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-[#060608] text-[#e4e4e9] flex flex-col">
      <header className="border-b border-white/[0.06] px-4 h-14 flex items-center">
        <Link to="/" className="inline-flex items-center" aria-label="Massager Studio home">
          <BrandLogo variant="plate" withWordmark markHeight={26} />
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-[#0a0a10] p-6 sm:p-8 space-y-4 text-center">
          {state === 'pending' && (
            <>
              <h1 className="text-2xl font-bold text-white tracking-tight">Confirming your email…</h1>
              <p className="text-base text-zinc-400">This only takes a moment.</p>
            </>
          )}

          {state === 'verified' && (
            <>
              <h1 className="text-2xl font-bold text-white tracking-tight">Email confirmed</h1>
              <p className="text-base text-zinc-400">
                Your Massager Studio email address is verified. You can continue where you left off.
              </p>
              <Link
                to="/login"
                className="block w-full rounded-full bg-brand-gold py-3.5 text-sm font-semibold uppercase tracking-wider text-brand-ink hover:bg-brand-gold-light"
              >
                Sign in
              </Link>
            </>
          )}

          {state === 'failed' && (
            <>
              <h1 className="text-2xl font-bold text-white tracking-tight">Link could not be used</h1>
              <p className="text-base text-zinc-400">
                {error || 'This confirmation link is invalid or has expired.'}
              </p>
              <p className="text-sm text-zinc-500">
                Sign in and request a new confirmation email from your profile if you still need one.
              </p>
              <Link to="/login" className="block text-sm text-brand-gold-light font-semibold">
                Back to sign in
              </Link>
            </>
          )}

          {state === 'missing' && (
            <>
              <h1 className="text-2xl font-bold text-white tracking-tight">Confirmation link incomplete</h1>
              <p className="text-base text-zinc-400">
                This page needs the token from your verification email.
              </p>
              <Link to="/login" className="block text-sm text-brand-gold-light font-semibold">
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
};
