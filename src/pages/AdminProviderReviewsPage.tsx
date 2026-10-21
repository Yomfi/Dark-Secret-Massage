import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { adminProviderApi } from '../lib/api';
import { getAuthErrorMessage, useAuth } from '../auth/AuthContext';

type Row = {
  providerUserId: string;
  displayName: string;
  email: string;
  phone: string;
  city?: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  identityStatus: string;
  paymentStatus: string;
  verificationStatus: string;
  submittedAt?: string;
  adminNotes?: string | null;
};

const Inner: React.FC = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () =>
    adminProviderApi
      .list()
      .then((res) => setRows(res.providers as unknown as Row[]))
      .catch((err) => setError(getAuthErrorMessage(err)));

  useEffect(() => {
    const role = user?.role || '';
    if (!['admin', 'moderator', 'support_admin'].includes(role)) {
      setError('Admin access required.');
      return;
    }
    load();
  }, [user?.role]);

  const act = async (providerUserId: string, action: 'approve' | 'reject' | 'request_changes') => {
    setBusy(providerUserId + action);
    setError(null);
    try {
      await adminProviderApi.review({
        providerUserId,
        action,
        notes: action === 'approve' ? 'Approved after review' : undefined,
        rejectionReason: action === 'reject' ? 'Did not meet verification requirements' : undefined,
      });
      await load();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  if (error && rows.length === 0) {
    return <p className="px-4 py-16 text-center text-zinc-400">{error}</p>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-4">
      <h1 className="text-2xl font-bold text-white">Profile Verification</h1>
      {error && <p className="text-sm text-rose-300">{error}</p>}
      {rows.length === 0 ? (
        <p className="text-zinc-500 text-sm">No provider verification records yet. Run the SQL migration and register a provider.</p>
      ) : (
        rows.map((row) => (
          <article key={row.providerUserId} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">{row.displayName}</h2>
                <p className="text-xs text-zinc-500 mt-1">
                  {row.city || '—'} · {row.email} · {row.phone}
                </p>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-purple-200 border border-purple-400/30 px-2 py-1 rounded-full">
                {row.verificationStatus}
              </span>
            </div>
            <dl className="grid sm:grid-cols-2 gap-2 text-xs text-zinc-400">
              <div>Phone verified: {row.phoneVerified ? 'Yes' : 'No'}</div>
              <div>Email verified: {row.emailVerified ? 'Yes' : 'No'}</div>
              <div>Identity: {row.identityStatus}</div>
              <div>Payment: {row.paymentStatus}</div>
              <div>Submitted: {row.submittedAt || '—'}</div>
            </dl>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={!!busy}
                onClick={() => act(row.providerUserId, 'approve')}
                className="px-4 py-2 rounded-full bg-emerald-600 text-[11px] uppercase tracking-widest text-white"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={!!busy}
                onClick={() => act(row.providerUserId, 'reject')}
                className="px-4 py-2 rounded-full border border-rose-400/40 text-[11px] uppercase tracking-widest text-rose-200"
              >
                Reject
              </button>
              <button
                type="button"
                disabled={!!busy}
                onClick={() => act(row.providerUserId, 'request_changes')}
                className="px-4 py-2 rounded-full border border-white/15 text-[11px] uppercase tracking-widest text-zinc-200"
              >
                Request changes
              </button>
            </div>
          </article>
        ))
      )}
    </div>
  );
};

export const AdminProviderReviewsPage: React.FC = () => (
  <ProtectedRoute>
    <div className="min-h-screen bg-[#060608] text-[#e4e4e9]">
      <header className="border-b border-white/[0.06] px-4 h-14 flex items-center justify-between">
        <Link to="/" className="text-sm font-bold tracking-[0.28em] uppercase text-white">
          Dark Secret Admin
        </Link>
      </header>
      <Inner />
    </div>
  </ProtectedRoute>
);
