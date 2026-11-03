import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../lib/api';
import { formatScheduledDate } from '../../lib/dates';
import { useAuth } from '../../auth/AuthContext';
import { userHasPermission } from '../../lib/workspaceHome';
import {
  WorkspaceShell,
  type WorkspaceNavGroup,
  type WorkspaceNavItem,
} from '../../components/workspace/WorkspaceShell';

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

type CustomerDetail = {
  customer: Customer & { firstName: string; lastName: string; updatedAt: string | null; isQa?: boolean };
  bookings: Booking[];
  notes: Array<{ id: string; body: string; createdAt: string | null; author: string }>;
  privacyRequests: Array<{ id: string; type: string; status: string; notes: string | null; createdAt: string | null; resolvedAt: string | null }>;
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
  address?: string | null; customerName: string | null; customerEmail: string | null; customerPhone?: string | null;
  providerName?: string | null; teamMemberName?: string | null; notes?: string | null; createdAt: string | null;
  events?: Array<{ event: string; fromStatus: string | null; toStatus: string | null; note: string | null; createdAt: string | null }>;
};

type ContentPayload = {
  pages: Array<{ id: string; slug: string; title: string; bodyHtml: string; status: string; seoTitle: string; seoDescription: string; updatedAt: string | null }>;
  faqs: Array<{ id: string; question: string; answer: string; sortOrder: number; active: boolean }>;
  settings: Record<string, string>;
};

type AuditEntry = { id: string; action: string; entityType: string | null; entityId: string | null; actor: string | null; createdAt: string };

type MediaAsset = {
  id: string; url: string; filename: string; mime: string; sizeBytes: number; altText: string; createdAt: string | null;
};

type Announcement = {
  id: string; title: string; bodyHtml: string; status: string;
  publishedAt: string | null; updatedAt: string | null; createdAt: string | null;
};

type StaffMember = {
  userId: string; email: string; name: string; accountStatus: string; staffRole: string;
  staffRoleLabel: string; isActive: boolean; invitedAt: string | null; activatedAt: string | null;
};

type StaffInvite = {
  id: string; email: string; staffRole: string; staffRoleLabel: string; expiresAt: string | null; createdAt: string | null;
};

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
    draft: 'border-amber-200 bg-amber-50 text-amber-800',
    deleted: 'border-zinc-200 bg-zinc-100 text-zinc-700',
    open: 'border-sky-200 bg-sky-50 text-sky-800',
    resolved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  };
  return `inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${map[status] ?? 'border-[#d9cfba] bg-[#f2eee4] text-[#6b6252]'}`;
};

type NavDef = WorkspaceNavItem & { permission: string; group: string };

const NAV_DEFS: NavDef[] = [
  { id: 'overview', label: 'Overview', permission: 'dashboard.read', group: 'Overview' },
  { id: 'bookings', label: 'Bookings', permission: 'bookings.read', group: 'Operations' },
  { id: 'customers', label: 'Customers', permission: 'customers.read', group: 'People' },
  { id: 'providers', label: 'Providers', permission: 'providers.read', group: 'People' },
  { id: 'staff', label: 'Staff', permission: 'staff.read', group: 'People' },
  { id: 'content', label: 'Content', permission: 'content.read', group: 'Website' },
  { id: 'media', label: 'Media', permission: 'media.read', group: 'Website' },
  { id: 'services', label: 'Services', permission: 'services.read', group: 'Website' },
  { id: 'updates', label: 'Updates', permission: 'content.read', group: 'Website' },
  { id: 'system', label: 'System', permission: 'system.read', group: 'Administration' },
  { id: 'audit', label: 'Audit', permission: 'audit.read', group: 'Administration' },
];

