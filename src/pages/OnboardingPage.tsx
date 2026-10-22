import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Search, UserRound } from 'lucide-react';
import { getAuthErrorMessage, useAuth } from '../auth/AuthContext';
import type { OnboardingChoice } from '../lib/api';

const OPTIONS: {
  choice: OnboardingChoice;
  title: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
}[] = [
  {
    choice: 'book_massage',
    title: 'Search for a Masseuse',
    detail: 'Find massage professionals available near you.',
    icon: Search,
    to: '/explore',
  },
  {
    choice: 'become_provider',
    title: 'Become a Massage Provider',
    detail: 'Create a public profile and offer your massage services.',
    icon: UserRound,
    to: '/provider/register',
  },
];

export const OnboardingPage: React.FC = () => {
  const { isAuthenticated, isLoading, setOnboardingChoice } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loadingChoice, setLoadingChoice] = useState<OnboardingChoice | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#060608] flex items-center justify-center text-zinc-400">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login?redirect=/onboarding" replace />;
  }

  const select = async (choice: OnboardingChoice, to: string) => {
    setError(null);
    setLoadingChoice(choice);
    try {
      await setOnboardingChoice(choice);
      navigate(to);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoadingChoice(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#060608] text-[#e4e4e9]">
      <header className="border-b border-white/[0.06] px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-sm font-bold tracking-[0.28em] uppercase text-white">Dark Secret</span>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-purple-300">Get started</p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-bold text-white tracking-tight">
          What would you like to do?
        </h1>
        <p className="mt-3 text-base sm:text-lg text-zinc-300 font-normal leading-relaxed">
          Choose how you would like to continue.
        </p>

        {error && (
          <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-4">
          {OPTIONS.map(({ choice, title, detail, icon: Icon, to }) => (
            <button
              key={choice}
              type="button"
              disabled={Boolean(loadingChoice)}
              onClick={() => select(choice, to)}
              className="text-left rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6 hover:border-purple-500/40 transition-all cursor-pointer disabled:opacity-60"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-purple-400/20 bg-purple-500/10 text-purple-300">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-white uppercase tracking-wide">
                    {title}
                  </h2>
                  <p className="mt-1 text-base text-zinc-400 font-normal">{detail}</p>
                  {loadingChoice === choice && (
                    <p className="mt-2 text-sm text-purple-300">Saving preference…</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};
