import { BrandLogo } from '../components/BrandLogo';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { adminProviderApi } from '../lib/api';
import { getAuthErrorMessage, useAuth } from '../auth/AuthContext';
import { Alert, Badge, Button, Container, PageHeading, surfaceClass } from '../components/ui';

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
    return (
      <Container className="py-16">
        <p className="text-center text-sm text-zinc-400">{error}</p>
      </Container>
    );
  }

  return (
    <Container className="max-w-4xl space-y-4 py-10 sm:py-12">
      <PageHeading
        eyebrow="Admin"
        title="Profile verification"
        description="Review provider submissions and approve, reject or request changes."
      />
      {error && <Alert variant="error">{error}</Alert>}
      {rows.length === 0 ? (
        <div className={surfaceClass('p-5')}>
          <p className="text-sm text-zinc-400">
            No provider verification records yet. Run the SQL migration and register a provider.
          </p>
        </div>
      ) : (
        rows.map((row) => (
          <article key={row.providerUserId} className={surfaceClass('space-y-3 p-5')}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-white">{row.displayName}</h2>
                <p className="mt-1 break-words text-[13px] text-zinc-500">
                  {row.city || '—'} · {row.email} · {row.phone}
                </p>
              </div>
              <Badge tone="gold">{row.verificationStatus}</Badge>
            </div>
            <dl className="grid gap-2 text-[13px] text-zinc-400 sm:grid-cols-2">
              <div>Email verified: {row.emailVerified ? 'Yes' : 'No'}</div>
              <div>Phone: {row.phone} (contact only)</div>
              <div>Identity: {row.identityStatus}</div>
              <div>Membership: {row.membershipFree ? 'Free' : row.paymentStatus}</div>
              <div>Submitted: {row.submittedAt || '—'}</div>
            </dl>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                disabled={!!busy}
                onClick={() => act(row.providerUserId, 'approve')}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={!!busy}
                onClick={() => act(row.providerUserId, 'reject')}
              >
                Reject
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={!!busy}
                onClick={() => act(row.providerUserId, 'request_changes')}
              >
                Request changes
              </Button>
            </div>
          </article>
        ))
      )}
    </Container>
  );
};

export const AdminProviderReviewsPage: React.FC = () => (
  <ProtectedRoute>
    <div className="min-h-screen bg-brand-surface text-zinc-200">
      <header className="border-b border-white/[0.07]">
        <Container className="flex h-16 items-center justify-between gap-3">
          <Link to="/" className="inline-flex min-w-0 items-center gap-2.5" aria-label="Massager Studio home">
            <BrandLogo variant="plate" markHeight={24} />
            <span className="truncate text-[13px] font-semibold text-zinc-300">Admin</span>
          </Link>
        </Container>
      </header>
      <Inner />
    </div>
  </ProtectedRoute>
);
