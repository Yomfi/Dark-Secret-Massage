import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardList, Plus, RefreshCw } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { formatScheduledDate } from '../../lib/dates';
import {
  AdminCard,
  AdminCardHeader,
  DataCell,
  DataRow,
  DataTable,
  EmptyState,
  FormField,
  SearchInput,
  StatusBadge,
  adminBtnClass,
  adminBtnGhostClass,
  adminInputClass,
} from './index';

export type AssignmentRow = {
  id: string;
  customerUserId: string;
  customerName: string;
  customerEmail: string | null;
  providerProfileId: string;
  providerName: string | null;
  providerType: string;
  teamMemberId: string | null;
  teamMemberName: string | null;
  serviceId: string | null;
  serviceName: string | null;
  preferredAt: string | null;
  reason: string;
  notes: string | null;
  status: string;
  statusLabel: string;
  statusNote: string | null;
  allowedTransitions: string[];
  createdAt: string | null;
};

type CustomerOption = { id: string; name: string; email: string };
type ProviderOption = { userId: string; profileId: string | null; displayName: string; kind: string; city: string };
type ServiceOption = { id: string; name: string; price: number; currency: string; active?: boolean };
type TeamOption = { id: string; displayName: string; status: string };

type ModalState =
  | { mode: 'create'; customerUserId?: string }
  | { mode: 'reassign'; assignment: AssignmentRow }
  | { mode: 'detail'; assignment: AssignmentRow }
  | null;

const STATUS_ACTIONS: Record<string, string> = {
  pending_provider_response: 'Mark pending response',
  accepted: 'Accept',
  declined: 'Decline',
  cancelled: 'Cancel',
  completed: 'Complete',
};

