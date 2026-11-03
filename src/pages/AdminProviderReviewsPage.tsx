import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { adminProviderApi } from '../lib/api';
import { getAuthErrorMessage, useAuth } from '../auth/AuthContext';
import {
  AdminCard,
  AdminPageHeader,
  EmptyState,
  StatusBadge,
  adminBtnClass,
  adminBtnGhostClass,
} from '../components/admin';

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
  membershipFree?: boolean;
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
    if (!['admin', 'moderator', 'support_admin'].includes(role) && !user?.isStaff) {
      setError('Admin access required.');
      return;
    }
    load();
  }, [user?.role, user?.isStaff]);

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

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <AdminPageHeader
        breadcrumbs={['Admin', 'People', 'Provider reviews']}
        title="Provider Review Queue"
        subtitle="Review provider submissions and approve, reject or request changes."
        actions={
          <Link to="/admin" className={adminBtnGhostClass}>
            Back to overview
          </Link>
        }
      />
      {error ? (
        <div role="alert" className="mb-4 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
          {error}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <AdminCard>
          <EmptyState
            icon={Inbox}
            title="No more providers in queue"
            description="New submissions will appear here after a provider requests review."
          />
        </AdminCard>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <AdminCard key={row.providerUserId}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-[24px] font-semibold text-[#161616]">{row.displayName}</h2>
                  <p className="mt-1 break-words text-[13px] text-[#6f675c]">
                    {row.city || '—'} · {row.email} · {row.phone}
                  </p>
                </div>
                <StatusBadge status={row.verificationStatus} />
              </div>
              <dl className="mt-4 grid gap-2 text-[13px] text-[#6f675c] sm:grid-cols-2">
                <div>Email verified: {row.emailVerified ? 'Yes' : 'No'}</div>
                <div>Phone: {row.phone} (contact only)</div>
                <div>Identity: {row.identityStatus}</div>
                <div>Membership: {row.membershipFree ? 'Free' : row.paymentStatus}</div>
                <div>Submitted: {row.submittedAt || '—'}</div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className={adminBtnClass} disabled={!!busy} onClick={() => act(row.providerUserId, 'approve')}>
                  Approve
                </button>
                <button type="button" className={adminBtnGhostClass} disabled={!!busy} onClick={() => act(row.providerUserId, 'reject')}>
                  Reject
                </button>
                <button type="button" className={adminBtnGhostClass} disabled={!!busy} onClick={() => act(row.providerUserId, 'request_changes')}>
                  Request changes
                </button>
              </div>
            </AdminCard>
          ))}
        </div>
      )}
    </div>
  );
};

export const AdminProviderReviewsPage: React.FC = () => (
  <div className="ms-admin min-h-screen bg-[#FAF7F2] text-[#161616]">
    <header className="border-b border-[#e8e0d2] bg-[#FAF7F2]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link to="/admin" className="inline-flex min-w-0 items-center gap-2.5" aria-label="Admin workspace">
          <BrandLogo variant="default" withWordmark markHeight={24} />
        </Link>
        <Link to="/admin" className="text-[13px] font-semibold text-[#8F6D35] hover:underline">
          Admin workspace
        </Link>
      </div>
    </header>
    <Inner />
  </div>
);

export default AdminProviderReviewsPage;
