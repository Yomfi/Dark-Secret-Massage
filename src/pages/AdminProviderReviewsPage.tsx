import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, History, Inbox, RotateCcw } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { apiRequest } from '../lib/api';
import { getAuthErrorMessage, useAuth } from '../auth/AuthContext';
import { userHasPermission } from '../lib/workspaceHome';
import { formatScheduledDate } from '../lib/dates';
import {
  AdminCard,
  AdminPageHeader,
  EmptyState,
  SearchInput,
  StatusBadge,
  adminBtnClass,
  adminBtnGhostClass,
  adminInputClass,
  FormField,
} from '../components/admin';

type Row = {
  providerUserId: string;
  displayName: string;
  email: string;
  phone: string;
  city?: string;
  providerType?: string;
  accountStatus?: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  identityStatus: string;
  paymentStatus: string;
  membershipFree?: boolean;
  verificationStatus: string;
  verificationChoice?: string | null;
  businessStatus?: string | null;
  hasIdDocument?: boolean;
  hasSelfie?: boolean;
  latestDocumentId?: string | null;
  reviewHistory?: Array<{
    action: string;
    createdAt: string | null;
    actorUserId: string | null;
    from: string | null;
    to: string | null;
    reason: string | null;
    notes: string | null;
    choice: string | null;
  }>;
  canDecide: boolean;
  canReopen: boolean;
  submittedAt?: string | null;
  decidedAt?: string | null;
  decidedBy?: string | null;
  adminNotes?: string | null;
  rejectionReason?: string | null;
};

type Decision = 'approve' | 'reject' | 'request_changes' | 'reopen';

const DECISION_COPY: Record<Decision, { title: string; confirm: string; reasonLabel: string; reasonRequired: boolean; help: string }> = {
  approve: {
    title: 'Approve provider',
    confirm: 'Approve application',
    reasonLabel: 'Review notes (optional)',
    reasonRequired: false,
    help: 'This verifies the application. It does not publish the profile — publication stays a separate action.',
  },
  reject: {
    title: 'Reject application',
    confirm: 'Reject application',
    reasonLabel: 'Reason for rejection',
    reasonRequired: true,
    help: 'The provider will see this reason. Rejected applications move to Review History and can only return through an explicit reopening.',
  },
  request_changes: {
    title: 'Request changes',
    confirm: 'Request changes',
    reasonLabel: 'What must the provider change?',
    reasonRequired: true,
    help: 'The application leaves the pending queue until the provider resubmits with the requested changes.',
  },
  reopen: {
    title: 'Reopen review',
    confirm: 'Reopen review',
    reasonLabel: 'Why is a new review needed?',
    reasonRequired: true,
    help: 'This puts a decided application back into the pending queue. The earlier decision stays in the audit trail.',
  },
};

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'MS';
  return `${parts[0][0]}${parts[1]?.[0] ?? ''}`.toUpperCase();
};

const choiceLabel = (choice?: string | null) => {
  if (choice === 'verify_identity') return 'Verify My Identity';
  if (choice === 'verify_later') return 'Verify Later';
  return 'Not recorded';
};

const statusLabel = (status?: string | null) => {
  if (!status) return 'Not submitted';
  return status.replace(/_/g, ' ');
};

