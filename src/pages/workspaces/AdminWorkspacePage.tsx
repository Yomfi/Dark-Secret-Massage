import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../lib/api';
import { formatScheduledDate } from '../../lib/dates';
import { useAuth } from '../../auth/AuthContext';
import { WorkspaceShell, type WorkspaceNavItem } from '../../components/workspace/WorkspaceShell';

type Overview = {
  counts: {
    customers: number;
    individualProviders: number;
    agencies: number;
    pendingReviews: number;
    publishedProviders: number;
    activeServices: number;
    bookings: number;
    revenueCompleted: number;
    unverifiedEmails: number;
  };
  bookingsByStatus: Record<string, number>;
  tasks: Array<{ providerUserId: string; displayName: string; providerType: string; city: string; status: string; submittedAt: string | null }>;
  recentBookings: Booking[];
  mail: { configured: boolean; transport: string; missing: string[] };
};

type Customer = {
  id: string; name: string; email: string; phone: string; status: string;
  emailVerified: boolean; createdAt: string | null; bookings: number; completedBookings: number;
};

type Provider = {
  userId: string; profileId: string | null; displayName: string; email: string; phone: string;
  kind: string; city: string; slug: string | null; accountStatus: string; emailVerified: boolean;
  verificationStatus: string; identityStatus: string; rejectionReason: string | null;
  published: boolean; submittedAt: string | null;
};

type Service = {
  id: string; name: string; description: string; durationMinutes: number; price: number;
  currency: string; image: string | null; category: string | null; active: boolean; sortOrder: number;
};

type Booking = {
  id: string; reference: string | null; status: string; serviceName: string; price: number; currency: string;
  scheduledAt: string | null; timeSlot: string | null; locationType: string | null;
  customerName: string | null; customerEmail: string | null; providerName?: string | null;
  teamMemberName?: string | null; createdAt: string | null;
};

type ContentPayload = {
  pages: Array<{ id: string; slug: string; title: string; bodyHtml: string; status: string; seoTitle: string; seoDescription: string; updatedAt: string | null }>;
  faqs: Array<{ id: string; question: string; answer: string; sortOrder: number; active: boolean }>;
  settings: Record<string, string>;
};

type AuditEntry = { id: string; action: string; entityType: string | null; entityId: string | null; actor: string | null; createdAt: string };

const card = 'rounded-2xl border border-[#e6dfd2] bg-white p-5';
const label = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7a52]';
const input = 'h-12 w-full rounded-xl border border-[#d9cfba] bg-white px-3 text-[13.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8862f]';
const btn = 'inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#221f19] px-4 text-[13px] font-semibold text-white hover:bg-[#3a342a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8862f] disabled:opacity-60';
const btnGhost = 'inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#d9cfba] px-4 text-[13px] font-semibold hover:bg-[#f2eee4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8862f] disabled:opacity-60';
const th = 'px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6b6252]';
const td = 'px-3 py-3 align-top text-[13px]';

const badgeFor = (status: string): string => {
  const map: Record<string, string> = {
    active: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    verified: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    published: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    pending: 'border-amber-200 bg-amber-50 text-amber-800',
    pending_review: 'border-amber-200 bg-amber-50 text-amber-800',
    changes_requested: 'border-sky-200 bg-sky-50 text-sky-800',
    suspended: 'border-red-200 bg-red-50 text-red-800',
    rejected: 'border-red-200 bg-red-50 text-red-800',
    cancelled: 'border-zinc-200 bg-zinc-100 text-zinc-700',
    completed: 'border-zinc-200 bg-zinc-100 text-zinc-700',
    confirmed: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  };
  return `inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${map[status] ?? 'border-[#d9cfba] bg-[#f2eee4] text-[#6b6252]'}`;
};

