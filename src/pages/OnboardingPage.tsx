import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Search, UserRound } from 'lucide-react';
import { getAuthErrorMessage, useAuth } from '../auth/AuthContext';
import { ApiError, type OnboardingChoice } from '../lib/api';
import { BrandLogo } from '../components/BrandLogo';
import { Container } from '../components/ui/Layout';
import { Alert, SelectableCard } from '../components/ui';

const OPTIONS: {
  choice: OnboardingChoice;
  title: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
}[] = [
  {
    choice: 'book_massage',
    title: 'Find a massage professional',
    detail: 'Browse vetted providers by city and book a session.',
    icon: Search,
    to: '/explore',
  },
  {
    choice: 'become_provider',
    title: 'Offer massage services',
    detail: 'Create a public profile and list the services you provide.',
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
      <div className="flex min-h-screen items-center justify-center bg-brand-surface text-zinc-400">
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
      // The API is the source of truth: unconfirmed email cannot progress.
      if (err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') {
        navigate('/verify-email?sent=0', { replace: true });
        return;
      }
      setError(getAuthErrorMessage(err));
    } finally {
      setLoadingChoice(null);
    }
  };

  return (
    <div className="min-h-screen bg-brand-surface text-zinc-200">
      <header className="border-b border-white/[0.07]">
        <Container className="flex h-16 items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center" aria-label="Massager Studio home">
            <BrandLogo variant="plate" withWordmark markHeight={26} />
          </Link>
        </Container>
      </header>

      <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:py-16">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-purple-light">
          Get started
        </p>
        <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-white sm:text-3xl">
          What would you like to do?
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-zinc-400">
          Choose how you would like to continue.
        </p>

        {error ? (
          <Alert variant="error" className="mt-6">
            {error}
          </Alert>
        ) : null}

        <div role="radiogroup" aria-label="Choose a pathway" className="mt-6 grid gap-3">
          {OPTIONS.map(({ choice, title, detail, icon: Icon, to }) => (
            <SelectableCard
              key={choice}
              selected={loadingChoice === choice}
              disabled={Boolean(loadingChoice)}
              onClick={() => select(choice, to)}
              title={title}
              description={loadingChoice === choice ? 'Saving preference…' : detail}
              icon={<Icon className="h-5 w-5" />}
            />
          ))}
        </div>
      </main>
    </div>
  );
};
