import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BadgeCheck, Check, Circle } from 'lucide-react';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { providerApi, type ProviderDashboardDto } from '../lib/api';
import { getAuthErrorMessage, useAuth } from '../auth/AuthContext';

function ProgressRow({ label, done, detail }: { label: string; done: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-white/[0.06] last:border-0">
      <div className="flex items-center gap-3">
        {done ? (
          <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
            <Check className="w-3.5 h-3.5" />
          </span>
        ) : (
          <span className="inline-flex w-6 h-6 items-center justify-center rounded-full border border-white/15 text-zinc-500">
            <Circle className="w-3 h-3" />
          </span>
        )}
        <span className="text-sm text-zinc-200">{label}</span>
      </div>
      <span className={`text-xs uppercase tracking-widest ${done ? 'text-emerald-400' : 'text-zinc-500'}`}>
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
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-300">{error}</p>
        <Link to="/provider/register" className="mt-4 inline-block text-purple-300 text-sm uppercase tracking-widest">
          Create Your Profile →
        </Link>
      </div>
    );
  }

  if (!data) {
    return <div className="px-4 py-16 text-center text-zinc-500">Loading profile verification…</div>;
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
    <div className="max-w-2xl mx-auto px-4 py-10">
      <p className="text-xs uppercase tracking-[0.28em] text-purple-300">My Profile</p>
      <h1 className="mt-2 text-3xl font-bold text-white tracking-tight">Profile Verification</h1>

      {data.isVerified ? (
        <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 flex items-start gap-3">
          <span title="Verified Profile" className="shrink-0 text-emerald-400">
            <BadgeCheck className="w-6 h-6" aria-label="Verified Profile" />
          </span>
          <div>
            <p className="text-emerald-300 font-semibold">Your profile is verified.</p>
            <p className="mt-1 text-sm text-zinc-400">
              Visitors will see the green Verified Profile check beside your name.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-zinc-200 font-medium">Complete verification to receive the Dark Secret verified badge.</p>
          <p className="mt-1 text-sm text-zinc-500">
            Status: <span className="text-zinc-300">{data.verification.status}</span>
            {data.verification.rejectionReason
              ? ` — ${data.verification.rejectionReason}`
              : ''}
          </p>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-white/10 bg-[#0a0a10] p-5">
        <ProgressRow label="Account Created" done={p.accountCreated} />
        <ProgressRow label="Phone Verified" done={p.phoneVerified} />
        <ProgressRow label="Email Verified" done={p.emailVerified} />
        <ProgressRow label="Profile Completed" done={p.profileCompleted} />
        <ProgressRow label="Identity Submitted" done={p.identitySubmitted} />
        <ProgressRow
          label="Verification Fee"
          done={p.verificationFeePaid}
          detail={p.verificationFeePaid ? 'Paid' : 'Unpaid'}
        />
        <ProgressRow label="Admin Review" done={data.isVerified} detail={reviewLabel} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => navigate('/provider/register')}
          className="px-5 py-2.5 rounded-full border border-white/15 text-xs uppercase tracking-widest text-zinc-200"
        >
          Continue onboarding
        </button>
        <Link
          to="/explore/accra"
          className="px-5 py-2.5 rounded-full bg-purple-600 text-xs uppercase tracking-widest text-white"
        >
          View marketplace
        </Link>
      </div>
    </div>
  );
};

export const ProviderDashboardPage: React.FC = () => (
  <ProtectedRoute>
    <div className="min-h-screen bg-[#060608] text-[#e4e4e9]">
      <header className="border-b border-white/[0.06] px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-sm font-bold tracking-[0.28em] uppercase text-white">Dark Secret</span>
        </Link>
        <Link to="/" className="text-xs uppercase tracking-widest text-zinc-400 hover:text-white">
          Home
        </Link>
      </header>
      <ProviderDashboardInner />
    </div>
  </ProtectedRoute>
);