export const AdminAssignmentsPanel: React.FC<{
  canWrite: boolean;
  initialCustomerId?: string | null;
  onClearedInitialCustomer?: () => void;
}> = ({ canWrite, initialCustomerId, onClearedInitialCustomer }) => {
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [events, setEvents] = useState<Array<{ id: string; event: string; note: string | null; actor: string | null; createdAt: string | null }>>([]);

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [team, setTeam] = useState<TeamOption[]>([]);

  const [form, setForm] = useState({
    customerUserId: '',
    providerUserId: '',
    providerProfileId: '',
    teamMemberId: '',
    serviceId: '',
    preferredAt: '',
    reason: '',
    notes: '',
    initialStatus: 'proposed',
  });
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ status: status === 'all' ? '' : status, q: query, perPage: '50' });
      const data = await apiRequest<{
        assignments: AssignmentRow[];
        counts: Record<string, number>;
        statuses: Record<string, string>;
      }>(`/admin/assignments.php?${qs.toString()}`);
      setRows(data.assignments);
      setCounts(data.counts);
      setStatuses(data.statuses);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load assignments.');
    } finally {
      setLoading(false);
    }
  }, [status, query]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!canWrite) return;
    void (async () => {
      try {
        const [c, p, s] = await Promise.all([
          apiRequest<{ customers: Array<{ id: string; name: string; email: string }> }>('/admin/customers.php?perPage=50'),
          apiRequest<{ providers: Array<{ userId: string; profileId: string | null; displayName: string; kind: string; city: string }> }>('/admin/providers.php'),
          apiRequest<{ services: Array<{ id: string; name: string; price: number; currency: string }> }>('/admin/services.php'),
        ]);
        setCustomers(c.customers);
        setProviders(p.providers.filter((x) => x.profileId));
        setServices(s.services);
      } catch {
        // Option loading failure is surfaced when a create is attempted.
      }
    })();
  }, [canWrite]);

  useEffect(() => {
    if (!initialCustomerId) return;
    if (!canWrite) return;
    setForm((f) => ({ ...f, customerUserId: initialCustomerId }));
    setModal({ mode: 'create', customerUserId: initialCustomerId });
    onClearedInitialCustomer?.();
  }, [initialCustomerId, canWrite, onClearedInitialCustomer]);

  const loadTeam = async (providerUserId: string) => {
    setTeam([]);
    if (!providerUserId) return;
    try {
      const detail = await apiRequest<{ teamMembers?: TeamOption[] }>(`/admin/providers.php?id=${encodeURIComponent(providerUserId)}`);
      setTeam((detail.teamMembers ?? []).filter((m) => m.status === 'active'));
    } catch {
      setTeam([]);
    }
  };

  const openCreate = (customerUserId = '') => {
    setForm({
      customerUserId, providerUserId: '', providerProfileId: '', teamMemberId: '', serviceId: '',
      preferredAt: '', reason: '', notes: '', initialStatus: 'proposed',
    });
    setTeam([]);
    setFormError(null);
    setModal({ mode: 'create', customerUserId });
  };

  const openReassign = (assignment: AssignmentRow) => {
    setForm({
      customerUserId: assignment.customerUserId,
      providerUserId: '',
      providerProfileId: assignment.providerProfileId,
      teamMemberId: assignment.teamMemberId ?? '',
      serviceId: assignment.serviceId ?? '',
      preferredAt: assignment.preferredAt ? assignment.preferredAt.slice(0, 16) : '',
      reason: assignment.reason,
      notes: '',
      initialStatus: assignment.status,
    });
    setTeam([]);
    setFormError(null);
    setModal({ mode: 'reassign', assignment });
  };

  const openDetail = async (assignment: AssignmentRow) => {
    setModal({ mode: 'detail', assignment });
    setEvents([]);
    try {
      const data = await apiRequest<{ events: typeof events }>(`/admin/assignments.php?id=${encodeURIComponent(assignment.id)}`);
      setEvents(data.events);
    } catch {
      setEvents([]);
    }
  };

  const submitCreate = async () => {
    setBusy(true);
    setFormError(null);
    try {
      await apiRequest('/admin/assignments.php', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          customerUserId: form.customerUserId,
          providerProfileId: form.providerProfileId,
          teamMemberId: form.teamMemberId || undefined,
          serviceId: form.serviceId || undefined,
          preferredAt: form.preferredAt || undefined,
          reason: form.reason,
          notes: form.notes,
          status: form.initialStatus,
        }),
      });
      setNotice('Assignment created. It is not a booking and has no payment.');
      setModal(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to create assignment.');
    } finally {
      setBusy(false);
    }
  };

  const submitReassign = async () => {
    if (modal?.mode !== 'reassign') return;
    if (!form.providerProfileId) {
      setFormError('Select a provider.');
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await apiRequest('/admin/assignments.php', {
        method: 'POST',
        body: JSON.stringify({
          action: 'reassign',
          assignmentId: modal.assignment.id,
          providerProfileId: form.providerProfileId,
          teamMemberId: form.teamMemberId || undefined,
          note: form.notes,
        }),
      });
      setNotice('Assignment reassigned.');
      setModal(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to reassign.');
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (assignment: AssignmentRow, to: string) => {
    const needsReason = ['declined', 'cancelled'].includes(to);
    const note = needsReason ? window.prompt(`Reason for ${to}`) ?? '' : window.prompt('Note (optional)') ?? '';
    if (needsReason && note.trim().length < 3) return;
    setBusy(true);
    try {
      await apiRequest('/admin/assignments.php', {
        method: 'POST',
        body: JSON.stringify({ action: 'update_status', assignmentId: assignment.id, status: to, note }),
      });
      setNotice(`Assignment marked ${to.replace(/_/g, ' ')}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update assignment.');
    } finally {
      setBusy(false);
    }
  };

  const selectedProvider = useMemo(
    () => providers.find((p) => p.userId === form.providerUserId),
    [providers, form.providerUserId]
  );

  return (
    <div className="space-y-4">
      {error ? <div role="alert" className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">{error}</div> : null}
      {notice ? <div role="status" className="rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">{notice}</div> : null}

      <AdminCard padding={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-[#efe8dc] p-4">
          <select className={`${adminInputClass} w-[190px]`} aria-label="Assignment status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses ({Object.values(counts).reduce((a, b) => a + b, 0)})</option>
            {Object.entries(statuses).map(([key, label]) => (
              <option key={key} value={key}>{label} ({counts[key] ?? 0})</option>
            ))}
          </select>
          <SearchInput className="min-w-0 flex-1 basis-[200px]" value={query} onChange={setQuery} placeholder="Search customer, provider or reason" onSubmit={() => void load()} />
          <button type="button" className={adminBtnGhostClass} onClick={() => void load()} disabled={loading}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Refresh
          </button>
          {canWrite ? (
            <button type="button" className={adminBtnClass} onClick={() => openCreate()}>
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Assign provider
            </button>
          ) : null}
        </div>

        <DataTable
          headers={['Customer', 'Provider', 'Service', 'Preferred', 'Status', 'Actions']}
          columnWidths={['24%', '24%', '18%', '14%', '12%', '8%']}
          empty={rows.length === 0}
          emptyIcon={ClipboardList}
          emptyTitle="No assignments yet"
          emptyDescription="Assign a customer to a verified provider or agency professional."
          minWidth="900px"
        >
          {rows.map((row) => (
            <DataRow key={row.id}>
              <DataCell>
                <button type="button" className="w-full min-w-0 text-left" onClick={() => void openDetail(row)}>
                  <p className="truncate font-semibold hover:underline">{row.customerName}</p>
                  <p className="truncate text-[12px] text-[#6f675c]" title={row.customerEmail ?? ''}>{row.customerEmail ?? '—'}</p>
                </button>
              </DataCell>
              <DataCell>
                <p className="truncate">{row.providerName ?? '—'}</p>
                <p className="truncate text-[12px] text-[#6f675c]">
                  {row.providerType === 'agency' ? `Agency${row.teamMemberName ? ` · ${row.teamMemberName}` : ''}` : 'Individual'}
                </p>
              </DataCell>
              <DataCell truncate title={row.serviceName ?? ''}>{row.serviceName ?? 'Any service'}</DataCell>
              <DataCell className="whitespace-nowrap text-[12.5px]">{row.preferredAt ? formatScheduledDate(row.preferredAt) : '—'}</DataCell>
              <DataCell><StatusBadge status={row.status} label={row.statusLabel} /></DataCell>
              <DataCell>
                <div className="flex justify-end gap-1.5">
                  <button type="button" className={adminBtnGhostClass} onClick={() => void openDetail(row)}>View</button>
                  {canWrite && row.allowedTransitions.length > 0 ? (
                    <select
                      className="h-11 max-w-[130px] rounded-[12px] border border-[#e0d7c8] bg-white px-2 text-[12px]"
                      aria-label={`Update ${row.customerName} assignment`}
                      value=""
                      disabled={busy}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'reassign') openReassign(row);
                        else if (value) void changeStatus(row, value);
                      }}
                    >
                      <option value="">Update…</option>
                      {row.allowedTransitions.map((t) => (
                        <option key={t} value={t}>{STATUS_ACTIONS[t] ?? t}</option>
                      ))}
                      {['proposed', 'pending_provider_response', 'accepted'].includes(row.status) ? (
                        <option value="reassign">Reassign provider</option>
                      ) : null}
                    </select>
                  ) : null}
                </div>
              </DataCell>
            </DataRow>
          ))}
        </DataTable>
      </AdminCard>

      {modal?.mode === 'detail' ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/45 sm:p-4" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="h-full w-full max-w-[520px] overflow-y-auto bg-white p-5 shadow-2xl sm:rounded-[18px]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7a52]">Assignment</p>
                <h2 className="truncate font-display text-[24px] font-semibold">{modal.assignment.customerName}</h2>
                <p className="text-[12.5px] text-[#6f675c]">{modal.assignment.providerName} · {modal.assignment.providerType}</p>
              </div>
              <StatusBadge status={modal.assignment.status} label={modal.assignment.statusLabel} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-[12.5px]">
              <div><dt className="text-[#8a7a52]">Service</dt><dd>{modal.assignment.serviceName ?? 'Any service'}</dd></div>
              <div><dt className="text-[#8a7a52]">Preferred</dt><dd>{modal.assignment.preferredAt ? formatScheduledDate(modal.assignment.preferredAt) : '—'}</dd></div>
              <div><dt className="text-[#8a7a52]">Team member</dt><dd>{modal.assignment.teamMemberName ?? '—'}</dd></div>
              <div><dt className="text-[#8a7a52]">Created</dt><dd>{formatScheduledDate(modal.assignment.createdAt)}</dd></div>
            </dl>
            <p className="mt-3 rounded-[12px] bg-[#faf7f2] px-3 py-2 text-[12.5px] text-[#6f675c]">Reason: {modal.assignment.reason}</p>
            {modal.assignment.notes ? <p className="mt-2 text-[12.5px] text-[#6f675c]">Notes: {modal.assignment.notes}</p> : null}
            {modal.assignment.statusNote ? <p className="mt-2 text-[12.5px] text-[#6f675c]">Status note: {modal.assignment.statusNote}</p> : null}
            <p className="mt-3 text-[11.5px] text-[#8a7a52]">An assignment is not a paid booking. Create the appointment through Bookings.</p>
            <p className="mt-4 text-[12.5px] font-semibold">History</p>
            {events.length === 0 ? <p className="mt-1 text-[12.5px] text-[#6f675c]">No events yet.</p> : (
              <ul className="mt-2 space-y-2">
                {events.map((e) => (
                  <li key={e.id} className="rounded-[12px] border border-[#efe8dc] px-3 py-2 text-[12px]">
                    <p className="font-semibold capitalize">{e.event.replace(/_/g, ' ')}</p>
                    <p className="text-[#6f675c]">{e.note || '—'}</p>
                    <p className="text-[11px] text-[#8a7a52]">{e.actor || 'Staff'} · {formatScheduledDate(e.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className={`${adminBtnGhostClass} mt-4`} onClick={() => setModal(null)}>Close</button>
          </div>
        </div>
      ) : null}

      {(modal?.mode === 'create' || modal?.mode === 'reassign') ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-6" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="assignment-dialog-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[20px] bg-white p-5 shadow-2xl sm:rounded-[20px]">
            <h2 id="assignment-dialog-title" className="font-display text-[24px] font-semibold">
              {modal.mode === 'create' ? 'Assign provider' : 'Reassign provider'}
            </h2>
            <p className="mt-1 text-[12.5px] text-[#6f675c]">Assignments are operational only; no booking or payment is created.</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <FormField label="Customer">
                <select className={adminInputClass} value={form.customerUserId} disabled={modal.mode === 'reassign'} onChange={(e) => setForm({ ...form, customerUserId: e.target.value })}>
                  <option value="">Select customer</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name || c.email}</option>)}
                </select>
              </FormField>
              <FormField label="Provider">
                <select
                  className={adminInputClass}
                  value={form.providerUserId}
                  onChange={(e) => {
                    const userId = e.target.value;
                    const provider = providers.find((p) => p.userId === userId);
                    setForm({ ...form, providerUserId: userId, providerProfileId: provider?.profileId ?? '', teamMemberId: '' });
                    void loadTeam(userId);
                  }}
                >
                  <option value="">Select provider</option>
                  {providers.map((p) => <option key={p.userId} value={p.userId}>{p.displayName} · {p.kind} · {p.city}</option>)}
                </select>
              </FormField>
              {selectedProvider?.kind === 'agency' ? (
                <FormField label="Agency professional (optional)">
                  <select className={adminInputClass} value={form.teamMemberId} onChange={(e) => setForm({ ...form, teamMemberId: e.target.value })}>
                    <option value="">Any team member</option>
                    {team.map((m) => <option key={m.id} value={m.id}>{m.displayName}</option>)}
                  </select>
                </FormField>
              ) : null}
              <FormField label="Service (optional)">
                <select className={adminInputClass} value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })}>
                  <option value="">Any service</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.currency} {s.price}</option>)}
                </select>
              </FormField>
              <FormField label="Preferred date/time (optional)">
                <input type="datetime-local" className={adminInputClass} value={form.preferredAt} onChange={(e) => setForm({ ...form, preferredAt: e.target.value })} />
              </FormField>
              {modal.mode === 'create' ? (
                <FormField label="Initial status">
                  <select className={adminInputClass} value={form.initialStatus} onChange={(e) => setForm({ ...form, initialStatus: e.target.value })}>
                    <option value="proposed">Proposed</option>
                    <option value="pending_provider_response">Pending provider response</option>
                  </select>
                </FormField>
              ) : null}
            </div>

            <div className="mt-3 space-y-3">
              <FormField label={modal.mode === 'create' ? 'Assignment reason' : 'Reassignment note'}>
                <input className={adminInputClass} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Why is this assignment being made?" />
              </FormField>
              <FormField label="Internal notes (optional)">
                <textarea className={`${adminInputClass} h-20 py-2`} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </FormField>
              {formError ? <p role="alert" className="text-[12.5px] text-red-700">{formError}</p> : null}
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" className={adminBtnGhostClass} onClick={() => setModal(null)} disabled={busy}>Cancel</button>
              <button
                type="button"
                className={adminBtnClass}
                disabled={busy || !form.customerUserId || !form.providerProfileId || (modal.mode === 'create' && form.reason.trim().length < 3)}
                onClick={() => void (modal.mode === 'create' ? submitCreate() : submitReassign())}
              >
                {busy ? 'Saving…' : modal.mode === 'create' ? 'Create assignment' : 'Reassign'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AdminAssignmentsPanel;