export const AdminWorkspacePage: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [overview, setOverview] = useState<Overview | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [content, setContent] = useState<ContentPayload | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);

  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('all');
  const [status, setStatus] = useState('');
  const [pageEditor, setPageEditor] = useState({ id: '', slug: '', title: '', bodyHtml: '', seoTitle: '', seoDescription: '' });
  const [serviceForm, setServiceForm] = useState({ id: '', name: '', description: '', durationMinutes: 60, price: 0, active: false, image: '' });

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }, []);

  const load = useCallback(async () => {
    if (tab === 'overview') {
      const data = await apiRequest<Overview>('/admin/overview.php');
      setOverview(data);
      return;
    }
    if (tab === 'customers') {
      const data = await apiRequest<{ customers: Customer[] }>(`/admin/customers.php?q=${encodeURIComponent(search)}`);
      setCustomers(data.customers);
      return;
    }
    if (tab === 'providers') {
      const data = await apiRequest<{ providers: Provider[] }>(`/admin/providers.php?kind=${kind}&q=${encodeURIComponent(search)}`);
      setProviders(data.providers);
      return;
    }
    if (tab === 'services') {
      const data = await apiRequest<{ services: Service[] }>('/admin/services.php');
      setServices(data.services);
      return;
    }
    if (tab === 'bookings') {
      const data = await apiRequest<{ bookings: Booking[] }>(`/admin/bookings.php?status=${status}`);
      setBookings(data.bookings);
      return;
    }
    if (tab === 'content') {
      const data = await apiRequest<ContentPayload>('/admin/content.php');
      setContent(data);
      return;
    }
    if (tab === 'audit') {
      const data = await apiRequest<{ entries: AuditEntry[] }>('/admin/audit.php');
      setAudit(data.entries);
    }
  }, [tab, search, kind, status]);

  useEffect(() => {
    run(load);
  }, [run, load]);

  const nav = useMemo<WorkspaceNavItem[]>(() => [
    { id: 'overview', label: 'Overview', badge: overview?.counts.pendingReviews },
    { id: 'customers', label: 'Customers' },
    { id: 'providers', label: 'Providers', badge: overview?.counts.pendingReviews },
    { id: 'services', label: 'Service catalogue' },
    { id: 'bookings', label: 'Bookings' },
    { id: 'content', label: 'Website content' },
    { id: 'audit', label: 'Audit history' },
  ], [overview?.counts.pendingReviews]);

  const act = (fn: () => Promise<void>, message: string) =>
    run(async () => {
      await fn();
      setNotice(message);
      await load();
    });

  return (
    <WorkspaceShell
      roleLabel="Admin workspace"
      title={nav.find((n) => n.id === tab)?.label ?? 'Overview'}
      subtitle={user?.email}
      nav={nav}
      active={tab}
      onNavigate={(id) => {
        setNotice(null);
        setTab(id);
      }}
      actions={
        <Link to="/admin/provider-reviews" className={btnGhost}>
          Provider review queue
        </Link>
      }
    >
      {error ? <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">{error}</div> : null}
      {notice ? <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">{notice}</div> : null}
      {busy ? <div className="mb-4 h-1 w-full overflow-hidden rounded bg-[#e6dfd2]"><div className="h-full w-1/3 animate-pulse bg-[#b8862f]" /></div> : null}

      {tab === 'overview' && overview ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Customers', overview.counts.customers],
              ['Individual providers', overview.counts.individualProviders],
              ['Agencies', overview.counts.agencies],
              ['Pending reviews', overview.counts.pendingReviews],
              ['Published providers', overview.counts.publishedProviders],
              ['Active services', overview.counts.activeServices],
              ['Bookings', overview.counts.bookings],
              ['Completed value', `GHS ${overview.counts.revenueCompleted.toLocaleString()}`],
            ].map(([title, value]) => (
              <div key={String(title)} className={card}>
                <p className={label}>{title}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className={card}>
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold">Needs attention</h2>
                <Link to="/admin/provider-reviews" className="text-[12.5px] font-semibold text-[#8a6a1f] hover:underline">Open queue</Link>
              </div>
              {overview.tasks.length === 0 ? (
                <p className="mt-3 text-[13px] text-[#6b6252]">No provider reviews are waiting.</p>
              ) : (
                <ul className="mt-3 divide-y divide-[#eee7d9]">
                  {overview.tasks.map((task) => (
                    <li key={task.providerUserId} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-medium">{task.displayName}</p>
                        <p className="text-[12px] text-[#6b6252]">{task.providerType} · {task.city || '—'}</p>
                      </div>
                      <span className={badgeFor(task.status)}>{task.status.replace('_', ' ')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={card}>
              <h2 className="text-[15px] font-semibold">Email delivery</h2>
              <p className="mt-2 text-[13px] text-[#6b6252]">
                Transport: <strong>{overview.mail.transport}</strong> ·{' '}
                {overview.mail.configured ? 'configured' : 'not configured'}
              </p>
              {overview.mail.missing.length > 0 ? (
                <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">
                  Missing keys: {overview.mail.missing.join(', ')}. Values are never shown here.
                </p>
              ) : (
                <p className="mt-2 text-[12.5px] text-emerald-800">All required SMTP keys are present. Values stay server-side.</p>
              )}
              <h3 className="mt-5 text-[13px] font-semibold">Recent bookings</h3>
              {overview.recentBookings.length === 0 ? (
                <p className="mt-2 text-[13px] text-[#6b6252]">No bookings yet.</p>
              ) : (
                <ul className="mt-2 divide-y divide-[#eee7d9]">
                  {overview.recentBookings.map((b) => (
                    <li key={b.id} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                      <span className="truncate">{b.serviceName}</span>
                      <span className={badgeFor(b.status)}>{b.status.replace('_', ' ')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className={`${card} overflow-x-auto p-0`}>
            <table className="w-full min-w-[560px]">
              <thead className="bg-[#f2eee4]"><tr><th className={th}>Booking status</th><th className={th}>Count</th></tr></thead>
              <tbody>
                {Object.entries(overview.bookingsByStatus).map(([key, value]) => (
                  <tr key={key} className="border-t border-[#eee7d9]"><td className={td}>{key.replace('_', ' ')}</td><td className={td}>{value}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      ) : null}

      {tab === 'customers' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input className={`${input} max-w-xs`} placeholder="Search name, email or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className={btn} onClick={() => run(load)} disabled={busy}>Search</button>
          </div>
          <div className={`${card} overflow-x-auto p-0`}>
            <table className="w-full min-w-[760px]">
              <thead className="bg-[#f2eee4]"><tr>
                <th className={th}>Customer</th><th className={th}>Contact</th><th className={th}>Status</th><th className={th}>Bookings</th><th className={th}>Action</th>
              </tr></thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr><td className={`${td} text-[#6b6252]`} colSpan={5}>No customers yet.</td></tr>
                ) : customers.map((c) => (
                  <tr key={c.id} className="border-t border-[#eee7d9]">
                    <td className={td}><p className="font-medium">{c.name || '—'}</p><p className="text-[12px] text-[#6b6252]">{c.emailVerified ? 'Email confirmed' : 'Email unconfirmed'}</p></td>
                    <td className={td}><p>{c.email}</p><p className="text-[12px] text-[#6b6252]">{c.phone || '—'}</p></td>
                    <td className={td}><span className={badgeFor(c.status)}>{c.status}</span></td>
                    <td className={td}>{c.bookings} ({c.completedBookings} completed)</td>
                    <td className={td}>
                      <button className={btnGhost} disabled={busy} onClick={() => act(async () => {
                        await apiRequest('/admin/customers.php', { method: 'POST', body: JSON.stringify({ userId: c.id, action: c.status === 'suspended' ? 'activate' : 'suspend' }) });
                      }, c.status === 'suspended' ? 'Customer reactivated.' : 'Customer suspended.')}>
                        {c.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === 'providers' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <select className={`${input} max-w-[200px]`} value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="all">All providers</option><option value="individual">Individuals</option><option value="agency">Agencies</option>
            </select>
            <input className={`${input} max-w-xs`} placeholder="Search providers" value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className={btn} onClick={() => run(load)} disabled={busy}>Apply</button>
          </div>
          <div className={`${card} overflow-x-auto p-0`}>
            <table className="w-full min-w-[900px]">
              <thead className="bg-[#f2eee4]"><tr>
                <th className={th}>Provider</th><th className={th}>Verification</th><th className={th}>Public</th><th className={th}>Account</th><th className={th}>Actions</th>
              </tr></thead>
              <tbody>
                {providers.length === 0 ? (
                  <tr><td className={`${td} text-[#6b6252]`} colSpan={5}>No providers yet.</td></tr>
                ) : providers.map((p) => (
                  <tr key={p.userId} className="border-t border-[#eee7d9]">
                    <td className={td}><p className="font-medium">{p.displayName}</p><p className="text-[12px] text-[#6b6252]">{p.kind} · {p.city || '—'} · {p.email}</p></td>
                    <td className={td}><span className={badgeFor(p.verificationStatus)}>{p.verificationStatus.replace('_', ' ')}</span><p className="mt-1 text-[12px] text-[#6b6252]">ID: {p.identityStatus.replace('_', ' ')}</p></td>
                    <td className={td}><span className={badgeFor(p.published ? 'published' : 'pending')}>{p.published ? 'Published' : 'Not published'}</span></td>
                    <td className={td}><span className={badgeFor(p.accountStatus)}>{p.accountStatus}</span></td>
                    <td className={td}>
                      <div className="flex flex-wrap gap-2">
                        {p.published ? (
                          <button className={btnGhost} disabled={busy} onClick={() => act(async () => {
                            await apiRequest('/admin/providers.php', { method: 'POST', body: JSON.stringify({ providerUserId: p.userId, action: 'unpublish' }) });
                          }, 'Provider unpublished.')}>Unpublish</button>
                        ) : (
                          <button className={btn} disabled={busy} onClick={() => act(async () => {
                            await apiRequest('/admin/providers.php', { method: 'POST', body: JSON.stringify({ providerUserId: p.userId, action: 'publish' }) });
                          }, 'Provider published.')}>Publish</button>
                        )}
                        <button className={btnGhost} disabled={busy} onClick={() => act(async () => {
                          await apiRequest('/admin/providers.php', { method: 'POST', body: JSON.stringify({ providerUserId: p.userId, action: p.accountStatus === 'suspended' ? 'activate' : 'suspend' }) });
                        }, 'Provider account updated.')}>{p.accountStatus === 'suspended' ? 'Reactivate' : 'Suspend'}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-[#6b6252]">Publication is only possible after a verified review and a confirmed email; providers cannot publish themselves.</p>
        </div>
      ) : null}

      {tab === 'services' ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <div className={`${card} overflow-x-auto p-0`}>
            <table className="w-full min-w-[620px]">
              <thead className="bg-[#f2eee4]"><tr><th className={th}>Service</th><th className={th}>Duration</th><th className={th}>Price</th><th className={th}>Status</th><th className={th}></th></tr></thead>
              <tbody>
                {services.length === 0 ? (
                  <tr><td className={`${td} text-[#6b6252]`} colSpan={5}>No services yet. Add the first real service to publish it on the website.</td></tr>
                ) : services.map((s) => (
                  <tr key={s.id} className="border-t border-[#eee7d9]">
                    <td className={td}><p className="font-medium">{s.name}</p><p className="max-w-md text-[12px] text-[#6b6252]">{s.description}</p></td>
                    <td className={td}>{s.durationMinutes} min</td>
                    <td className={td}>{s.currency} {s.price.toLocaleString()}</td>
                    <td className={td}><span className={badgeFor(s.active ? 'active' : 'pending')}>{s.active ? 'Active' : 'Inactive'}</span></td>
                    <td className={td}>
                      <div className="flex gap-2">
                        <button className={btnGhost} onClick={() => setServiceForm({ id: s.id, name: s.name, description: s.description, durationMinutes: s.durationMinutes, price: s.price, active: s.active, image: s.image ?? '' })}>Edit</button>
                        <button className={btnGhost} disabled={busy} onClick={() => act(async () => {
                          await apiRequest('/admin/services.php', { method: 'DELETE', body: JSON.stringify({ id: s.id }) });
                        }, 'Service deleted.')}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form className={`${card} space-y-3`} onSubmit={(e) => {
            e.preventDefault();
            act(async () => {
              await apiRequest('/admin/services.php', { method: 'POST', body: JSON.stringify(serviceForm) });
              setServiceForm({ id: '', name: '', description: '', durationMinutes: 60, price: 0, active: false, image: '' });
            }, 'Service saved.');
          }}>
            <h2 className="text-[15px] font-semibold">{serviceForm.id ? 'Edit service' : 'New service'}</h2>
            <input className={input} placeholder="Service name" value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} required />
            <textarea className={`${input} h-28 py-2`} placeholder="Description shown on the website" value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className={input} type="number" min={15} max={480} value={serviceForm.durationMinutes} onChange={(e) => setServiceForm({ ...serviceForm, durationMinutes: Number(e.target.value) })} aria-label="Duration minutes" />
              <input className={input} type="number" min={0} value={serviceForm.price} onChange={(e) => setServiceForm({ ...serviceForm, price: Number(e.target.value) })} aria-label="Price GHS" />
            </div>
            <input className={input} placeholder="Image URL (media library)" value={serviceForm.image} onChange={(e) => setServiceForm({ ...serviceForm, image: e.target.value })} />
            <label className="flex min-h-12 items-center gap-3 text-[13px]">
              <input type="checkbox" className="h-5 w-5 rounded border-[#d9cfba]" checked={serviceForm.active} onChange={(e) => setServiceForm({ ...serviceForm, active: e.target.checked })} />
              Active on the public website
            </label>
            <button className={btn} type="submit" disabled={busy}>{serviceForm.id ? 'Save changes' : 'Create service'}</button>
          </form>
        </div>
      ) : null}

      {tab === 'bookings' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <select className={`${input} max-w-[220px]`} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {['pending', 'confirmed', 'reschedule_requested', 'completed', 'cancelled', 'no_show'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <button className={btn} onClick={() => run(load)} disabled={busy}>Apply</button>
          </div>
          <div className={`${card} overflow-x-auto p-0`}>
            <table className="w-full min-w-[860px]">
              <thead className="bg-[#f2eee4]"><tr><th className={th}>Booking</th><th className={th}>Customer</th><th className={th}>When</th><th className={th}>Provider</th><th className={th}>Status</th><th className={th}>Action</th></tr></thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr><td className={`${td} text-[#6b6252]`} colSpan={6}>No bookings yet.</td></tr>
                ) : bookings.map((b) => (
                  <tr key={b.id} className="border-t border-[#eee7d9]">
                    <td className={td}><p className="font-medium">{b.serviceName}</p><p className="text-[12px] text-[#6b6252]">{b.reference ?? b.id}</p></td>
                    <td className={td}>{b.customerName || '—'}<p className="text-[12px] text-[#6b6252]">{b.customerEmail}</p></td>
                    <td className={td}>{formatScheduledDate(b.scheduledAt)}<p className="text-[12px] text-[#6b6252]">{b.timeSlot ?? ''}</p></td>
                    <td className={td}>{b.providerName ?? 'Unassigned'}{b.teamMemberName ? <p className="text-[12px] text-[#6b6252]">{b.teamMemberName}</p> : null}</td>
                    <td className={td}><span className={badgeFor(b.status)}>{b.status.replace('_', ' ')}</span></td>
                    <td className={td}>
                      <select
                        className="h-11 rounded-lg border border-[#d9cfba] bg-white px-2 text-[12.5px]"
                        defaultValue=""
                        disabled={busy}
                        onChange={(e) => {
                          const next = e.target.value;
                          if (!next) return;
                          act(async () => {
                            await apiRequest('/admin/bookings.php', { method: 'POST', body: JSON.stringify({ bookingId: b.id, action: 'status', status: next }) });
                          }, 'Booking status updated.');
                        }}
                      >
                        <option value="">Change status…</option>
                        {['confirmed', 'completed', 'cancelled', 'no_show', 'reschedule_requested'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === 'content' && content ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
          <div className="space-y-4">
            <section className={`${card} p-0`}>
              <div className="flex items-center justify-between px-5 py-4">
                <h2 className="text-[15px] font-semibold">Pages</h2>
                <button className={btnGhost} onClick={() => setPageEditor({ id: '', slug: '', title: '', bodyHtml: '', seoTitle: '', seoDescription: '' })}>New page</button>
              </div>
              <ul className="divide-y divide-[#eee7d9]">
                {content.pages.length === 0 ? (
                  <li className="px-5 py-6 text-[13px] text-[#6b6252]">No pages yet. Create one, save a draft, then publish.</li>
                ) : content.pages.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                    <button type="button" className="min-w-0 text-left" onClick={() => setPageEditor({ id: p.id, slug: p.slug, title: p.title, bodyHtml: p.bodyHtml, seoTitle: p.seoTitle, seoDescription: p.seoDescription })}>
                      <p className="truncate text-[13.5px] font-medium">{p.title}</p>
                      <p className="text-[12px] text-[#6b6252]">/{p.slug}</p>
                    </button>
                    <div className="flex items-center gap-2">
                      <span className={badgeFor(p.status === 'published' ? 'published' : 'pending')}>{p.status}</span>
                      <button className={btnGhost} disabled={busy} onClick={() => act(async () => {
                        await apiRequest('/admin/content.php', { method: 'POST', body: JSON.stringify({ action: p.status === 'published' ? 'unpublish_page' : 'publish_page', id: p.id }) });
                      }, p.status === 'published' ? 'Page unpublished.' : 'Page published.')}>{p.status === 'published' ? 'Unpublish' : 'Publish'}</button>
                      <Link className={btnGhost} to={`/api/admin/content.php?preview=${p.id}`} target="_blank" rel="noreferrer">Preview JSON</Link>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className={card}>
              <h2 className="text-[15px] font-semibold">FAQs</h2>
              <ul className="mt-3 divide-y divide-[#eee7d9]">
                {content.faqs.length === 0 ? <li className="py-3 text-[13px] text-[#6b6252]">No FAQs yet.</li> : content.faqs.map((f) => (
                  <li key={f.id} className="flex items-start justify-between gap-3 py-3">
                    <div><p className="text-[13.5px] font-medium">{f.question}</p><p className="text-[12.5px] text-[#6b6252]">{f.answer}</p></div>
                    <span className={badgeFor(f.active ? 'active' : 'pending')}>{f.active ? 'Active' : 'Hidden'}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className={card}>
              <h2 className="text-[15px] font-semibold">Contact, social & SEO</h2>
              <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const settings: Record<string, string> = {};
                form.forEach((v, k) => { settings[k] = String(v); });
                act(async () => {
                  await apiRequest('/admin/content.php', { method: 'POST', body: JSON.stringify({ action: 'save_settings', settings }) });
                }, 'Website settings saved.');
              }}>
                {[
                  ['contact_email', 'Contact email'],
                  ['contact_phone', 'Contact phone'],
                  ['contact_whatsapp', 'WhatsApp'],
                  ['social_instagram', 'Instagram URL'],
                  ['seo_title', 'SEO title'],
                  ['seo_description', 'SEO description'],
                ].map(([key, labelText]) => (
                  <label key={key} className="text-[12px] font-medium text-[#6b6252]">
                    {labelText}
                    <input name={key} defaultValue={content.settings[key] ?? ''} className={`${input} mt-1`} />
                  </label>
                ))}

                <div className="sm:col-span-2 mt-2 border-t border-[#eee7d9] pt-4">
                  <h3 className="text-[13.5px] font-semibold">Booking schedule</h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#6b6252]">
                    These values generate the public time slots. Leave them empty to show an honest
                    “not published yet” state instead of inventing times.
                  </p>
                </div>
                {[
                  ['booking_days', 'Working days (e.g. Mon-Sat)'],
                  ['booking_hours', 'Opening hours (e.g. 09:00-19:00)'],
                  ['booking_slot_minutes', 'Slot length in minutes (e.g. 60)'],
                  ['booking_timezone', 'Timezone (e.g. Africa/Accra)'],
                ].map(([key, labelText]) => (
                  <label key={key} className="text-[12px] font-medium text-[#6b6252]">
                    {labelText}
                    <input name={key} defaultValue={content.settings[key] ?? ''} className={`${input} mt-1`} />
                  </label>
                ))}
                <label className="sm:col-span-2 text-[12px] font-medium text-[#6b6252]">
                  Booking notice shown above the booking steps
                  <textarea
                    name="booking_notice"
                    defaultValue={content.settings.booking_notice ?? ''}
                    rows={3}
                    className={`${input} mt-1 h-auto py-2`}
                    placeholder="e.g. Same-day requests are reviewed by phone before confirmation."
                  />
                </label>
                <div className="sm:col-span-2"><button className={btn} type="submit" disabled={busy}>Save settings</button></div>
              </form>
            </section>
          </div>

          <form className={`${card} space-y-3`} onSubmit={(e) => {
            e.preventDefault();
            act(async () => {
              await apiRequest('/admin/content.php', { method: 'POST', body: JSON.stringify({ action: 'save_page', ...pageEditor }) });
            }, 'Draft saved.');
          }}>
            <h2 className="text-[15px] font-semibold">{pageEditor.id ? 'Edit page' : 'New page'}</h2>
            <input className={input} placeholder="Title" value={pageEditor.title} onChange={(e) => setPageEditor({ ...pageEditor, title: e.target.value })} required />
            <input className={input} placeholder="Slug (about-us)" value={pageEditor.slug} onChange={(e) => setPageEditor({ ...pageEditor, slug: e.target.value })} required />
            <textarea className={`${input} h-48 py-2 font-mono text-[12.5px]`} placeholder="Page HTML" value={pageEditor.bodyHtml} onChange={(e) => setPageEditor({ ...pageEditor, bodyHtml: e.target.value })} />
            <input className={input} placeholder="SEO title" value={pageEditor.seoTitle} onChange={(e) => setPageEditor({ ...pageEditor, seoTitle: e.target.value })} />
            <input className={input} placeholder="SEO description" value={pageEditor.seoDescription} onChange={(e) => setPageEditor({ ...pageEditor, seoDescription: e.target.value })} />
            <button className={btn} type="submit" disabled={busy}>Save draft</button>
            {pageEditor.id ? (
              <button type="button" className={btnGhost} disabled={busy} onClick={() => act(async () => {
                await apiRequest('/admin/content.php', { method: 'POST', body: JSON.stringify({ action: 'save_page', ...pageEditor }) });
                await apiRequest('/admin/content.php', { method: 'POST', body: JSON.stringify({ action: 'publish_page', id: pageEditor.id }) });
              }, 'Page saved and published.')}>Save & publish</button>
            ) : null}
          </form>
        </div>
      ) : null}

      {tab === 'audit' ? (
        <div className={`${card} overflow-x-auto p-0`}>
          <table className="w-full min-w-[720px]">
            <thead className="bg-[#f2eee4]"><tr><th className={th}>When</th><th className={th}>Action</th><th className={th}>Entity</th><th className={th}>Actor</th></tr></thead>
            <tbody>
              {audit.length === 0 ? (
                <tr><td className={`${td} text-[#6b6252]`} colSpan={4}>No admin actions recorded yet.</td></tr>
              ) : audit.map((a) => (
                <tr key={a.id} className="border-t border-[#eee7d9]">
                  <td className={td}>{a.createdAt}</td>
                  <td className={td}>{a.action}</td>
                  <td className={td}>{a.entityType ?? '—'}{a.entityId ? <span className="block text-[11.5px] text-[#6b6252]">{a.entityId}</span> : null}</td>
                  <td className={td}>{a.actor ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </WorkspaceShell>
  );
};

export default AdminWorkspacePage;