const Inner: React.FC = () => {
  const { user } = useAuth();
  const [pending, setPending] = useState<Row[]>([]);
  const [changes, setChanges] = useState<Row[]>([]);
  const [history, setHistory] = useState<Row[]>([]);
  const [scope, setScope] = useState<'pending' | 'changes' | 'history'>('pending');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [decision, setDecision] = useState<{ row: Row; action: Decision } | null>(null);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const canWrite = useMemo(() => {
    if (!user) return false;
    if (user.permissions?.length) return userHasPermission(user, 'reviews.write');
    return Boolean(user.isStaff || ['admin', 'moderator', 'support_admin'].includes(user.role ?? ''));
  }, [user]);

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await apiRequest<{ pending: Row[]; changes: Row[]; history: Row[] }>('/admin/provider-reviews.php?scope=all');
      setPending(data.pending);
      setChanges(data.changes ?? []);
      setHistory(data.history);
      setError(null);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const role = user?.role || '';
    if (!['admin', 'moderator', 'support_admin'].includes(role) && !user?.isStaff) {
      setError('Admin access required.');
      setLoading(false);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, user?.isStaff]);

  const openDecision = (row: Row, action: Decision) => {
    setDecision({ row, action });
    setReason('');
    setNotes('');
    setFormError(null);
  };

  const submitDecision = async () => {
    if (!decision) return;
    const copy = DECISION_COPY[decision.action];
    if (copy.reasonRequired && reason.trim().length < 3) {
      setFormError('Give at least a short reason (3 characters).');
      return;
    }
    setBusy(decision.row.providerUserId);
    setFormError(null);
    try {
      await apiRequest('/admin/provider-reviews.php', {
        method: 'POST',
        body: JSON.stringify({
          providerUserId: decision.row.providerUserId,
          action: decision.action,
          rejectionReason: reason.trim(),
          notes: notes.trim(),
        }),
      });
      setNotice(
        `${decision.row.displayName}: ${
          decision.action === 'approve'
            ? 'approved'
            : decision.action === 'reject'
              ? 'rejected'
              : decision.action === 'request_changes'
                ? 'changes requested'
                : 'returned to the pending queue'
        }.`,
      );
      setDecision(null);
      await load(true);
    } catch (err) {
      setFormError(getAuthErrorMessage(err));
      await load(true);
    } finally {
      setBusy(null);
    }
  };

  const source = scope === 'pending' ? pending : scope === 'changes' ? changes : history;
  const filtered = source.filter((row) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [row.displayName, row.email, row.city, row.providerType, row.verificationStatus]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q));
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <AdminPageHeader
        breadcrumbs={['Admin', 'People', 'Provider reviews']}
        title="Provider Reviews"
        subtitle="Decide pending applications, then keep the audit trail visible in Review History."
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
      {notice ? (
        <div role="status" className="mb-4 rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">
          {notice}
        </div>
      ) : null}

      <AdminCard className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex flex-wrap gap-1 rounded-[18px] bg-[#f1e9fb] p-1" role="tablist" aria-label="Review queue views">
            <button
              type="button"
              role="tab"
              aria-selected={scope === 'pending'}
              onClick={() => setScope('pending')}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-semibold transition ${
                scope === 'pending' ? 'bg-[#161616] text-[#F5F2FA]' : 'text-[#6b6275] hover:text-[#161616]'
              }`}
            >
              <Inbox className="h-3.5 w-3.5" aria-hidden /> Pending
              <span className={`rounded-full px-1.5 py-0.5 text-[10.5px] ${scope === 'pending' ? 'bg-white/15' : 'bg-white'}`}>
                {pending.length}
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={scope === 'changes'}
              onClick={() => setScope('changes')}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-semibold transition ${
                scope === 'changes' ? 'bg-[#161616] text-[#F5F2FA]' : 'text-[#6b6275] hover:text-[#161616]'
              }`}
            >
              Awaiting changes
              <span className={`rounded-full px-1.5 py-0.5 text-[10.5px] ${scope === 'changes' ? 'bg-white/15' : 'bg-white'}`}>
                {changes.length}
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={scope === 'history'}
              onClick={() => setScope('history')}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-semibold transition ${
                scope === 'history' ? 'bg-[#161616] text-[#F5F2FA]' : 'text-[#6b6275] hover:text-[#161616]'
              }`}
            >
              <History className="h-3.5 w-3.5" aria-hidden /> Review History
              <span className={`rounded-full px-1.5 py-0.5 text-[10.5px] ${scope === 'history' ? 'bg-white/15' : 'bg-white'}`}>
                {history.length}
              </span>
            </button>
          </div>
          <SearchInput
            className="min-w-0 flex-1 basis-[200px] sm:max-w-xs"
            value={query}
            onChange={setQuery}
            placeholder="Search name, email, city"
          />
        </div>
      </AdminCard>

      {loading ? (
        <AdminCard>
          <p className="py-10 text-center text-[13px] text-[#6b6275]">Loading review queue…</p>
        </AdminCard>
      ) : filtered.length === 0 ? (
        <AdminCard>
          <EmptyState
            icon={scope === 'history' ? History : CheckCircle2}
            title={
              scope === 'pending'
                ? pending.length === 0
                  ? 'No applications awaiting a decision'
                  : 'No pending applications match this search'
                : scope === 'changes'
                  ? changes.length === 0
                    ? 'No applications awaiting provider changes'
                    : 'No applications match this search'
                  : history.length === 0
                    ? 'No decisions recorded yet'
                    : 'No decisions match this search'
            }
            description={
              scope === 'pending'
                ? 'New submissions appear here when a provider requests review.'
                : scope === 'changes'
                  ? 'Providers update these applications before they return to the pending queue.'
                  : 'Approved and rejected applications are recorded here with their decision history.'
            }
          />
        </AdminCard>
      ) : (
        <div className="space-y-4">
          {filtered.map((row) => (
            <AdminCard key={row.providerUserId}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#161616] text-[12px] font-semibold text-[#F5F2FA]">
                    {initials(row.displayName)}
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-[22px] font-semibold text-[#161616]">{row.displayName}</h2>
                    <p className="mt-0.5 break-words text-[12.5px] text-[#6b6275]">
                      <span className="capitalize">{row.providerType ?? 'individual'}</span>
                      {row.city ? ` · ${row.city}` : ''} · {row.email}
                      {row.phone ? ` · ${row.phone}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={row.accountStatus ?? 'active'} label={`Account: ${(row.accountStatus ?? 'active').replace(/_/g, ' ')}`} />
                  <StatusBadge status={row.verificationStatus} label={`Identity: ${row.verificationStatus.replace(/_/g, ' ')}`} />
                </div>
              </div>

              <dl className="mt-4 grid gap-2 text-[12.5px] text-[#6b6275] sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#7e22ce]">Email</dt>
                  <dd>{row.emailVerified ? 'Verified' : 'Not verified'}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#7e22ce]">Phone</dt>
                  <dd>{row.phoneVerified ? 'Verified' : 'Not verified'}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#7e22ce]">Identity</dt>
                  <dd className="capitalize">{row.identityStatus.replace(/_/g, ' ')}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#7e22ce]">
                    {row.canDecide ? 'Submitted' : 'Decided'}
                  </dt>
                  <dd>{formatScheduledDate(row.canDecide ? row.submittedAt : row.decidedAt) || '—'}</dd>
                </div>
              </dl>

              <dl className="mt-3 grid gap-2 rounded-[12px] border border-[#ede4f7] bg-[#faf7ff] p-3 text-[12.5px] text-[#6b6275] sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#7e22ce]">Verification choice</dt>
                  <dd>{choiceLabel(row.verificationChoice)}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#7e22ce]">Government ID</dt>
                  <dd>
                    {row.hasIdDocument ? 'Uploaded' : 'Not uploaded'}
                    {row.hasIdDocument && row.latestDocumentId ? (
                      <a
                        className="ml-2 font-semibold text-[#6d28d9] hover:underline"
                        href={`/api/admin/documents.php?id=${encodeURIComponent(row.latestDocumentId)}&side=id`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View ID
                      </a>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#7e22ce]">Selfie</dt>
                  <dd>
                    {row.hasSelfie ? 'Uploaded' : 'Not uploaded'}
                    {row.hasSelfie && row.latestDocumentId ? (
                      <a
                        className="ml-2 font-semibold text-[#6d28d9] hover:underline"
                        href={`/api/admin/documents.php?id=${encodeURIComponent(row.latestDocumentId)}&side=selfie`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View selfie
                      </a>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#7e22ce]">
                    {row.providerType === 'agency' ? 'Business verification' : 'Identity status'}
                  </dt>
                  <dd className="capitalize">
                    {row.providerType === 'agency'
                      ? statusLabel(row.businessStatus)
                      : statusLabel(row.identityStatus)}
                  </dd>
                </div>
              </dl>

              {!row.canDecide ? (
                <div className="mt-4 rounded-[12px] border border-[#ede4f7] bg-[#faf7ff] px-3 py-2 text-[12.5px] text-[#6b6275]">
                  <p>
                    {row.verificationStatus === 'verified'
                      ? 'Approved'
                      : row.verificationStatus === 'changes_requested'
                        ? 'Changes requested'
                        : 'Rejected'}
                    {row.decidedBy ? ` by ${row.decidedBy}` : ''}
                    {row.decidedAt ? ` on ${formatScheduledDate(row.decidedAt)}` : ''}.
                  </p>
                  {row.rejectionReason ? <p className="mt-1 text-[#3f3548]">Reason: {row.rejectionReason}</p> : null}
                  {row.adminNotes ? <p className="mt-1">Notes: {row.adminNotes}</p> : null}
                </div>
              ) : null}

              {row.reviewHistory && row.reviewHistory.length > 0 ? (
                <details className="mt-3 rounded-[12px] border border-[#ede4f7] bg-white px-3 py-2 text-[12.5px] text-[#6b6275]">
                  <summary className="cursor-pointer font-semibold text-[#3f3548]">Verification history</summary>
                  <ul className="mt-2 space-y-1.5">
                    {row.reviewHistory.map((entry, index) => (
                      <li key={`${entry.action}-${entry.createdAt}-${index}`}>
                        <span className="font-medium text-[#3f3548]">{entry.action.replace(/^provider\./, '').replace(/_/g, ' ')}</span>
                        {entry.from || entry.to ? ` · ${statusLabel(entry.from)} → ${statusLabel(entry.to)}` : ''}
                        {entry.choice ? ` · ${choiceLabel(entry.choice)}` : ''}
                        {entry.createdAt ? ` · ${formatScheduledDate(entry.createdAt)}` : ''}
                        {entry.reason ? ` · ${entry.reason}` : ''}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {canWrite && row.canDecide ? (
                  <>
                    {row.accountStatus !== 'active' ? (
                      <button
                        type="button"
                        className={adminBtnGhostClass}
                        disabled={busy === row.providerUserId}
                        onClick={async () => {
                          setBusy(row.providerUserId);
                          try {
                            await apiRequest('/admin/provider-reviews.php', {
                              method: 'POST',
                              body: JSON.stringify({ providerUserId: row.providerUserId, action: 'approve_account', notes: 'Account approved independently of identity verification.' }),
                            });
                            setNotice(`${row.displayName}: account approved. Identity verification was not changed.`);
                            await load(true);
                          } catch (err) {
                            setError(getAuthErrorMessage(err));
                          } finally {
                            setBusy(null);
                          }
                        }}
                      >
                        Approve account only
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={adminBtnClass}
                      disabled={busy === row.providerUserId || !row.hasIdDocument || row.verificationChoice === 'verify_later'}
                      title={!row.hasIdDocument ? 'A government ID is required before identity approval' : undefined}
                      onClick={() => openDecision(row, 'approve')}
                    >
                      Approve identity
                    </button>
                    <button
                      type="button"
                      className={adminBtnGhostClass}
                      disabled={busy === row.providerUserId}
                      onClick={() => openDecision(row, 'request_changes')}
                    >
                      Request changes
                    </button>
                    <button
                      type="button"
                      className={`${adminBtnGhostClass} border-red-200 text-red-800`}
                      disabled={busy === row.providerUserId}
                      onClick={() => openDecision(row, 'reject')}
                    >
                      Reject
                    </button>
                  </>
                ) : null}
                {canWrite && row.canReopen ? (
                  <button
                    type="button"
                    className={adminBtnGhostClass}
                    disabled={busy === row.providerUserId}
                    onClick={() => openDecision(row, 'reopen')}
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Reopen review
                  </button>
                ) : null}
                {!canWrite ? (
                  <p className="text-[12.5px] text-[#6b6275]">Your role can view reviews but not decide them.</p>
                ) : null}
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      {decision ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDecision(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-decision-title"
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[20px] bg-white p-5 shadow-2xl sm:rounded-[20px] sm:p-6"
          >
            <h2 id="review-decision-title" className="font-display text-[24px] font-semibold">
              {DECISION_COPY[decision.action].title}
            </h2>
            <p className="mt-1 text-[13px] text-[#6b6275]">
              {decision.row.displayName} · {decision.row.email}
            </p>
            <p className="mt-3 rounded-[12px] bg-[#faf7ff] px-3 py-2 text-[12.5px] text-[#6b6275]">
              {DECISION_COPY[decision.action].help}
            </p>

            <div className="mt-4 space-y-3">
              <FormField label={DECISION_COPY[decision.action].reasonLabel}>
                <textarea
                  className={`${adminInputClass} h-24 py-2`}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    decision.action === 'approve'
                      ? 'Optional context for the audit trail'
                      : 'Be specific so the provider knows what to fix'
                  }
                />
              </FormField>
              {decision.action === 'approve' ? (
                <FormField label="Internal notes (optional)">
                  <input className={adminInputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </FormField>
              ) : null}
              {formError ? <p role="alert" className="text-[12.5px] text-red-700">{formError}</p> : null}
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" className={adminBtnGhostClass} onClick={() => setDecision(null)} disabled={!!busy}>
                Cancel
              </button>
              <button type="button" className={adminBtnClass} onClick={() => void submitDecision()} disabled={!!busy}>
                {busy ? 'Saving…' : DECISION_COPY[decision.action].confirm}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export const AdminProviderReviewsPage: React.FC = () => (
  <div className="ms-admin min-h-screen bg-[#faf7ff] text-[#161616]">
    <header className="border-b border-[#e5d9f2] bg-[#faf7ff]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link to="/admin" className="inline-flex min-w-0 items-center gap-2.5" aria-label="Admin workspace">
          <BrandLogo variant="default" withWordmark onLight markHeight={24} />
        </Link>
        <Link to="/admin" className="text-[13px] font-semibold text-[#6d28d9] hover:underline">
          Admin workspace
        </Link>
      </div>
    </header>
    <Inner />
  </div>
);

export default AdminProviderReviewsPage;