export const AdminWorkspacePage: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [overview, setOverview] = useState<Overview | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerNote, setCustomerNote] = useState('');
  const [customerProfile, setCustomerProfile] = useState({ firstName: '', lastName: '', phone: '' });
  const [providers, setProviders] = useState<Provider[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingDetail, setBookingDetail] = useState<Booking | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [content, setContent] = useState<ContentPayload | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [recentChanges, setRecentChanges] = useState<Array<{ id: string; action: string; entityType: string | null; entityId: string | null; createdAt: string | null }>>([]);
  const [announcementForm, setAnnouncementForm] = useState({ id: '', title: '', bodyHtml: '' });
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [invitations, setInvitations] = useState<StaffInvite[]>([]);
  const [staffRoles, setStaffRoles] = useState<Record<string, string>>({});
  const [inviteForm, setInviteForm] = useState({ email: '', firstName: '', lastName: '', staffRole: 'support' });
  const [bookingSettings, setBookingSettings] = useState({
    booking_days: '',
    booking_hours: '',
    booking_slot_minutes: '',
    booking_timezone: '',
    booking_notice: '',
  });

  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('all');
  const [status, setStatus] = useState('');
  const [pageEditor, setPageEditor] = useState({ id: '', slug: '', title: '', bodyHtml: '', seoTitle: '', seoDescription: '' });
  const [serviceForm, setServiceForm] = useState({ id: '', name: '', description: '', durationMinutes: 60, price: 0, active: false, image: '' });

  const can = useCallback(
    (permission: string) => {
      // Legacy staff without a permissions payload see the full shell; server still enforces.
      if (!user?.permissions?.length) {
        return Boolean(
          user?.isStaff || ['admin', 'moderator', 'support_admin'].includes(user?.role ?? ''),
        );
      }
      return userHasPermission(user, permission);
    },
    [user],
  );

  const navGroups = useMemo<WorkspaceNavGroup[]>(() => {
    const pending = overview?.counts.pendingReviews;
    const groups: WorkspaceNavGroup[] = [];
    for (const groupLabel of ['Overview', 'Operations', 'People', 'Website', 'Administration']) {
      const items = NAV_DEFS.filter((d) => d.group === groupLabel && can(d.permission)).map((d) => {
        const item: WorkspaceNavItem = { id: d.id, label: d.label };
        if (d.id === 'overview' || d.id === 'providers') {
          item.badge = pending;
        }
        return item;
      });
      if (items.length > 0) groups.push({ label: groupLabel, items });
    }
    return groups;
  }, [can, overview?.counts.pendingReviews]);

  const flatNav = useMemo(() => navGroups.flatMap((g) => g.items), [navGroups]);

  const activeMeta = useMemo(() => {
    const def = NAV_DEFS.find((d) => d.id === tab);
    const item = flatNav.find((n) => n.id === tab);
    return {
      label: item?.label ?? def?.label ?? 'Overview',
      group: def?.group ?? 'Overview',
    };
  }, [tab, flatNav]);

  useEffect(() => {
    if (flatNav.length === 0) return;
    if (!flatNav.some((n) => n.id === tab)) {
      setTab(flatNav[0].id);
    }
  }, [flatNav, tab]);

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

  const loadCustomerDetail = useCallback(async (id: string) => {
    const data = await apiRequest<CustomerDetail>(`/admin/customers.php?id=${encodeURIComponent(id)}`);
    setCustomerDetail(data);
    setCustomerProfile({
      firstName: data.customer.firstName,
      lastName: data.customer.lastName,
      phone: data.customer.phone,
    });
    setCustomerNote('');
  }, []);

  const loadBookingDetail = useCallback(async (id: string) => {
    const data = await apiRequest<{ booking: Booking }>(`/admin/bookings.php?id=${encodeURIComponent(id)}`);
    setBookingDetail(data.booking);
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
      if (selectedCustomerId) {
        await loadCustomerDetail(selectedCustomerId);
      }
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
      if (selectedBookingId) {
        await loadBookingDetail(selectedBookingId);
      }
      return;
    }
    if (tab === 'content') {
      const data = await apiRequest<ContentPayload>('/admin/content.php');
      setContent(data);
      return;
    }
    if (tab === 'media') {
      const data = await apiRequest<{ media: MediaAsset[] }>('/admin/media.php');
      setMedia(data.media);
      return;
    }
    if (tab === 'updates') {
      const data = await apiRequest<{
        announcements: Announcement[];
        recentChanges: Array<{ id: string; action: string; entityType: string | null; entityId: string | null; createdAt: string | null }>;
      }>('/admin/announcements.php');
      setAnnouncements(data.announcements);
      setRecentChanges(data.recentChanges);
      return;
    }
    if (tab === 'staff') {
      const data = await apiRequest<{
        staff: StaffMember[];
        invitations: StaffInvite[];
        roles: Record<string, string>;
      }>('/admin/staff.php');
      setStaff(data.staff);
      setInvitations(data.invitations);
      setStaffRoles(data.roles);
      setInviteForm((f) => (
        f.staffRole || Object.keys(data.roles).length === 0
          ? f
          : { ...f, staffRole: Object.keys(data.roles)[0] }
      ));
      return;
    }
    if (tab === 'system') {
      const [ov, cms] = await Promise.all([
        apiRequest<Overview>('/admin/overview.php'),
        apiRequest<ContentPayload>('/admin/content.php'),
      ]);
      setOverview(ov);
      setContent(cms);
      setBookingSettings({
        booking_days: cms.settings.booking_days ?? '',
        booking_hours: cms.settings.booking_hours ?? '',
        booking_slot_minutes: cms.settings.booking_slot_minutes ?? '',
        booking_timezone: cms.settings.booking_timezone ?? '',
        booking_notice: cms.settings.booking_notice ?? '',
      });
      return;
    }
    if (tab === 'audit') {
      const data = await apiRequest<{ entries: AuditEntry[] }>('/admin/audit.php');
      setAudit(data.entries);
    }
  }, [tab, search, kind, status, selectedCustomerId, selectedBookingId, loadCustomerDetail, loadBookingDetail]);

  useEffect(() => {
    run(load);
  }, [run, load]);

  const act = (fn: () => Promise<void>, message: string) =>
    run(async () => {
      await fn();
      setNotice(message);
      await load();
    });

  const openCustomer = (id: string) => {
    setNotice(null);
    setSelectedCustomerId(id);
  };

  const openBooking = (id: string) => {
    setNotice(null);
    setSelectedBookingId(id);
  };

  return (
    <WorkspaceShell
      roleLabel="Admin workspace"
      title={activeMeta.label}
      subtitle={user?.email}
      breadcrumbs={['Admin', activeMeta.group, activeMeta.label]}
      nav={flatNav}
      navGroups={navGroups}
      active={tab}
      onNavigate={(id) => {
        setNotice(null);
        setSelectedCustomerId(null);
        setCustomerDetail(null);
        setSelectedBookingId(null);
        setBookingDetail(null);
        setTab(id);
      }}
      actions={
        can('reviews.read') ? (
          <Link to="/admin/provider-reviews" className={btnGhost}>
            Provider review queue
          </Link>
        ) : null
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
        <div className="grid gap-4 lg:grid-cols-[1fr_minmax(300px,420px)]">
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
                    <tr key={c.id} className={`border-t border-[#eee7d9] ${selectedCustomerId === c.id ? 'bg-[#faf7f0]' : ''}`}>
                      <td className={td}>
                        <button type="button" className="text-left" onClick={() => openCustomer(c.id)}>
                          <p className="font-medium hover:underline">{c.name || '—'}</p>
                          <p className="text-[12px] text-[#6b6252]">{c.emailVerified ? 'Email confirmed' : 'Email unconfirmed'}</p>
                        </button>
                      </td>
                      <td className={td}><p>{c.email}</p><p className="text-[12px] text-[#6b6252]">{c.phone || '—'}</p></td>
                      <td className={td}><span className={badgeFor(c.status)}>{c.status}</span></td>
                      <td className={td}>{c.bookings} ({c.completedBookings} completed)</td>
                      <td className={td}>
                        <div className="flex flex-wrap gap-2">
                          <button className={btnGhost} onClick={() => openCustomer(c.id)}>Open</button>
                          <button className={btnGhost} disabled={busy} onClick={() => act(async () => {
                            await apiRequest('/admin/customers.php', { method: 'POST', body: JSON.stringify({ userId: c.id, action: c.status === 'suspended' ? 'activate' : 'suspend' }) });
                          }, c.status === 'suspended' ? 'Customer reactivated.' : 'Customer suspended.')}>
                            {c.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className={`${card} space-y-4 self-start`}>
            {!customerDetail ? (
              <p className="text-[13px] text-[#6b6252]">Select a customer to view bookings, notes and privacy actions.</p>
            ) : (
              <>
                <div>
                  <p className={label}>Customer</p>
                  <h2 className="mt-1 text-[16px] font-semibold">{customerDetail.customer.name || '—'}</h2>
                  <p className="text-[12.5px] text-[#6b6252]">{customerDetail.customer.email}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={badgeFor(customerDetail.customer.status)}>{customerDetail.customer.status}</span>
                    {customerDetail.customer.emailVerified ? <span className={badgeFor('verified')}>Email verified</span> : null}
                  </div>
                </div>

                <form
                  className="space-y-2 border-t border-[#eee7d9] pt-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    act(async () => {
                      await apiRequest('/admin/customers.php', {
                        method: 'POST',
                        body: JSON.stringify({
                          userId: customerDetail.customer.id,
                          action: 'update_profile',
                          ...customerProfile,
                        }),
                      });
                    }, 'Profile updated.');
                  }}
                >
                  <p className="text-[13px] font-semibold">Profile</p>
                  <input className={input} placeholder="First name" value={customerProfile.firstName} onChange={(e) => setCustomerProfile({ ...customerProfile, firstName: e.target.value })} required />
                  <input className={input} placeholder="Last name" value={customerProfile.lastName} onChange={(e) => setCustomerProfile({ ...customerProfile, lastName: e.target.value })} />
                  <input className={input} placeholder="Phone" value={customerProfile.phone} onChange={(e) => setCustomerProfile({ ...customerProfile, phone: e.target.value })} />
                  <button className={btn} type="submit" disabled={busy}>Save profile</button>
                </form>

                <div className="border-t border-[#eee7d9] pt-4">
                  <p className="text-[13px] font-semibold">Notes</p>
                  <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                    {customerDetail.notes.length === 0 ? (
                      <li className="text-[12.5px] text-[#6b6252]">No notes yet.</li>
                    ) : customerDetail.notes.map((n) => (
                      <li key={n.id} className="rounded-lg bg-[#f7f3ea] px-3 py-2 text-[12.5px]">
                        <p>{n.body}</p>
                        <p className="mt-1 text-[11px] text-[#8a7a52]">{n.author} · {n.createdAt}</p>
                      </li>
                    ))}
                  </ul>
                  <form
                    className="mt-3 space-y-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!customerNote.trim()) return;
                      act(async () => {
                        await apiRequest('/admin/customers.php', {
                          method: 'POST',
                          body: JSON.stringify({ userId: customerDetail.customer.id, action: 'add_note', body: customerNote.trim() }),
                        });
                        setCustomerNote('');
                      }, 'Note added.');
                    }}
                  >
                    <textarea className={`${input} h-24 py-2`} placeholder="Add an internal note" value={customerNote} onChange={(e) => setCustomerNote(e.target.value)} />
                    <button className={btnGhost} type="submit" disabled={busy || !customerNote.trim()}>Add note</button>
                  </form>
                </div>

                <div className="border-t border-[#eee7d9] pt-4">
                  <p className="text-[13px] font-semibold">Recent bookings</p>
                  <ul className="mt-2 max-h-36 space-y-2 overflow-y-auto text-[12.5px]">
                    {customerDetail.bookings.length === 0 ? (
                      <li className="text-[#6b6252]">No bookings.</li>
                    ) : customerDetail.bookings.slice(0, 8).map((b) => (
                      <li key={b.id} className="flex items-center justify-between gap-2">
                        <span className="truncate">{b.serviceName}</span>
                        <span className={badgeFor(b.status)}>{b.status.replace('_', ' ')}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-[#eee7d9] pt-4">
                  <button className={btnGhost} disabled={busy} onClick={() => act(async () => {
                    await apiRequest('/admin/customers.php', {
                      method: 'POST',
                      body: JSON.stringify({ userId: customerDetail.customer.id, action: 'privacy_request', requestType: 'export' }),
                    });
                  }, 'Export privacy request logged.')}>Request export</button>
                  <button className={btnGhost} disabled={busy} onClick={() => act(async () => {
                    await apiRequest('/admin/customers.php', {
                      method: 'POST',
                      body: JSON.stringify({ userId: customerDetail.customer.id, action: 'privacy_request', requestType: 'deletion' }),
                    });
                  }, 'Deletion privacy request logged.')}>Request deletion</button>
                  <button
                    className={btnGhost}
                    disabled={busy || customerDetail.customer.status === 'deleted'}
                    onClick={() => {
                      if (!window.confirm('Close this customer account? Type confirm will be sent as CLOSE.')) return;
                      act(async () => {
                        await apiRequest('/admin/customers.php', {
                          method: 'POST',
                          body: JSON.stringify({ userId: customerDetail.customer.id, action: 'close_account', confirm: 'CLOSE' }),
                        });
                      }, 'Account closed.');
                    }}
                  >
                    Close account
                  </button>
                </div>

                {customerDetail.privacyRequests.length > 0 ? (
                  <div className="border-t border-[#eee7d9] pt-4">
                    <p className="text-[13px] font-semibold">Privacy requests</p>
                    <ul className="mt-2 space-y-1 text-[12.5px]">
                      {customerDetail.privacyRequests.map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-2">
                          <span>{p.type}</span>
                          <span className={badgeFor(p.status)}>{p.status}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
          </aside>
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

      {tab === 'staff' ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div className={`${card} overflow-x-auto p-0`}>
              <table className="w-full min-w-[720px]">
                <thead className="bg-[#f2eee4]"><tr>
                  <th className={th}>Staff</th><th className={th}>Role</th><th className={th}>Status</th><th className={th}>Actions</th>
                </tr></thead>
                <tbody>
                  {staff.length === 0 ? (
                    <tr><td className={`${td} text-[#6b6252]`} colSpan={4}>No staff accounts yet.</td></tr>
                  ) : staff.map((s) => (
                    <tr key={s.userId} className="border-t border-[#eee7d9]">
                      <td className={td}><p className="font-medium">{s.name || '—'}</p><p className="text-[12px] text-[#6b6252]">{s.email}</p></td>
                      <td className={td}>
                        <select
                          className="h-11 rounded-lg border border-[#d9cfba] bg-white px-2 text-[12.5px]"
                          value={s.staffRole}
                          disabled={busy}
                          onChange={(e) => {
                            const staffRole = e.target.value;
                            act(async () => {
                              await apiRequest('/admin/staff.php', {
                                method: 'POST',
                                body: JSON.stringify({ action: 'set_role', userId: s.userId, staffRole }),
                              });
                            }, 'Staff role updated.');
                          }}
                        >
                          {Object.entries(staffRoles).map(([key, labelText]) => (
                            <option key={key} value={key}>{labelText}</option>
                          ))}
                        </select>
                      </td>
                      <td className={td}>
                        <span className={badgeFor(s.isActive ? 'active' : 'suspended')}>{s.isActive ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td className={td}>
                        <button
                          className={btnGhost}
                          disabled={busy || s.userId === user?.id}
                          onClick={() => act(async () => {
                            await apiRequest('/admin/staff.php', {
                              method: 'POST',
                              body: JSON.stringify({ action: s.isActive ? 'deactivate' : 'activate', userId: s.userId }),
                            });
                          }, s.isActive ? 'Staff deactivated.' : 'Staff reactivated.')}
                        >
                          {s.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {invitations.length > 0 ? (
              <section className={card}>
                <h2 className="text-[15px] font-semibold">Pending invitations</h2>
                <ul className="mt-3 divide-y divide-[#eee7d9]">
                  {invitations.map((inv) => (
                    <li key={inv.id} className="flex items-center justify-between gap-3 py-3 text-[13px]">
                      <div>
                        <p className="font-medium">{inv.email}</p>
                        <p className="text-[12px] text-[#6b6252]">{inv.staffRoleLabel} · expires {inv.expiresAt}</p>
                      </div>
                      <span className={badgeFor('pending')}>Pending</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <form
            className={`${card} space-y-3 self-start`}
            onSubmit={(e) => {
              e.preventDefault();
              act(async () => {
                await apiRequest('/admin/staff.php', {
                  method: 'POST',
                  body: JSON.stringify({ action: 'invite', ...inviteForm }),
                });
                setInviteForm({ email: '', firstName: '', lastName: '', staffRole: inviteForm.staffRole || 'support' });
              }, 'Invitation sent.');
            }}
          >
            <h2 className="text-[15px] font-semibold">Invite staff</h2>
            <p className="text-[12.5px] text-[#6b6252]">They receive an email with a 72-hour activation link.</p>
            <input className={input} type="email" placeholder="Email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} required />
            <input className={input} placeholder="First name" value={inviteForm.firstName} onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })} />
            <input className={input} placeholder="Last name" value={inviteForm.lastName} onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })} />
            <select className={input} value={inviteForm.staffRole} onChange={(e) => setInviteForm({ ...inviteForm, staffRole: e.target.value })}>
              {Object.entries(staffRoles).map(([key, labelText]) => (
                <option key={key} value={key}>{labelText}</option>
              ))}
            </select>
            <button className={btn} type="submit" disabled={busy}>Send invite</button>
          </form>
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
        <div className="grid gap-4 lg:grid-cols-[1fr_minmax(280px,400px)]">
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
                    <tr key={b.id} className={`border-t border-[#eee7d9] ${selectedBookingId === b.id ? 'bg-[#faf7f0]' : ''}`}>
                      <td className={td}>
                        <button type="button" className="text-left" onClick={() => openBooking(b.id)}>
                          <p className="font-medium hover:underline">{b.serviceName}</p>
                          <p className="text-[12px] text-[#6b6252]">{b.reference ?? b.id}</p>
                        </button>
                      </td>
                      <td className={td}>{b.customerName || '—'}<p className="text-[12px] text-[#6b6252]">{b.customerEmail}</p></td>
                      <td className={td}>{formatScheduledDate(b.scheduledAt)}<p className="text-[12px] text-[#6b6252]">{b.timeSlot ?? ''}</p></td>
                      <td className={td}>{b.providerName ?? 'Unassigned'}{b.teamMemberName ? <p className="text-[12px] text-[#6b6252]">{b.teamMemberName}</p> : null}</td>
                      <td className={td}><span className={badgeFor(b.status)}>{b.status.replace('_', ' ')}</span></td>
                      <td className={td}>
                        <div className="flex flex-wrap gap-2">
                          <button className={btnGhost} onClick={() => openBooking(b.id)}>Detail</button>
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className={`${card} space-y-3 self-start`}>
            {!bookingDetail ? (
              <p className="text-[13px] text-[#6b6252]">Select a booking to inspect timeline details.</p>
            ) : (
              <>
                <div>
                  <p className={label}>Booking</p>
                  <h2 className="mt-1 text-[16px] font-semibold">{bookingDetail.serviceName}</h2>
                  <p className="text-[12.5px] text-[#6b6252]">{bookingDetail.reference ?? bookingDetail.id}</p>
                  <div className="mt-2"><span className={badgeFor(bookingDetail.status)}>{bookingDetail.status.replace('_', ' ')}</span></div>
                </div>
                <dl className="space-y-2 text-[13px]">
                  <div><dt className={label}>Customer</dt><dd className="mt-1">{bookingDetail.customerName || '—'}<br /><span className="text-[12px] text-[#6b6252]">{bookingDetail.customerEmail} · {bookingDetail.customerPhone || '—'}</span></dd></div>
                  <div><dt className={label}>When</dt><dd className="mt-1">{formatScheduledDate(bookingDetail.scheduledAt)} · {bookingDetail.timeSlot || '—'}</dd></div>
                  <div><dt className={label}>Location</dt><dd className="mt-1">{bookingDetail.locationType || '—'}{bookingDetail.address ? ` · ${bookingDetail.address}` : ''}</dd></div>
                  <div><dt className={label}>Provider</dt><dd className="mt-1">{bookingDetail.providerName ?? 'Unassigned'}{bookingDetail.teamMemberName ? ` · ${bookingDetail.teamMemberName}` : ''}</dd></div>
                  <div><dt className={label}>Price</dt><dd className="mt-1">{bookingDetail.currency} {bookingDetail.price.toLocaleString()}</dd></div>
                </dl>
                {bookingDetail.events && bookingDetail.events.length > 0 ? (
                  <div className="border-t border-[#eee7d9] pt-3">
                    <p className="text-[13px] font-semibold">Timeline</p>
                    <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto text-[12.5px]">
                      {bookingDetail.events.map((ev, idx) => (
                        <li key={`${ev.event}-${idx}`} className="rounded-lg bg-[#f7f3ea] px-3 py-2">
                          <p className="font-medium">{ev.event}</p>
                          <p className="text-[#6b6252]">{ev.fromStatus ?? '—'} → {ev.toStatus ?? '—'} · {ev.createdAt}</p>
                          {ev.note ? <p className="mt-1">{ev.note}</p> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
          </aside>
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
                    <div className="flex flex-col items-end gap-2">
                      <span className={badgeFor(f.active ? 'active' : 'pending')}>{f.active ? 'Active' : 'Hidden'}</span>
                      <button
                        type="button"
                        className={btnGhost}
                        disabled={busy}
                        onClick={() => act(async () => {
                          await apiRequest('/admin/content.php', {
                            method: 'POST',
                            body: JSON.stringify({ action: 'delete_faq', id: f.id }),
                          });
                        }, 'FAQ deleted.')}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <form
                className="mt-4 space-y-2 border-t border-[#eee7d9] pt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const data = new FormData(form);
                  const question = String(data.get('question') ?? '').trim();
                  const answer = String(data.get('answer') ?? '').trim();
                  if (!question || !answer) return;
                  act(async () => {
                    await apiRequest('/admin/content.php', {
                      method: 'POST',
                      body: JSON.stringify({ action: 'save_faq', question, answer, active: true, sortOrder: content.faqs.length }),
                    });
                    form.reset();
                  }, 'FAQ saved.');
                }}
              >
                <h3 className="text-[13px] font-semibold">Add FAQ</h3>
                <input className={input} name="question" placeholder="Question" required />
                <textarea className={`${input} h-24 py-2`} name="answer" placeholder="Answer" required />
                <button type="submit" className={btn} disabled={busy}>Save FAQ</button>
              </form>
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

      {tab === 'media' ? (
        <div className="space-y-4">
          <form
            className={`${card} flex flex-wrap items-end gap-3`}
            onSubmit={(e) => {
              e.preventDefault();
              const fileInput = e.currentTarget.elements.namedItem('file') as HTMLInputElement | null;
              const file = fileInput?.files?.[0];
              if (!file) {
                setError('Choose an image to upload.');
                return;
              }
              const form = new FormData();
              form.append('file', file);
              act(async () => {
                await apiRequest('/admin/media.php', { method: 'POST', body: form });
                if (fileInput) fileInput.value = '';
              }, 'Image uploaded.');
            }}
          >
            <label className="min-w-[220px] flex-1 text-[12px] font-medium text-[#6b6252]">
              Upload image (JPEG, PNG or WebP · max 5MB)
              <input name="file" type="file" accept="image/jpeg,image/png,image/webp" className={`${input} mt-1 py-2`} />
            </label>
            <button className={btn} type="submit" disabled={busy}>Upload</button>
          </form>

          {media.length === 0 ? (
            <p className={`${card} text-[13px] text-[#6b6252]`}>No media yet. Upload images for services and pages.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {media.map((m) => (
                <article key={m.id} className={`${card} space-y-3 p-3`}>
                  <div className="aspect-[4/3] overflow-hidden rounded-xl bg-[#f2eee4]">
                    <img src={m.url} alt={m.altText || m.filename} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <p className="truncate text-[13px] font-medium">{m.filename}</p>
                    <p className="text-[11.5px] text-[#6b6252]">{Math.round(m.sizeBytes / 1024)} KB · {m.mime}</p>
                    <button
                      type="button"
                      className="mt-1 text-[12px] font-semibold text-[#8a6a1f] hover:underline"
                      onClick={() => {
                        void navigator.clipboard?.writeText(m.url);
                        setNotice('URL copied.');
                      }}
                    >
                      Copy URL
                    </button>
                  </div>
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const alt = new FormData(e.currentTarget).get('altText');
                      act(async () => {
                        await apiRequest('/admin/media.php', {
                          method: 'PATCH',
                          body: JSON.stringify({ id: m.id, altText: String(alt ?? '') }),
                        });
                      }, 'Alt text saved.');
                    }}
                  >
                    <input name="altText" defaultValue={m.altText} className={input} placeholder="Alt text" aria-label={`Alt text for ${m.filename}`} />
                    <button className={btnGhost} type="submit" disabled={busy}>Save</button>
                  </form>
                  <button
                    className={btnGhost}
                    disabled={busy}
                    onClick={() => act(async () => {
                      await apiRequest('/admin/media.php', { method: 'DELETE', body: JSON.stringify({ id: m.id }) });
                    }, 'Media deleted.')}
                  >
                    Delete
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === 'updates' ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <section className={`${card} overflow-x-auto p-0`}>
              <div className="px-5 py-4"><h2 className="text-[15px] font-semibold">Announcements</h2></div>
              <table className="w-full min-w-[640px]">
                <thead className="bg-[#f2eee4]"><tr><th className={th}>Title</th><th className={th}>Status</th><th className={th}>Updated</th><th className={th}>Actions</th></tr></thead>
                <tbody>
                  {announcements.length === 0 ? (
                    <tr><td className={`${td} text-[#6b6252]`} colSpan={4}>No announcements yet.</td></tr>
                  ) : announcements.map((a) => (
                    <tr key={a.id} className="border-t border-[#eee7d9]">
                      <td className={td}>
                        <button type="button" className="text-left font-medium hover:underline" onClick={() => setAnnouncementForm({ id: a.id, title: a.title, bodyHtml: a.bodyHtml })}>
                          {a.title}
                        </button>
                      </td>
                      <td className={td}><span className={badgeFor(a.status)}>{a.status}</span></td>
                      <td className={td}>{a.updatedAt ?? a.createdAt ?? '—'}</td>
                      <td className={td}>
                        <div className="flex flex-wrap gap-2">
                          <button className={btnGhost} disabled={busy} onClick={() => act(async () => {
                            await apiRequest('/admin/announcements.php', {
                              method: 'POST',
                              body: JSON.stringify({ action: a.status === 'published' ? 'unpublish' : 'publish', id: a.id }),
                            });
                          }, a.status === 'published' ? 'Announcement unpublished.' : 'Announcement published.')}>
                            {a.status === 'published' ? 'Unpublish' : 'Publish'}
                          </button>
                          <button className={btnGhost} disabled={busy} onClick={() => act(async () => {
                            await apiRequest('/admin/announcements.php', { method: 'POST', body: JSON.stringify({ action: 'delete', id: a.id }) });
                            if (announcementForm.id === a.id) setAnnouncementForm({ id: '', title: '', bodyHtml: '' });
                          }, 'Announcement deleted.')}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className={card}>
              <h2 className="text-[15px] font-semibold">Recent CMS changes</h2>
              {recentChanges.length === 0 ? (
                <p className="mt-2 text-[13px] text-[#6b6252]">No recent content, media or service changes.</p>
              ) : (
                <ul className="mt-3 divide-y divide-[#eee7d9]">
                  {recentChanges.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                      <span className="truncate">{c.action}{c.entityType ? ` · ${c.entityType}` : ''}</span>
                      <span className="shrink-0 text-[12px] text-[#6b6252]">{c.createdAt}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <form
            className={`${card} space-y-3 self-start`}
            onSubmit={(e) => {
              e.preventDefault();
              act(async () => {
                await apiRequest('/admin/announcements.php', {
                  method: 'POST',
                  body: JSON.stringify({ action: 'save', ...announcementForm }),
                });
                setAnnouncementForm({ id: '', title: '', bodyHtml: '' });
              }, 'Announcement saved.');
            }}
          >
            <h2 className="text-[15px] font-semibold">{announcementForm.id ? 'Edit announcement' : 'New announcement'}</h2>
            <input className={input} placeholder="Title" value={announcementForm.title} onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })} required />
            <textarea className={`${input} h-40 py-2`} placeholder="Body HTML" value={announcementForm.bodyHtml} onChange={(e) => setAnnouncementForm({ ...announcementForm, bodyHtml: e.target.value })} />
            <button className={btn} type="submit" disabled={busy}>Save draft</button>
            {announcementForm.id ? (
              <button type="button" className={btnGhost} onClick={() => setAnnouncementForm({ id: '', title: '', bodyHtml: '' })}>Clear</button>
            ) : null}
          </form>
        </div>
      ) : null}

      {tab === 'system' && overview ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className={card}>
            <h2 className="text-[15px] font-semibold">Email delivery</h2>
            <p className="mt-2 text-[13px] text-[#6b6252]">
              Transport: <strong>{overview.mail.transport}</strong> ·{' '}
              {overview.mail.configured ? 'configured' : 'not configured'}
            </p>
            {overview.mail.missing.length > 0 ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">
                Missing keys: {overview.mail.missing.join(', ')}. Values are never shown here.
              </p>
            ) : (
              <p className="mt-3 text-[12.5px] text-emerald-800">All required SMTP keys are present. Values stay server-side.</p>
            )}
          </section>

          <form
            className={`${card} space-y-3`}
            onSubmit={(e) => {
              e.preventDefault();
              act(async () => {
                await apiRequest('/admin/content.php', {
                  method: 'POST',
                  body: JSON.stringify({ action: 'save_settings', settings: bookingSettings }),
                });
              }, 'Booking settings saved.');
            }}
          >
            <h2 className="text-[15px] font-semibold">Booking settings</h2>
            <p className="text-[12.5px] text-[#6b6252]">
              Controls public availability. Empty values keep the booking UI honest instead of inventing slots.
            </p>
            {([
              ['booking_days', 'Working days'],
              ['booking_hours', 'Opening hours'],
              ['booking_slot_minutes', 'Slot length (minutes)'],
              ['booking_timezone', 'Timezone'],
            ] as const).map(([key, labelText]) => (
              <label key={key} className="block text-[12px] font-medium text-[#6b6252]">
                {labelText}
                <input
                  className={`${input} mt-1`}
                  value={bookingSettings[key]}
                  onChange={(e) => setBookingSettings({ ...bookingSettings, [key]: e.target.value })}
                />
              </label>
            ))}
            <label className="block text-[12px] font-medium text-[#6b6252]">
              Booking notice
              <textarea
                className={`${input} mt-1 h-24 py-2`}
                value={bookingSettings.booking_notice}
                onChange={(e) => setBookingSettings({ ...bookingSettings, booking_notice: e.target.value })}
              />
            </label>
            <button className={btn} type="submit" disabled={busy}>Save booking settings</button>
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
