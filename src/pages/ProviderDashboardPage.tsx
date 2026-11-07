import { BrandLogo } from '../components/BrandLogo';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BadgeCheck, Check, Circle, Clock3, ShieldAlert } from 'lucide-react';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { providerApi, type ProviderDashboardDto } from '../lib/api';
import { getAuthErrorMessage, useAuth } from '../auth/AuthContext';
import {
  Alert,
  Button,
  buttonClass,
  Container,
  PageHeading,
  ProgressBar,
  surfaceClass,
} from '../components/ui';

function ProgressRow({ label, done, detail }: { label: string; done: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] py-3 last:border-0">
      <div className="flex min-w-0 items-center gap-3">
        {done ? (
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
            <Check className="h-3.5 w-3.5" aria-hidden />
          </span>
        ) : (
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/15 text-zinc-500">
            <Circle className="h-3 w-3" aria-hidden />
          </span>
        )}
        <span className="truncate text-sm text-zinc-200">{label}</span>
      </div>
      <span className={`shrink-0 text-[13px] font-medium ${done ? 'text-emerald-300' : 'text-zinc-500'}`}>
        {detail || (done ? 'Complete' : 'Pending')}
      </span>
    </div>
  );
}

const ProviderDashboardInner: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<ProviderDashboardDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const role = user?.role || '';
    if (role !== 'massage_provider' && role !== 'provider') {
      setError('This area is for profile accounts. Create your profile to continue.');
      return;
    }
    providerApi
      .dashboard()
      .then(setData)
      .catch((err) => setError(getAuthErrorMessage(err)));
  }, [isAuthenticated, user?.role]);

  if (error) {
    return (
      <Container className="py-16">
        <div className="mx-auto max-w-md text-center">
          <Alert variant="info">{error}</Alert>
          <Link to="/provider/register" className={`${buttonClass()} mt-5`}>
            Become a massage provider
          </Link>
        </div>
      </Container>
    );
  }

  if (!data) {
    return (
      <Container className="py-16">
        <p className="text-center text-sm text-zinc-500">Loading profile verification…</p>
      </Container>
    );
  }

  const p = data.progress;
  const reviewLabel =
    data.verification.status === 'verified'
      ? 'Approved'
      : data.verification.status === 'rejected'
        ? 'Rejected'
        : data.verification.status === 'pending_review'
          ? 'Pending'
          : data.verification.status === 'changes_requested'
            ? 'Changes requested'
            : 'Not submitted';

  return (
    <Container className="max-w-3xl py-10 sm:py-12">
      <PageHeading
        eyebrow="My profile"
        title="Profile verification"
        description="Track each requirement and get your profile in front of clients."
      />

      {data.isVerified ? (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] p-5">
          <span title="Verified Profile" className="shrink-0 text-emerald-300">
            <BadgeCheck className="h-6 w-6" aria-label="Verified Profile" />
          </span>
          <div>
            <p className="font-semibold text-emerald-200">Your profile is verified.</p>
            <p className="mt-1 text-sm text-zinc-400">
              Visitors will see the green Verified Profile check beside your name.
            </p>
          </div>
        </div>
      ) : (
        <div className={`${surfaceClass('mt-6 p-5')}`}>
          <p className="font-medium text-zinc-100">
            Your profile is currently Unverified. Complete identity verification to receive a Verified badge after approval.
          </p>
          {data.verification.status === 'pending_review' ? (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2.5 text-sm text-amber-200">
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>Pending Verification — your documents are with the admin review team.</span>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Link to="/provider/workspace?tab=verification" className={buttonClass()}>
                Verify My Identity
              </Link>
              {data.verification.status === 'rejected' || data.verification.status === 'changes_requested' ? (
                <span className="inline-flex items-center gap-1.5 text-[12.5px] text-amber-300">
                  <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
                  {data.verification.status === 'changes_requested' ? 'Changes requested' : 'Resubmission available'}
                </span>
              ) : null}
            </div>
          )}
          {data.verification.verificationChoice === 'verify_later' ? (
            <p className="mt-2 text-sm text-zinc-500">
              You chose Verify Later. Your selfie is on file; add a government ID whenever you are ready.
            </p>
          ) : null}
          {data.verification.rejectionReason ? (
            <p className="mt-2 text-sm text-zinc-400">Reason: {data.verification.rejectionReason}</p>
          ) : null}
        </div>
      )}

      {data.profile && (
        <div className={surfaceClass('mt-4 p-5')}>
          <ProgressBar
            value={data.profile.profileCompletion ?? 0}
            label="Profile completion"
            showValue
          />
          <p className="mt-3 text-sm text-zinc-400">
            {data.profile.providerType === 'agency' ? 'Agency' : 'Individual'}
            {data.profile.businessName ? ` · ${data.profile.businessName}` : ''}
            {data.profile.gender ? ` · ${data.profile.gender}` : ''}
          </p>
        </div>
      )}

      <div className={surfaceClass('mt-4 p-5')}>
        <ProgressRow label="Account created" done={p.accountCreated} />
        <ProgressRow
          label="Email verified"
          done={p.emailVerified}
          detail={p.emailVerified ? 'Confirmed' : 'Pending'}
        />
        <ProgressRow
          label="Phone (contact only)"
          done={Boolean(p.phoneProvided)}
          detail={p.phoneProvided ? 'Added' : 'Not added'}
        />
        <ProgressRow label="Profile completed" done={p.profileCompleted} />
        <ProgressRow label="Identity submitted" done={p.identitySubmitted} />
        <ProgressRow
          label="Membership"
          done={Boolean(
            data.membership ? data.membership.free || p.membershipFeePaid : p.verificationFeePaid,
          )}
          detail={
            data.membership?.free
              ? 'Free'
              : p.membershipFeePaid
                ? 'Paid'
                : 'Fee required'
          }
        />
        <ProgressRow label="Admin review" done={data.isVerified} detail={reviewLabel} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => navigate('/provider/register')}>
          Continue onboarding
        </Button>
        <Link to="/explore/accra" className={buttonClass()}>
          View marketplace
        </Link>
      </div>
    </Container>
  );
};

export const ProviderDashboardPage: React.FC = () => (
  <ProtectedRoute>
    <div className="min-h-screen bg-brand-surface text-zinc-200">
      <header className="border-b border-white/[0.07]">
        <Container className="flex h-16 items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center" aria-label="Massager Studio home">
            <BrandLogo variant="plate" withWordmark markHeight={26} />
          </Link>
          <Link to="/" className="text-sm font-medium text-zinc-400 transition-colors hover:text-white">
            Home
          </Link>
        </Container>
      </header>
      <ProviderDashboardInner />
    </div>
  </ProtectedRoute>
);
