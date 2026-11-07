import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  CalendarDays,
  ClipboardList,
  Inbox,
  MapPin,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { formatScheduledDate } from '../../lib/dates';
import { useAuth } from '../../auth/AuthContext';
import { userHasPermission } from '../../lib/workspaceHome';
import { MARKETPLACE_REGIONS } from '../../data/locations';
import {
  AdminAssignmentsPanel,
  AdminCard,
  AdminCardHeader,
  AdminProviderDetail,
  UndoBar,
  type AssignmentRow,
  type ReversibleAction,
  AdminShell,
  DataCell,
  DataRow,
  DataTable,
  DetailPanel,
  EmptyState,
  FormField,
  RowMenu,
  SearchInput,
  StatCard,
  StatusBadge,
  adminBtnClass,
  adminBtnGhostClass,
  adminBtnGhostCompactClass,
  adminInputClass,
  type AdminNavGroup,
  type AdminNavItem,
} from '../../components/admin';

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

type CustomerLocation = {
  country: string;
  region: string | null;
  district: string | null;
  city: string | null;
  area: string | null;
  description: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type NearbyProvider = {
  providerProfileId: string;
  providerUserId: string;
  displayName: string;
  providerKind: string;
  region: string | null;
  city: string | null;
  area: string | null;
  distanceKm: number | null;
  distancePrecision: string;
  matchedArea: string | null;
  offersHomeVisit: boolean;
  offersStudio: boolean;
  services: string[];
  reasons: string[];
};

type CustomerDetail = {
  customer: Customer & { firstName: string; lastName: string; updatedAt: string | null; isQa?: boolean };
  location?: CustomerLocation | null;
  bookings: Booking[];
  notes: Array<{ id: string; body: string; createdAt: string | null; author: string }>;
  privacyRequests: Array<{ id: string; type: string; status: string; notes: string | null; createdAt: string | null; resolvedAt: string | null }>;
  activity?: Array<{ id: string; action: string; meta: Record<string, unknown> | null; actor: string | null; createdAt: string | null }>;
  paymentNote?: string;
};

type Provider = {
  userId: string; profileId: string | null; displayName: string; email: string; phone: string;
  kind: string; city: string; region?: string; district?: string | null; area?: string | null;
  slug: string | null; accountStatus: string; emailVerified: boolean;
  verificationStatus: string; identityStatus: string; rejectionReason: string | null;
  published: boolean; submittedAt: string | null; removed?: boolean; listingStatus?: string;
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
  cancellationReason?: string | null; paymentNote?: string | null;
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

type NavDef = AdminNavItem & { permission: string; group: string };

const NAV_DEFS: NavDef[] = [
  { id: 'overview', label: 'Overview', permission: 'dashboard.read', group: 'Overview' },
  { id: 'bookings', label: 'Bookings', permission: 'bookings.read', group: 'Operations' },
  { id: 'services', label: 'Services', permission: 'services.read', group: 'Operations' },
  { id: 'customers', label: 'Customers', permission: 'customers.read', group: 'People' },
  { id: 'providers', label: 'Providers', permission: 'providers.read', group: 'People' },
  { id: 'agencies', label: 'Agencies', permission: 'providers.read', group: 'People' },
  { id: 'assignments', label: 'Assignments', permission: 'assignments.read', group: 'Operations' },
  { id: 'staff', label: 'Staff', permission: 'staff.read', group: 'People' },
  { id: 'content', label: 'Content', permission: 'content.read', group: 'Website' },
  { id: 'media', label: 'Media', permission: 'media.read', group: 'Website' },
  { id: 'updates', label: 'Updates', permission: 'content.read', group: 'Website' },
  { id: 'system', label: 'System', permission: 'system.read', group: 'Administration' },
  { id: 'audit', label: 'Audit', permission: 'audit.read', group: 'Administration' },
];

const PAGE_COPY: Record<string, { title: string; subtitle: string }> = {
  overview: {
    title: 'Overview',
    subtitle: 'A high-level view of your platform, providers, bookings, and operations.',
  },
  bookings: {
    title: 'Bookings',
    subtitle: 'Review requests, update statuses, and inspect booking timelines.',
  },
  services: {
    title: 'Services',
    subtitle: 'Manage the massage services shown on the public website.',
  },
  customers: {
    title: 'Customers',
    subtitle: 'Look up accounts, notes, privacy requests and booking history.',
  },
  providers: {
    title: 'Providers',
    subtitle: 'Publish, suspend and review provider profiles with care.',
  },
  agencies: {
    title: 'Agencies',
    subtitle: 'Manage agency profiles, publication, verification and their professional teams.',
  },
  assignments: {
    title: 'Assignments',
    subtitle: 'Assign customers to verified providers. Assignments are operational, never paid bookings.',
  },
  staff: {
    title: 'Staff',
    subtitle: 'Invite teammates and manage workspace roles.',
  },
  content: {
    title: 'Content',
    subtitle: 'Edit pages, FAQs and website settings for Massager Studio.',
  },
  media: {
    title: 'Media',
    subtitle: 'Upload and organise images for services and pages.',
  },
  updates: {
    title: 'Updates',
    subtitle: 'Draft announcements and review recent CMS changes.',
  },
  system: {
    title: 'System',
    subtitle: 'Delivery health and booking schedule configuration.',
  },
  audit: {
    title: 'Audit',
    subtitle: 'A chronological record of staff actions in this workspace.',
  },
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'MS';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

const BookingDonut: React.FC<{ data: Record<string, number> }> = ({ data }) => {
  const keys = ['pending', 'confirmed', 'reschedule_requested', 'completed'] as const;
  const colors = ['#C9A56A', '#B08B4B', '#8F6D35', '#161616'];
  const values = keys.map((k) => data[k] ?? 0);
  const total = values.reduce((a, b) => a + b, 0);
  const size = 148;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#efe8dc" strokeWidth={stroke} />
          {total > 0
            ? values.map((value, i) => {
                if (value <= 0) return null;
                const len = (value / total) * c;
                const el = (
                  <circle
                    key={keys[i]}
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={colors[i]}
                    strokeWidth={stroke}
                    strokeDasharray={`${len} ${c - len}`}
                    strokeDashoffset={-offset}
                    strokeLinecap="butt"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  />
                );
                offset += len;
                return el;
              })
            : null}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="font-display text-[28px] font-semibold leading-none text-[#161616]">{total}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7a52]">Total</p>
          </div>
        </div>
      </div>
      <ul className="w-full space-y-2 text-[13px]">
        {keys.map((key, i) => (
          <li key={key} className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-[#3f3a33]">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[i] }} />
              {key.replace(/_/g, ' ')}
            </span>
            <span className="font-semibold tabular-nums text-[#161616]">{values[i]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const AdminWorkspacePage: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [overview, setOverview] = useState<Overview | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(null);
  const [customerTab, setCustomerTab] = useState('overview');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerNote, setCustomerNote] = useState('');
  const [customerProfile, setCustomerProfile] = useState({ firstName: '', lastName: '', phone: '' });
  const [customerLocation, setCustomerLocation] = useState<CustomerLocation | null>(null);
  const [customerLocationForm, setCustomerLocationForm] = useState({
    region: '', district: '', city: '', area: '', description: '', latitude: '', longitude: '',
  });
  const [nearbyProviders, setNearbyProviders] = useState<NearbyProvider[]>([]);
  const [nearbyRadius, setNearbyRadius] = useState('20');
  const [nearbyNote, setNearbyNote] = useState<string | null>(null);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [locationRegion, setLocationRegion] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<ReversibleAction | null>(null);
  const [assignCustomerId, setAssignCustomerId] = useState<string | null>(null);
  const [assignmentsRefresh, setAssignmentsRefresh] = useState(0);
  const [customerAssignments, setCustomerAssignments] = useState<AssignmentRow[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingDetail, setBookingDetail] = useState<Booking | null>(null);
  const [bookingProviders, setBookingProviders] = useState<Provider[]>([]);
  const [bookingProviderId, setBookingProviderId] = useState('');
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
  const [providerVerification, setProviderVerification] = useState('all');
  const [providerPublication, setProviderPublication] = useState('all');
  const [providerAccount, setProviderAccount] = useState('all');
  const [status, setStatus] = useState('');
  const [pageEditor, setPageEditor] = useState({ id: '', slug: '', title: '', bodyHtml: '', seoTitle: '', seoDescription: '' });
  const [serviceForm, setServiceForm] = useState({ id: '', name: '', description: '', durationMinutes: 60, price: 0, active: false, image: '' });

  const can = useCallback(
    (permission: string) => {
      if (!user?.permissions?.length) {
        return Boolean(
          user?.isStaff || ['admin', 'moderator', 'support_admin'].includes(user?.role ?? ''),
        );
      }
      return userHasPermission(user, permission);
    },
    [user],
  );

  const navGroups = useMemo<AdminNavGroup[]>(() => {
    const pending = overview?.counts.pendingReviews;
    const groups: AdminNavGroup[] = [];
    for (const groupLabel of ['Overview', 'Operations', 'People', 'Website', 'Administration']) {
      const items = NAV_DEFS.filter((d) => d.group === groupLabel && can(d.permission)).map((d) => {
        const item: AdminNavItem = { id: d.id, label: d.label };
        if (d.id === 'providers' || d.id === 'overview') item.badge = pending;
        return item;
      });
      if (items.length > 0) groups.push({ label: groupLabel, items });
    }
    return groups;
  }, [can, overview?.counts.pendingReviews]);

  const flatNav = useMemo(() => navGroups.flatMap((g) => g.items), [navGroups]);

  const activeMeta = useMemo(() => {
    const def = NAV_DEFS.find((d) => d.id === tab);
    const copy = PAGE_COPY[tab] ?? { title: def?.label ?? 'Overview', subtitle: '' };
    return { ...copy, group: def?.group ?? 'Overview' };
  }, [tab]);

  useEffect(() => {
    if (flatNav.length === 0) return;
    if (!flatNav.some((n) => n.id === tab)) setTab(flatNav[0].id);
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
    const [data, assignments] = await Promise.all([
      apiRequest<CustomerDetail>(`/admin/customers.php?id=${encodeURIComponent(id)}`),
      apiRequest<{ assignments: AssignmentRow[] }>(`/admin/assignments.php?customerId=${encodeURIComponent(id)}`).catch(() => ({ assignments: [] })),
    ]);
    setCustomerDetail(data);
    setCustomerAssignments(assignments.assignments);
    setCustomerProfile({
      firstName: data.customer.firstName,
      lastName: data.customer.lastName,
      phone: data.customer.phone,
    });
    const location = data.location ?? null;
    setCustomerLocation(location);
    setCustomerLocationForm({
      region: location?.region ?? '',
      district: location?.district ?? '',
      city: location?.city ?? '',
      area: location?.area ?? '',
      description: location?.description ?? '',
      latitude: location?.latitude != null ? String(location.latitude) : '',
      longitude: location?.longitude != null ? String(location.longitude) : '',
    });
    setNearbyProviders([]);
    setNearbyNote(null);
    setCustomerNote('');
  }, []);

  const loadNearby = async (customerId: string, radius: string) => {
    setNearbyLoading(true);
    setNearbyNote(null);
    try {
      const data = await apiRequest<{ recommendations: NearbyProvider[]; note: string | null }>(
        `/admin/locations.php?customerId=${encodeURIComponent(customerId)}&nearby=1&radiusKm=${encodeURIComponent(radius)}`,
      );
      setNearbyProviders(data.recommendations ?? []);
      setNearbyNote(data.note ?? null);
    } catch (err) {
      setNearbyProviders([]);
      setNearbyNote(err instanceof Error ? err.message : 'Unable to load nearby providers.');
    } finally {
      setNearbyLoading(false);
    }
  };

  const loadBookingDetail = useCallback(async (id: string) => {
    const data = await apiRequest<{ booking: Booking }>(`/admin/bookings.php?id=${encodeURIComponent(id)}`);
    setBookingDetail(data.booking);
  }, []);

  const load = useCallback(async () => {
    if (tab === 'overview') {
      setOverview(await apiRequest<Overview>('/admin/overview.php'));
      return;
    }
    if (tab === 'customers') {
      const locationQuery = `&region=${encodeURIComponent(locationRegion)}&city=${encodeURIComponent(locationCity)}`;
      const data = await apiRequest<{ customers: Customer[] }>(`/admin/customers.php?q=${encodeURIComponent(search)}${locationQuery}`);
      setCustomers(data.customers);
      if (selectedCustomerId) await loadCustomerDetail(selectedCustomerId);
      return;
    }
    if (tab === 'providers' || tab === 'agencies') {
      const effectiveKind = tab === 'agencies' ? 'agency' : kind;
      const locationQuery = `&region=${encodeURIComponent(locationRegion)}&city=${encodeURIComponent(locationCity)}`;
      const data = await apiRequest<{ providers: Provider[] }>(`/admin/providers.php?kind=${effectiveKind}&q=${encodeURIComponent(search)}${locationQuery}`);
      setProviders(data.providers);
      return;
    }
    if (tab === 'services') {
      setServices((await apiRequest<{ services: Service[] }>('/admin/services.php')).services);
      return;
    }
    if (tab === 'bookings') {
      const data = await apiRequest<{ bookings: Booking[] }>(`/admin/bookings.php?status=${encodeURIComponent(status)}&q=${encodeURIComponent(bookingSearch)}`);
      setBookings(data.bookings);
      if (selectedBookingId) await loadBookingDetail(selectedBookingId);
      return;
    }
    if (tab === 'content') {
      setContent(await apiRequest<ContentPayload>('/admin/content.php'));
      return;
    }
    if (tab === 'media') {
      setMedia((await apiRequest<{ media: MediaAsset[] }>('/admin/media.php')).media);
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
      setInviteForm((f) => (f.staffRole || Object.keys(data.roles).length === 0 ? f : { ...f, staffRole: Object.keys(data.roles)[0] }));
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
      setAudit((await apiRequest<{ entries: AuditEntry[] }>('/admin/audit.php')).entries);
    }
  }, [tab, search, kind, status, bookingSearch, selectedCustomerId, selectedBookingId, loadCustomerDetail, loadBookingDetail, locationRegion, locationCity]);

  useEffect(() => {
    run(load);
  }, [run, load]);

  const act = (fn: () => Promise<void>, message: string) =>
    run(async () => {
      await fn();
      setNotice(message);
      await load();
      try {
        const latest = await apiRequest<{ actions: ReversibleAction[] }>('/admin/actions.php?limit=1');
        setLastAction(latest.actions[0] ?? null);
      } catch {
        setLastAction(null);
      }
    });

  const openCustomer = (id: string) => {
    setNotice(null);
    setCustomerTab('overview');
    setSelectedCustomerId(id);
  };

  const openBooking = (id: string) => {
    setNotice(null);
    setBookingProviderId('');
    setSelectedBookingId(id);
    if (bookingProviders.length === 0) {
      void apiRequest<{ providers: Provider[] }>('/admin/providers.php')
        .then((data) => setBookingProviders(data.providers))
        .catch(() => setBookingProviders([]));
    }
  };

  const visibleProviders = providers.filter((p) => {
    if (providerVerification !== 'all' && p.verificationStatus !== providerVerification) return false;
    if (providerPublication === 'published' && !p.published) return false;
    if (providerPublication === 'unpublished' && p.published) return false;
    if (providerPublication === 'removed' && !p.removed) return false;
    if (providerAccount !== 'all' && p.accountStatus !== providerAccount) return false;
    return true;
  });

  return (
    <AdminShell
      title={activeMeta.title}
      subtitle={activeMeta.subtitle}
      breadcrumbs={
        activeMeta.group === activeMeta.title
          ? ['Admin', activeMeta.title]
          : ['Admin', activeMeta.group, activeMeta.title]
      }
      navGroups={navGroups}
      active={tab}
      globalSearch={search}
      onGlobalSearchChange={setSearch}
      onNavigate={(id) => {
        if (id === 'agencies') setKind('agency');
        if (id === 'providers') setKind('all');
        setNotice(null);
        setLastAction(null);
        setSelectedCustomerId(null);
        setCustomerDetail(null);
        setSelectedProviderId(null);
        setSelectedBookingId(null);
        setBookingDetail(null);
        setTab(id);
      }}
      headerActions={
        can('reviews.read') ? (
          <Link to="/admin/provider-reviews" className={adminBtnGhostClass}>
            Open review queue
          </Link>
        ) : null
      }
    >
      {error ? <div role="alert" className="mb-4 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">{error}</div> : null}
      {notice ? (
        <UndoBar
          message={notice}
          action={lastAction}
          onReversed={(message, action) => {
            setNotice(message);
            setLastAction(action);
            setAssignmentsRefresh((n) => n + 1);
            void run(load);
          }}
        />
      ) : null}
      {busy ? <div className="mb-4 h-1 w-full overflow-hidden rounded-full bg-[#e8e0d2]"><div className="h-full w-1/3 animate-pulse bg-[#B08B4B]" /></div> : null}

      {tab === 'overview' && overview ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <StatCard title="Customers" value={overview.counts.customers} icon={Users} />
            <StatCard title="Individual Providers" value={overview.counts.individualProviders} icon={UserRound} />
            <StatCard title="Agencies" value={overview.counts.agencies} icon={Building2} />
            <StatCard title="Bookings" value={overview.counts.bookings} icon={CalendarDays} />
            <StatCard title="Active Services" value={overview.counts.activeServices} icon={Sparkles} />
            <StatCard title="Completed Value" value={`GHS ${overview.counts.revenueCompleted.toLocaleString()}`} icon={ClipboardList} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <AdminCard>
              <AdminCardHeader
                title="Provider Review Queue"
                subtitle="Providers awaiting verification and approval."
                action={
                  <Link to="/admin/provider-reviews" className="text-[13px] font-semibold text-[#8F6D35] hover:underline">
                    Open queue →
                  </Link>
                }
              />
              {overview.tasks.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title="No more providers in queue"
                  description="New submissions will appear here after a provider requests review."
                  className="py-10"
                />
              ) : (
                <ul className="divide-y divide-[#efe8dc]">
                  {overview.tasks.map((task) => (
                    <li key={task.providerUserId} className="flex items-center gap-3 py-3.5">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#161616] text-[12px] font-semibold text-[#F7F4EF]">
                        {initials(task.displayName)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-[#161616]">{task.displayName}</p>
                        <p className="text-[12.5px] text-[#6f675c]">{task.providerType} · {task.city || '—'}</p>
                      </div>
                      <StatusBadge status={task.status} />
                    </li>
                  ))}
                  {overview.tasks.length === 1 ? (
                    <li className="pt-4">
                      <EmptyState
                        icon={Inbox}
                        title="No more providers in queue"
                        description="This is the only submission waiting for review."
                        className="py-6"
                      />
                    </li>
                  ) : null}
                </ul>
              )}
            </AdminCard>

            <AdminCard>
              <AdminCardHeader title="Booking Summary" subtitle="Live counts by status from your database." />
              <BookingDonut data={overview.bookingsByStatus} />
            </AdminCard>
          </div>

          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            <AdminCard className="min-w-0">
              <AdminCardHeader title="Recent Activity" subtitle="Real booking events from the platform." />
              {overview.recentBookings.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="No recent activity yet."
                  description="Bookings and operational events will appear here as they happen."
                  className="py-8"
                />
              ) : (
                <ul className="divide-y divide-[#efe8dc]">
                  {overview.recentBookings.map((b) => (
                    <li key={b.id} className="flex items-center justify-between gap-3 py-3 text-[13.5px]">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[#161616]">{b.serviceName}</p>
                        <p className="text-[12px] text-[#6f675c]">{b.customerName || 'Customer'} · {formatScheduledDate(b.scheduledAt)}</p>
                      </div>
                      <StatusBadge status={b.status} />
                    </li>
                  ))}
                </ul>
              )}
            </AdminCard>

            <AdminCard>
              <AdminCardHeader title="Insights" subtitle="Current totals calculated from live records." />
              <ul className="space-y-3">
                {[
                  ['Pending reviews', overview.counts.pendingReviews],
                  ['Published providers', overview.counts.publishedProviders],
                  ['Active services', overview.counts.activeServices],
                  ['Total bookings', overview.counts.bookings],
                  ['Unverified customer emails', overview.counts.unverifiedEmails],
                ].map(([label, value]) => (
                  <li key={String(label)} className="flex items-center justify-between rounded-[14px] border border-[#efe8dc] bg-[#faf7f2] px-4 py-3">
                    <span className="text-[13.5px] text-[#3f3a33]">{label}</span>
                    <span className="font-display text-[22px] font-semibold text-[#161616]">{value}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[12.5px] text-[#6f675c]">
                Email transport: <strong>{overview.mail.transport}</strong>
                {overview.mail.configured ? ' · configured' : ' · not configured'}
              </p>
            </AdminCard>
          </div>
        </div>
      ) : null}

      {tab === 'customers' ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-5">
          <AdminCard padding={false} className="min-w-0 max-w-full overflow-hidden">
            <div className="flex flex-wrap gap-2 border-b border-[#efe8dc] p-4">
              <SearchInput className="min-w-0 flex-1 basis-[180px]" value={search} onChange={setSearch} placeholder="Search name, email or phone" onSubmit={() => run(load)} />
              <select className={`${adminInputClass} w-[150px] shrink-0`} aria-label="Customer region" value={locationRegion} onChange={(e) => setLocationRegion(e.target.value)}>
                <option value="">All regions</option>
                {MARKETPLACE_REGIONS.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
              </select>
              <input className={`${adminInputClass} w-[140px] shrink-0`} aria-label="Customer city" placeholder="City / town" value={locationCity} onChange={(e) => setLocationCity(e.target.value)} />
              <button className={adminBtnClass} onClick={() => run(load)} disabled={busy}>Search</button>
            </div>
            <DataTable
              headers={['Customer', 'Email', 'Phone', 'Account', 'Joined', '']}
              empty={customers.length === 0}
              emptyIcon={Users}
              emptyTitle="No customers yet."
              emptyDescription="Customer accounts will appear here after registration."
              minWidth="720px"
            >
              {customers.map((c) => (
                <DataRow key={c.id} selected={selectedCustomerId === c.id}>
                  <DataCell className="w-[22%]">
                    <button type="button" className="min-w-0 max-w-full text-left" onClick={() => openCustomer(c.id)}>
                      <p className="truncate font-semibold hover:underline">{c.name || '—'}</p>
                      <p className="text-[12px] text-[#6f675c]">{c.emailVerified ? 'Email confirmed' : 'Email unconfirmed'}</p>
                    </button>
                  </DataCell>
                  <DataCell truncate title={c.email}>{c.email}</DataCell>
                  <DataCell truncate title={c.phone || undefined}>{c.phone || '—'}</DataCell>
                  <DataCell><StatusBadge status={c.status} /></DataCell>
                  <DataCell className="whitespace-nowrap">{c.createdAt ? formatScheduledDate(c.createdAt) : '—'}</DataCell>
                  <DataCell className="w-[1%] whitespace-nowrap">
                    <RowMenu
                      primaryLabel="Open"
                      primaryVariant="ghost"
                      onPrimary={() => openCustomer(c.id)}
                      items={[
                        {
                          label: c.status === 'suspended' ? 'Reactivate' : 'Suspend',
                          disabled: busy,
                          onClick: () => {
                            void act(async () => {
                              await apiRequest('/admin/customers.php', {
                                method: 'POST',
                                body: JSON.stringify({
                                  userId: c.id,
                                  action: c.status === 'suspended' ? 'activate' : 'suspend',
                                }),
                              });
                            }, c.status === 'suspended' ? 'Customer reactivated.' : 'Customer suspended.');
                          },
                        },
                        {
                          label: c.status === 'banned' ? 'Unblock account' : 'Block account',
                          disabled: busy || c.status === 'deleted',
                          onClick: () => {
                            if (c.status !== 'banned' && !window.confirm('Block this customer account?')) return;
                            const reason = window.prompt(c.status === 'banned' ? 'Unblock note (optional)' : 'Block reason (required)') ?? '';
                            if (c.status !== 'banned' && reason.trim() === '') return;
                            void act(async () => {
                              await apiRequest('/admin/customers.php', {
                                method: 'POST',
                                body: JSON.stringify({
                                  userId: c.id,
                                  action: c.status === 'banned' ? 'unblock' : 'block',
                                  reason: reason.trim(),
                                }),
                              });
                            }, c.status === 'banned' ? 'Customer unblocked.' : 'Customer blocked.');
                          },
                        },
                      ]}
                    />
                  </DataCell>
                </DataRow>
              ))}
            </DataTable>
          </AdminCard>

          <DetailPanel
            open={Boolean(customerDetail)}
            title={customerDetail?.customer.name || 'Customer'}
            emptyIcon={Users}
            emptyTitle="Select a customer"
            emptyDescription="View bookings, notes and privacy actions."
            onClose={() => { setSelectedCustomerId(null); setCustomerDetail(null); }}
          >
            {customerDetail ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={customerDetail.customer.status} />
                  {customerDetail.customer.emailVerified ? <StatusBadge status="verified" label="Email verified" /> : null}
                  {customerDetail.customer.isQa ? <StatusBadge status="pending" label="QA account" /> : null}
                </div>
                <p className="truncate text-[13px] text-[#6f675c]" title={customerDetail.customer.email}>{customerDetail.customer.email}</p>

                <div className="-mx-1 flex gap-1 overflow-x-auto border-b border-[#efe8dc] pb-2" role="tablist" aria-label="Customer sections">
                  {[
                    ['overview', 'Overview'],
                    ['profile', 'Customer Profile'],
                    ['location', 'Location'],
                    ['bookings', 'Bookings'],
                    ['assigned', 'Assigned Providers'],
                    ['payments', 'Payments'],
                    ['notes', 'Internal Notes'],
                    ['account', 'Account Actions'],
                    ['activity', 'Activity History'],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={customerTab === key}
                      onClick={() => setCustomerTab(key)}
                      className={`min-h-9 shrink-0 rounded-[10px] px-3 text-[12.5px] font-medium ${customerTab === key ? 'bg-[#161616] text-[#F7F4EF]' : 'text-[#6f675c] hover:bg-[#faf7f2]'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {customerTab === 'overview' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-[12.5px]">
                      <div className="rounded-[12px] bg-[#faf7f2] px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-[#8a7a52]">Bookings</p>
                        <p className="mt-1 text-[18px] font-semibold">{customerDetail.bookings.length}</p>
                      </div>
                      <div className="rounded-[12px] bg-[#faf7f2] px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-[#8a7a52]">Assigned providers</p>
                        <p className="mt-1 text-[18px] font-semibold">{customerAssignments.length}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={adminBtnClass}
                        disabled={busy || customerDetail.customer.status !== 'active'}
                        onClick={() => {
                          setAssignCustomerId(customerDetail.customer.id);
                          setSelectedCustomerId(null);
                          setCustomerDetail(null);
                          setTab('assignments');
                        }}
                      >
                        Assign provider
                      </button>
                      <span className="self-center text-[12px] text-[#6f675c]">Assignments never create a booking or payment.</span>
                    </div>
                    <p className="text-[12.5px] text-[#6f675c]">
                      Joined {customerDetail.customer.createdAt ? formatScheduledDate(customerDetail.customer.createdAt) : '—'} · Phone {customerDetail.customer.phone || '—'}
                    </p>
                  </div>
                ) : null}

                {customerTab === 'profile' ? (
                  <form className="space-y-2" onSubmit={(e) => {
                    e.preventDefault();
                    act(async () => {
                      await apiRequest('/admin/customers.php', {
                        method: 'POST',
                        body: JSON.stringify({ userId: customerDetail.customer.id, action: 'update_profile', ...customerProfile }),
                      });
                    }, 'Profile updated.');
                  }}>
                    <p className="text-[13px] font-semibold">Customer profile</p>
                    <FormField label="First name"><input className={adminInputClass} value={customerProfile.firstName} onChange={(e) => setCustomerProfile({ ...customerProfile, firstName: e.target.value })} required /></FormField>
                    <FormField label="Last name"><input className={adminInputClass} value={customerProfile.lastName} onChange={(e) => setCustomerProfile({ ...customerProfile, lastName: e.target.value })} /></FormField>
                    <FormField label="Phone"><input className={adminInputClass} value={customerProfile.phone} onChange={(e) => setCustomerProfile({ ...customerProfile, phone: e.target.value })} /></FormField>
                    <p className="text-[12px] text-[#6f675c]">Email changes stay with the customer verification flow.</p>
                    <button className={adminBtnClass} type="submit" disabled={busy}>Save profile</button>
                  </form>
                ) : null}

                {customerTab === 'location' ? (
                  <div className="space-y-4">
                    <div className="rounded-[12px] bg-[#faf7f2] px-3 py-2 text-[12.5px] text-[#6f675c]">
                      <p className="inline-flex items-center gap-1.5 font-semibold text-[#161616]">
                        <MapPin className="h-3.5 w-3.5 text-[#8F6D35]" aria-hidden /> Saved location
                      </p>
                      <p className="mt-1">
                        {customerLocation
                          ? [customerLocation.area, customerLocation.city, customerLocation.district, customerLocation.region].filter(Boolean).join(', ') || 'Region and town not set'
                          : 'No saved location yet.'}
                      </p>
                      {customerLocation?.latitude != null && customerLocation?.longitude != null ? (
                        <p className="mt-1 text-[11.5px] text-[#8a7a52]">Exact pin on file. Only staff with customer-write permission can see it here.</p>
                      ) : null}
                    </div>

                    <form className="space-y-2" onSubmit={(e) => {
                      e.preventDefault();
                      const latitude = customerLocationForm.latitude.trim() === '' ? null : Number(customerLocationForm.latitude);
                      const longitude = customerLocationForm.longitude.trim() === '' ? null : Number(customerLocationForm.longitude);
                      void act(async () => {
                        await apiRequest('/admin/customers.php', {
                          method: 'POST',
                          body: JSON.stringify({
                            userId: customerDetail.customer.id,
                            action: 'update_location',
                            country: 'Ghana',
                            region: customerLocationForm.region,
                            district: customerLocationForm.district,
                            city: customerLocationForm.city,
                            area: customerLocationForm.area,
                            description: customerLocationForm.description,
                            latitude,
                            longitude,
                          }),
                        });
                      }, 'Customer location updated.');
                    }}>
                      <p className="text-[13px] font-semibold">Update location</p>
                      <FormField label="Region">
                        <select className={adminInputClass} value={customerLocationForm.region} onChange={(e) => setCustomerLocationForm({ ...customerLocationForm, region: e.target.value, district: '', city: '' })}>
                          <option value="">Select region</option>
                          {MARKETPLACE_REGIONS.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
                        </select>
                      </FormField>
                      <FormField label="District / Municipality">
                        <input className={adminInputClass} value={customerLocationForm.district} onChange={(e) => setCustomerLocationForm({ ...customerLocationForm, district: e.target.value })} />
                      </FormField>
                      <FormField label="City / Town">
                        <input className={adminInputClass} value={customerLocationForm.city} onChange={(e) => setCustomerLocationForm({ ...customerLocationForm, city: e.target.value })} required />
                      </FormField>
                      <FormField label="Area / Neighbourhood">
                        <input className={adminInputClass} value={customerLocationForm.area} onChange={(e) => setCustomerLocationForm({ ...customerLocationForm, area: e.target.value })} />
                      </FormField>
                      <FormField label="Location note (private)">
                        <textarea className={`${adminInputClass} h-20 py-2`} maxLength={500} value={customerLocationForm.description} onChange={(e) => setCustomerLocationForm({ ...customerLocationForm, description: e.target.value })} />
                      </FormField>
                      <div className="grid grid-cols-2 gap-2">
                        <FormField label="Latitude (optional)">
                          <input className={adminInputClass} inputMode="decimal" value={customerLocationForm.latitude} onChange={(e) => setCustomerLocationForm({ ...customerLocationForm, latitude: e.target.value })} />
                        </FormField>
                        <FormField label="Longitude (optional)">
                          <input className={adminInputClass} inputMode="decimal" value={customerLocationForm.longitude} onChange={(e) => setCustomerLocationForm({ ...customerLocationForm, longitude: e.target.value })} />
                        </FormField>
                      </div>
                      <p className="text-[11.5px] text-[#8a7a52]">Clearing the coordinates removes the pin. Changes are audited without storing the exact pin in the audit log.</p>
                      <button className={adminBtnClass} type="submit" disabled={busy}>Save location</button>
                    </form>

                    <div className="space-y-2 border-t border-[#efe8dc] pt-3">
                      <p className="text-[13px] font-semibold">Assign nearest provider</p>
                      <p className="text-[12px] text-[#6f675c]">Recommendations use service coverage, verification, publication and availability. You still review and confirm in Assignments.</p>
                      <div className="flex flex-wrap gap-2">
                        <select className={`${adminInputClass} w-[150px]`} aria-label="Search radius" value={nearbyRadius} onChange={(e) => setNearbyRadius(e.target.value)}>
                          {['5', '10', '20', '50', '100'].map((km) => <option key={km} value={km}>Within {km} km</option>)}
                        </select>
                        <button className={adminBtnGhostClass} type="button" disabled={nearbyLoading || busy || !customerLocation} onClick={() => void loadNearby(customerDetail.customer.id, nearbyRadius)}>
                          {nearbyLoading ? 'Finding…' : 'Find eligible providers'}
                        </button>
                      </div>
                      {!customerLocation ? <p className="text-[12px] text-[#8a7a52]">Save a customer location first.</p> : null}
                      {nearbyNote ? <p className="text-[12px] text-[#6f675c]">{nearbyNote}</p> : null}
                      {nearbyProviders.length > 0 ? (
                        <ul className="space-y-2">
                          {nearbyProviders.map((provider) => (
                            <li key={provider.providerProfileId} className="rounded-[12px] border border-[#efe8dc] px-3 py-2 text-[12.5px]">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate font-semibold">{provider.displayName} <span className="font-normal capitalize text-[#8a7a52]">· {provider.providerKind}</span></p>
                                  <p className="truncate text-[11.5px] text-[#6f675c]">{[provider.area, provider.city, provider.region].filter(Boolean).join(', ')}</p>
                                  <p className="mt-1 text-[11.5px] text-[#8a7a52]">
                                    {provider.distanceKm != null ? `~${provider.distanceKm} km · ` : ''}
                                    {provider.reasons.join(' · ')}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  className={adminBtnGhostCompactClass}
                                  disabled={busy}
                                  onClick={() => {
                                    setAssignCustomerId(customerDetail.customer.id);
                                    setSelectedCustomerId(null);
                                    setCustomerDetail(null);
                                    setTab('assignments');
                                  }}
                                >
                                  Assign
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {customerTab === 'bookings' ? (
                  <div className="space-y-2">
                    <p className="text-[13px] font-semibold">Bookings</p>
                    {customerDetail.bookings.length === 0 ? (
                      <p className="text-[12.5px] text-[#6f675c]">No bookings.</p>
                    ) : (
                      <ul className="max-h-[420px] space-y-2 overflow-y-auto text-[12.5px]">
                        {customerDetail.bookings.map((b) => (
                          <li key={b.id} className="rounded-[12px] border border-[#efe8dc] px-3 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="min-w-0 truncate font-medium">{b.serviceName}</span>
                              <StatusBadge status={b.status} />
                            </div>
                            <p className="truncate text-[11.5px] text-[#6f675c]">
                              {b.scheduledAt ? formatScheduledDate(b.scheduledAt) : 'No date'} · {b.reference ?? b.id}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}

                {customerTab === 'assigned' ? (
                  <div className="space-y-2">
                    <p className="text-[13px] font-semibold">Assigned providers</p>
                    {customerAssignments.length === 0 ? (
                      <p className="text-[12.5px] text-[#6f675c]">No assignments yet.</p>
                    ) : (
                      <ul className="max-h-[420px] space-y-2 overflow-y-auto">
                        {customerAssignments.map((a) => (
                          <li key={a.id} className="rounded-[12px] border border-[#efe8dc] px-3 py-2 text-[12.5px]">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate font-medium">{a.providerName || 'Provider'}</span>
                              <StatusBadge status={a.status} label={a.statusLabel} />
                            </div>
                            <p className="truncate text-[11.5px] text-[#6f675c]">
                              {a.providerType === 'agency' ? 'Agency' : 'Individual'}
                              {a.teamMemberName ? ` · ${a.teamMemberName}` : ''}
                              {a.serviceName ? ` · ${a.serviceName}` : ''}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="text-[11.5px] text-[#8a7a52]">Assignments are operational intents, not paid bookings.</p>
                  </div>
                ) : null}

                {customerTab === 'payments' ? (
                  <div className="space-y-3">
                    <p className="text-[13px] font-semibold">Payments</p>
                    <div className="rounded-[12px] bg-[#faf7f2] px-3 py-2 text-[12.5px] text-[#6f675c]">
                      {customerDetail.paymentNote ?? 'No booking payment ledger is recorded here.'}
                    </div>
                    <ul className="space-y-2 text-[12.5px]">
                      {customerDetail.bookings.length === 0 ? (
                        <li className="text-[#6f675c]">No bookings to price.</li>
                      ) : customerDetail.bookings.slice(0, 12).map((b) => (
                        <li key={b.id} className="flex items-center justify-between gap-3 rounded-[12px] border border-[#efe8dc] px-3 py-2">
                          <span className="min-w-0 truncate">{b.serviceName}</span>
                          <span className="shrink-0 font-semibold">{b.currency} {b.price.toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {customerTab === 'notes' ? (
                  <div className="space-y-2">
                    <p className="text-[13px] font-semibold">Internal notes</p>
                    <ul className="max-h-64 space-y-2 overflow-y-auto">
                      {customerDetail.notes.length === 0 ? (
                        <li className="text-[12.5px] text-[#6f675c]">No notes yet.</li>
                      ) : customerDetail.notes.map((n) => (
                        <li key={n.id} className="rounded-[12px] bg-[#faf7f2] px-3 py-2 text-[12.5px]">
                          <p>{n.body}</p>
                          <p className="mt-1 text-[11px] text-[#8a7a52]">{n.author} · {n.createdAt}</p>
                        </li>
                      ))}
                    </ul>
                    <form className="space-y-2" onSubmit={(e) => {
                      e.preventDefault();
                      if (!customerNote.trim()) return;
                      act(async () => {
                        await apiRequest('/admin/customers.php', {
                          method: 'POST',
                          body: JSON.stringify({ userId: customerDetail.customer.id, action: 'add_note', body: customerNote.trim() }),
                        });
                        setCustomerNote('');
                      }, 'Note added.');
                    }}>
                      <FormField label="Internal note">
                        <textarea className={`${adminInputClass} h-24 py-2`} value={customerNote} onChange={(e) => setCustomerNote(e.target.value)} />
                      </FormField>
                      <button className={adminBtnGhostClass} type="submit" disabled={busy || !customerNote.trim()}>Add note</button>
                    </form>
                  </div>
                ) : null}

                {customerTab === 'account' ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <button className={adminBtnGhostClass} disabled={busy || customerDetail.customer.status === 'deleted'} onClick={() => act(async () => {
                        await apiRequest('/admin/customers.php', {
                          method: 'POST',
                          body: JSON.stringify({ userId: customerDetail.customer.id, action: customerDetail.customer.status === 'suspended' ? 'activate' : 'suspend' }),
                        });
                      }, customerDetail.customer.status === 'suspended' ? 'Customer reactivated.' : 'Customer suspended.')}>
                        {customerDetail.customer.status === 'suspended' ? 'Reactivate account' : 'Suspend account'}
                      </button>
                      <button className={adminBtnGhostClass} disabled={busy || customerDetail.customer.status === 'deleted'} onClick={() => {
                        const banned = customerDetail.customer.status === 'banned';
                        const reason = window.prompt(banned ? 'Unblock note (optional)' : 'Block reason (required)') ?? '';
                        if (!banned && reason.trim() === '') return;
                        act(async () => {
                          await apiRequest('/admin/customers.php', {
                            method: 'POST',
                            body: JSON.stringify({ userId: customerDetail.customer.id, action: banned ? 'unblock' : 'block', reason: reason.trim() }),
                          });
                        }, banned ? 'Customer unblocked.' : 'Customer blocked.');
                      }}>
                        {customerDetail.customer.status === 'banned' ? 'Unblock account' : 'Block account'}
                      </button>
                      <button className={adminBtnGhostClass} disabled={busy} onClick={() => act(async () => {
                        await apiRequest('/admin/customers.php', { method: 'POST', body: JSON.stringify({ userId: customerDetail.customer.id, action: 'privacy_request', requestType: 'export' }) });
                      }, 'Export privacy request logged.')}>Request export</button>
                      <button className={adminBtnGhostClass} disabled={busy} onClick={() => act(async () => {
                        await apiRequest('/admin/customers.php', { method: 'POST', body: JSON.stringify({ userId: customerDetail.customer.id, action: 'privacy_request', requestType: 'deletion' }) });
                      }, 'Deletion privacy request logged.')}>Request deletion</button>
                      <button
                        className={adminBtnGhostClass}
                        disabled={busy || customerDetail.customer.status === 'deleted'}
                        onClick={() => {
                          if (!window.confirm('Close this customer account?')) return;
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
                      <div className="border-t border-[#efe8dc] pt-3">
                        <p className="text-[13px] font-semibold">Privacy requests</p>
                        <ul className="mt-2 space-y-1 text-[12.5px]">
                          {customerDetail.privacyRequests.map((p) => (
                            <li key={p.id} className="flex items-center justify-between gap-2">
                              <span>{p.type}</span>
                              <StatusBadge status={p.status} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {customerTab === 'activity' ? (
                  <div className="space-y-2">
                    <p className="text-[13px] font-semibold">Activity history</p>
                    {(customerDetail.activity ?? []).length === 0 ? (
                      <p className="text-[12.5px] text-[#6f675c]">No admin activity recorded yet.</p>
                    ) : (
                      <ul className="max-h-[420px] space-y-2 overflow-y-auto text-[12.5px]">
                        {(customerDetail.activity ?? []).map((entry) => (
                          <li key={entry.id} className="rounded-[12px] border border-[#efe8dc] px-3 py-2">
                            <p className="font-medium capitalize">{entry.action.replace(/[._]/g, ' ')}</p>
                            <p className="text-[11.5px] text-[#8a7a52]">{entry.actor ?? 'Staff'} · {entry.createdAt ? formatScheduledDate(entry.createdAt) : '—'}</p>
                            {entry.meta ? (
                              <p className="mt-1 text-[11.5px] text-[#6f675c]">
                                {Object.entries(entry.meta).slice(0, 3).map(([k, v]) => `${k}: ${String(v)}`).join(' · ')}
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </DetailPanel>
        </div>
      ) : null}

      {tab === 'providers' || tab === 'agencies' ? (
        <div className="space-y-4">
          <AdminCard padding={false} className="min-w-0 max-w-full overflow-hidden">
            <div className="flex flex-wrap items-end gap-2 border-b border-[#efe8dc] p-4">
              {tab === 'providers' ? (
                <select className={`${adminInputClass} w-[150px] shrink-0`} aria-label="Provider type" value={kind} onChange={(e) => setKind(e.target.value)}>
                  <option value="all">All types</option>
                  <option value="individual">Individuals</option>
                  <option value="agency">Agencies</option>
                </select>
              ) : null}
              <select className={`${adminInputClass} w-[160px] shrink-0`} aria-label="Verification status" value={providerVerification} onChange={(e) => setProviderVerification(e.target.value)}>
                <option value="all">Any verification</option>
                <option value="verified">Verified</option>
                <option value="pending_review">Pending review</option>
                <option value="changes_requested">Changes requested</option>
                <option value="rejected">Rejected</option>
                <option value="unverified">Unverified</option>
              </select>
              <select className={`${adminInputClass} w-[150px] shrink-0`} aria-label="Publication status" value={providerPublication} onChange={(e) => setProviderPublication(e.target.value)}>
                <option value="all">Any visibility</option>
                <option value="published">Published</option>
                <option value="unpublished">Unpublished</option>
                <option value="removed">Removed</option>
              </select>
              <select className={`${adminInputClass} w-[145px] shrink-0`} aria-label="Account status" value={providerAccount} onChange={(e) => setProviderAccount(e.target.value)}>
                <option value="all">Any account</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="banned">Blocked</option>
              </select>
              <select className={`${adminInputClass} w-[150px] shrink-0`} aria-label="Provider region" value={locationRegion} onChange={(e) => setLocationRegion(e.target.value)}>
                <option value="">All regions</option>
                {MARKETPLACE_REGIONS.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
              </select>
              <input className={`${adminInputClass} w-[130px] shrink-0`} aria-label="Provider city" placeholder="City / town" value={locationCity} onChange={(e) => setLocationCity(e.target.value)} />
              <SearchInput className="min-w-0 flex-1 basis-[180px]" value={search} onChange={setSearch} placeholder="Search providers" onSubmit={() => run(load)} />
              <button className={adminBtnClass} onClick={() => run(load)} disabled={busy}>Apply</button>
            </div>
            <DataTable
              headers={['Provider', 'Type', 'Verification', 'Visibility', 'Account', 'Actions']}
              columnWidths={['34%', '11%', '20%', '14%', '13%', '8%']}
              empty={visibleProviders.length === 0}
              emptyIcon={UserRound}
              emptyTitle={providers.length === 0 ? 'No providers yet.' : 'No providers match these filters.'}
              emptyDescription={providers.length === 0 ? 'Provider profiles will appear after registration.' : 'Adjust the filters or clear the search.'}
              minWidth="860px"
            >
              {visibleProviders.map((p) => (
                <DataRow key={p.userId} selected={selectedProviderId === p.userId}>
                  <DataCell>
                    <button type="button" className="flex w-full min-w-0 items-center gap-3 text-left" onClick={() => setSelectedProviderId(p.userId)}>
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#161616] text-[11px] font-semibold text-[#F7F4EF]">
                        {initials(p.displayName)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold hover:underline">{p.displayName}</p>
                        <p className="truncate text-[12px] text-[#6f675c]" title={`${p.email} · ${[p.area, p.city, p.region].filter(Boolean).join(', ') || '—'}`}>
                          {p.email} · {[p.area, p.city, p.region].filter(Boolean).join(', ') || '—'}
                        </p>
                      </div>
                    </button>
                  </DataCell>
                  <DataCell className="capitalize">{p.kind}</DataCell>
                  <DataCell>
                    <StatusBadge status={p.verificationStatus} />
                    <p className="mt-1 truncate text-[12px] text-[#6f675c]">ID: {p.identityStatus.replace(/_/g, ' ')}</p>
                  </DataCell>
                  <DataCell>
                    <StatusBadge
                      status={p.removed ? 'removed' : (p.published ? 'published' : 'unpublished')}
                      label={p.removed ? 'Removed' : (p.published ? 'Published' : 'Unpublished')}
                    />
                  </DataCell>
                  <DataCell>
                    <StatusBadge
                      status={p.accountStatus === 'banned' ? 'blocked' : p.accountStatus}
                      label={p.accountStatus === 'banned' ? 'Blocked' : p.accountStatus}
                    />
                  </DataCell>
                  <DataCell className="whitespace-nowrap">
                    <RowMenu
                      primaryLabel="Open"
                      primaryVariant="ghost"
                      onPrimary={() => setSelectedProviderId(p.userId)}
                      items={[
                        {
                          label: p.published ? 'Unpublish' : 'Publish',
                          disabled: busy || Boolean(p.removed),
                          onClick: () => {
                            void act(async () => {
                              await apiRequest('/admin/providers.php', {
                                method: 'POST',
                                body: JSON.stringify({
                                  providerUserId: p.userId,
                                  action: p.published ? 'unpublish' : 'publish',
                                }),
                              });
                            }, p.published ? 'Provider unpublished.' : 'Provider published.');
                          },
                        },
                        {
                          label: 'Review',
                          onClick: () => {
                            window.location.assign('/admin/provider-reviews');
                          },
                        },
                      ]}
                    />
                  </DataCell>
                </DataRow>
              ))}
            </DataTable>
            <p className="border-t border-[#efe8dc] px-4 py-3 text-[12px] text-[#6f675c]">
              Open a provider for remove, suspend, block, gallery moderation and permanent deletion. Publication never grants verification.
            </p>
          </AdminCard>

          {selectedProviderId ? (
            <div
              className="fixed inset-0 z-50 flex justify-end bg-black/45 sm:p-4"
              role="presentation"
              onClick={(e) => {
                if (e.target === e.currentTarget) setSelectedProviderId(null);
              }}
            >
              <div className="h-full w-full max-w-[560px] overflow-y-auto bg-[#FAF7F2] shadow-2xl sm:rounded-[18px]">
                <div className="min-h-full p-3 sm:p-4">
                  <AdminProviderDetail
                    userId={selectedProviderId}
                    canDelete={can('providers.delete')}
                    busy={busy}
                    onClose={() => setSelectedProviderId(null)}
                    onChanged={() => void run(load)}
                    act={act}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'assignments' ? (
        <AdminAssignmentsPanel
          canWrite={can('assignments.write')}
          initialCustomerId={assignCustomerId}
          onClearedInitialCustomer={() => setAssignCustomerId(null)}
          refreshKey={assignmentsRefresh}
          onReversible={(message, undoActionId) => {
            setNotice(message);
            setLastAction(undoActionId
              ? { id: undoActionId, label: message, canUndo: true, canRedo: false, undoneAt: null }
              : null);
            void load();
          }}
        />
      ) : null}

      {tab === 'staff' ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-5">
          <div className="min-w-0 space-y-4">
            <AdminCard padding={false} className="min-w-0 max-w-full overflow-hidden">
              <DataTable
                headers={['Staff', 'Role', 'Status', 'Actions']}
                empty={staff.length === 0}
                emptyIcon={ClipboardList}
                emptyTitle="No staff accounts yet."
                emptyDescription="Invite a teammate to collaborate in this workspace."
                minWidth="560px"
              >
                {staff.map((s) => (
                  <DataRow key={s.userId}>
                    <DataCell className="min-w-0">
                      <p className="truncate font-semibold">{s.name || '—'}</p>
                      <p className="truncate text-[12px] text-[#6f675c]" title={s.email}>{s.email}</p>
                    </DataCell>
                    <DataCell>
                      <select
                        className="h-11 rounded-[12px] border border-[#e0d7c8] bg-white px-2 text-[12.5px]"
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
                    </DataCell>
                    <DataCell>
                      <StatusBadge status={s.isActive ? 'active' : 'suspended'} label={s.isActive ? 'Active' : 'Inactive'} />
                    </DataCell>
                    <DataCell>
                      <button
                        className={adminBtnGhostClass}
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
                    </DataCell>
                  </DataRow>
                ))}
              </DataTable>
            </AdminCard>

            {invitations.length > 0 ? (
              <AdminCard>
                <AdminCardHeader title="Pending invitations" />
                <ul className="divide-y divide-[#efe8dc]">
                  {invitations.map((inv) => (
                    <li key={inv.id} className="flex items-center justify-between gap-3 py-3 text-[13px]">
                      <div>
                        <p className="font-semibold">{inv.email}</p>
                        <p className="text-[12px] text-[#6f675c]">{inv.staffRoleLabel} · expires {inv.expiresAt}</p>
                      </div>
                      <StatusBadge status="pending" />
                    </li>
                  ))}
                </ul>
              </AdminCard>
            ) : null}
          </div>

          <form
            className="min-w-0 space-y-3 self-start rounded-[16px] border border-[#e8e0d2] bg-white p-5 shadow-[0_1px_2px_rgba(22,22,22,0.04)]"
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
            <h2 className="font-display text-[22px] font-semibold">Invite staff</h2>
            <p className="text-[12.5px] text-[#6f675c]">They receive an email with a 72-hour activation link.</p>
            <FormField label="Email"><input className={adminInputClass} type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} required /></FormField>
            <FormField label="First name"><input className={adminInputClass} value={inviteForm.firstName} onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })} /></FormField>
            <FormField label="Last name"><input className={adminInputClass} value={inviteForm.lastName} onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })} /></FormField>
            <FormField label="Role">
              <select className={adminInputClass} value={inviteForm.staffRole} onChange={(e) => setInviteForm({ ...inviteForm, staffRole: e.target.value })}>
                {Object.entries(staffRoles).map(([key, labelText]) => (
                  <option key={key} value={key}>{labelText}</option>
                ))}
              </select>
            </FormField>
            <button className={adminBtnClass} type="submit" disabled={busy}>Send invite</button>
          </form>
        </div>
      ) : null}

      {tab === 'services' ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-5">
          <AdminCard padding={false} className="min-w-0 max-w-full overflow-hidden">
            <DataTable
              headers={['Service', 'Duration', 'Price', 'Status', '']}
              empty={services.length === 0}
              emptyIcon={Sparkles}
              emptyTitle="No services yet."
              emptyDescription="Add your first service to publish it on the website."
              minWidth="620px"
            >
              {services.map((s) => (
                <DataRow key={s.id}>
                  <DataCell>
                    <p className="font-semibold">{s.name}</p>
                    <p className="max-w-md text-[12px] text-[#6f675c]">{s.description}</p>
                  </DataCell>
                  <DataCell>{s.durationMinutes} min</DataCell>
                  <DataCell>{s.currency} {s.price.toLocaleString()}</DataCell>
                  <DataCell><StatusBadge status={s.active ? 'active' : 'inactive'} label={s.active ? 'Active' : 'Inactive'} /></DataCell>
                  <DataCell>
                    <div className="flex gap-2">
                      <button className={adminBtnGhostClass} onClick={() => setServiceForm({ id: s.id, name: s.name, description: s.description, durationMinutes: s.durationMinutes, price: s.price, active: s.active, image: s.image ?? '' })}>Edit</button>
                      <button className={adminBtnGhostClass} disabled={busy} onClick={() => act(async () => {
                        await apiRequest('/admin/services.php', { method: 'DELETE', body: JSON.stringify({ id: s.id }) });
                      }, 'Service deleted.')}>Delete</button>
                    </div>
                  </DataCell>
                </DataRow>
              ))}
            </DataTable>
          </AdminCard>

          <form className="min-w-0 space-y-3 rounded-[16px] border border-[#e8e0d2] bg-white p-5 shadow-[0_1px_2px_rgba(22,22,22,0.04)]" onSubmit={(e) => {
            e.preventDefault();
            act(async () => {
              await apiRequest('/admin/services.php', { method: 'POST', body: JSON.stringify(serviceForm) });
              setServiceForm({ id: '', name: '', description: '', durationMinutes: 60, price: 0, active: false, image: '' });
            }, 'Service saved.');
          }}>
            <h2 className="font-display text-[22px] font-semibold">{serviceForm.id ? 'Edit service' : 'Create service'}</h2>
            <FormField label="Service name"><input className={adminInputClass} value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} required /></FormField>
            <FormField label="Description"><textarea className={`${adminInputClass} h-28 py-2`} value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} /></FormField>
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Duration (minutes)"><input className={adminInputClass} type="number" min={15} max={480} value={serviceForm.durationMinutes} onChange={(e) => setServiceForm({ ...serviceForm, durationMinutes: Number(e.target.value) })} /></FormField>
              <FormField label="Price (GHS)"><input className={adminInputClass} type="number" min={0} value={serviceForm.price} onChange={(e) => setServiceForm({ ...serviceForm, price: Number(e.target.value) })} /></FormField>
            </div>
            <FormField label="Image / media URL" hint="Paste a URL from the Media library.">
              <input className={adminInputClass} value={serviceForm.image} onChange={(e) => setServiceForm({ ...serviceForm, image: e.target.value })} />
            </FormField>
            <label className="flex min-h-12 items-center gap-3 text-[13px]">
              <input type="checkbox" className="h-5 w-5 rounded border-[#d9cfba]" checked={serviceForm.active} onChange={(e) => setServiceForm({ ...serviceForm, active: e.target.checked })} />
              Active on public website
            </label>
            <button className={adminBtnClass} type="submit" disabled={busy}>{serviceForm.id ? 'Save changes' : 'Create service'}</button>
          </form>
        </div>
      ) : null}

      {tab === 'bookings' ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-5">
          <AdminCard padding={false} className="min-w-0 max-w-full overflow-hidden">
            <div className="flex flex-wrap gap-2 border-b border-[#efe8dc] p-4">
              <select className={`${adminInputClass} max-w-[200px] shrink-0`} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All statuses</option>
                {['pending', 'confirmed', 'reschedule_requested', 'completed', 'cancelled', 'no_show'].map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <SearchInput className="min-w-0 flex-1 basis-[180px]" value={bookingSearch} onChange={setBookingSearch} placeholder="Search reference, customer or service" onSubmit={() => run(load)} />
              <button className={adminBtnClass} onClick={() => run(load)} disabled={busy}>Apply</button>
            </div>
            <DataTable
              headers={['Booking', 'Customer', 'When', 'Provider', 'Status', '']}
              empty={bookings.length === 0}
              emptyIcon={CalendarDays}
              emptyTitle="No bookings yet."
              emptyDescription="Customer booking requests will appear in this table."
              minWidth="760px"
            >
              {bookings.map((b) => (
                <DataRow key={b.id} selected={selectedBookingId === b.id}>
                  <DataCell className="min-w-0">
                    <button type="button" className="min-w-0 max-w-full text-left" onClick={() => openBooking(b.id)}>
                      <p className="truncate font-semibold hover:underline">{b.serviceName}</p>
                      <p className="truncate text-[12px] text-[#6f675c]">{b.reference ?? b.id}</p>
                    </button>
                  </DataCell>
                  <DataCell className="min-w-0">
                    <p className="truncate">{b.customerName || '—'}</p>
                    <p className="truncate text-[12px] text-[#6f675c]" title={b.customerEmail ?? undefined}>{b.customerEmail}</p>
                  </DataCell>
                  <DataCell className="whitespace-nowrap">{formatScheduledDate(b.scheduledAt)}<p className="text-[12px] text-[#6f675c]">{b.timeSlot ?? ''}</p></DataCell>
                  <DataCell className="min-w-0">
                    <p className="truncate">{b.providerName ?? 'Unassigned'}</p>
                    {b.teamMemberName ? <p className="truncate text-[12px] text-[#6f675c]">{b.teamMemberName}</p> : null}
                  </DataCell>
                  <DataCell><StatusBadge status={b.status} /></DataCell>
                  <DataCell className="w-[1%] whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button className={adminBtnGhostCompactClass} onClick={() => openBooking(b.id)}>Detail</button>
                      <select
                        className="h-9 max-w-[120px] rounded-[10px] border border-[#e0d7c8] bg-white px-2 text-[12px]"
                        defaultValue=""
                        disabled={busy}
                        aria-label={`Change status for ${b.reference ?? b.id}`}
                        onChange={(e) => {
                          const next = e.target.value;
                          if (!next) return;
                          const needsReason = ['cancelled', 'no_show'].includes(next);
                          const note = needsReason ? window.prompt('Reason for this status change') ?? '' : '';
                          if (needsReason && note.trim().length < 3) return;
                          act(async () => {
                            await apiRequest('/admin/bookings.php', { method: 'POST', body: JSON.stringify({ bookingId: b.id, action: 'status', status: next, note }) });
                          }, 'Booking status updated.');
                        }}
                      >
                        <option value="">Status…</option>
                        {['confirmed', 'completed', 'cancelled', 'no_show', 'reschedule_requested'].map((s) => (
                          <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    </div>
                  </DataCell>
                </DataRow>
              ))}
            </DataTable>
          </AdminCard>

          <DetailPanel
            open={Boolean(bookingDetail)}
            title={bookingDetail?.serviceName}
            emptyIcon={CalendarDays}
            emptyTitle="Select a booking"
            emptyDescription="Inspect timeline, customer and provider details."
            onClose={() => { setSelectedBookingId(null); setBookingDetail(null); }}
          >
            {bookingDetail ? (
              <div className="space-y-4">
                <StatusBadge status={bookingDetail.status} />
                <p className="text-[12.5px] text-[#6f675c]">{bookingDetail.reference ?? bookingDetail.id}</p>
                <dl className="space-y-3 text-[13px]">
                  <div><dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7a52]">Customer</dt><dd className="mt-1">{bookingDetail.customerName || '—'}<br /><span className="text-[12px] text-[#6f675c]">{bookingDetail.customerEmail} · {bookingDetail.customerPhone || '—'}</span></dd></div>
                  <div><dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7a52]">When</dt><dd className="mt-1">{formatScheduledDate(bookingDetail.scheduledAt)} · {bookingDetail.timeSlot || '—'}</dd></div>
                  <div><dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7a52]">Location</dt><dd className="mt-1">{bookingDetail.locationType || '—'}{bookingDetail.address ? ` · ${bookingDetail.address}` : ''}</dd></div>
                  <div><dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7a52]">Provider</dt><dd className="mt-1">{bookingDetail.providerName ?? 'Unassigned'}{bookingDetail.teamMemberName ? ` · ${bookingDetail.teamMemberName}` : ''}</dd></div>
                  <div><dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7a52]">Price</dt><dd className="mt-1">{bookingDetail.currency} {bookingDetail.price.toLocaleString()}</dd></div>
                  <div><dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7a52]">Payment</dt><dd className="mt-1 text-[12px] text-[#6f675c]">{bookingDetail.paymentNote ?? 'No payment ledger is recorded for this booking.'}</dd></div>
                  {bookingDetail.cancellationReason ? (
                    <div><dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7a52]">Cancellation reason</dt><dd className="mt-1 text-[12px] text-[#6f675c]">{bookingDetail.cancellationReason}</dd></div>
                  ) : null}
                </dl>
                {['pending', 'confirmed', 'reschedule_requested'].includes(bookingDetail.status) ? (
                  <div className="space-y-2 border-t border-[#efe8dc] pt-3">
                    <p className="text-[13px] font-semibold">Assign verified provider</p>
                    <select className={adminInputClass} value={bookingProviderId} onChange={(e) => setBookingProviderId(e.target.value)}>
                      <option value="">Select provider</option>
                      {bookingProviders
                        .filter((p) => p.profileId && p.verificationStatus === 'verified' && !p.removed)
                        .map((p) => (
                          <option key={p.userId} value={p.profileId ?? ''}>{p.displayName} · {p.kind} · {p.city || '—'}</option>
                        ))}
                    </select>
                    <button
                      className={adminBtnClass}
                      disabled={busy || !bookingProviderId}
                      onClick={() => run(async () => {
                        await apiRequest('/admin/bookings.php', {
                          method: 'POST',
                          body: JSON.stringify({ bookingId: bookingDetail.id, action: 'assign', providerProfileId: bookingProviderId }),
                        });
                        setNotice('Provider assigned to booking.');
                        setBookingProviderId('');
                        await loadBookingDetail(bookingDetail.id);
                        await load();
                      })}
                    >
                      Assign provider
                    </button>
                    <p className="text-[11.5px] text-[#8a7a52]">Only verified providers. Assigning does not create or mark a payment.</p>
                  </div>
                ) : null}
                {bookingDetail.events && bookingDetail.events.length > 0 ? (
                  <div className="border-t border-[#efe8dc] pt-3">
                    <p className="text-[13px] font-semibold">Timeline</p>
                    <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto text-[12.5px]">
                      {bookingDetail.events.map((ev, idx) => (
                        <li key={`${ev.event}-${idx}`} className="rounded-[12px] bg-[#faf7f2] px-3 py-2">
                          <p className="font-medium">{ev.event}</p>
                          <p className="text-[#6f675c]">{ev.fromStatus ?? '—'} → {ev.toStatus ?? '—'} · {ev.createdAt}</p>
                          {ev.note ? <p className="mt-1">{ev.note}</p> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </DetailPanel>
        </div>
      ) : null}

      {tab === 'content' && content ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-5">
          <div className="min-w-0 space-y-4">
            <AdminCard padding={false}>
              <div className="flex items-center justify-between border-b border-[#efe8dc] px-5 py-4">
                <h2 className="font-display text-[22px] font-semibold">Pages</h2>
                <button className={adminBtnGhostClass} onClick={() => setPageEditor({ id: '', slug: '', title: '', bodyHtml: '', seoTitle: '', seoDescription: '' })}>New page</button>
              </div>
              <ul className="divide-y divide-[#efe8dc]">
                {content.pages.length === 0 ? (
                  <li><EmptyState title="No pages yet." description="Create one, save a draft, then publish." className="py-10" /></li>
                ) : content.pages.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                    <button type="button" className="min-w-0 text-left" onClick={() => setPageEditor({ id: p.id, slug: p.slug, title: p.title, bodyHtml: p.bodyHtml, seoTitle: p.seoTitle, seoDescription: p.seoDescription })}>
                      <p className="truncate text-[13.5px] font-semibold">{p.title}</p>
                      <p className="text-[12px] text-[#6f675c]">/{p.slug}</p>
                    </button>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={p.status === 'published' ? 'published' : 'pending'} label={p.status} />
                      <button className={adminBtnGhostClass} disabled={busy} onClick={() => act(async () => {
                        await apiRequest('/admin/content.php', { method: 'POST', body: JSON.stringify({ action: p.status === 'published' ? 'unpublish_page' : 'publish_page', id: p.id }) });
                      }, p.status === 'published' ? 'Page unpublished.' : 'Page published.')}>{p.status === 'published' ? 'Unpublish' : 'Publish'}</button>
                    </div>
                  </li>
                ))}
              </ul>
            </AdminCard>

            <AdminCard>
              <AdminCardHeader title="FAQs" />
              <ul className="divide-y divide-[#efe8dc]">
                {content.faqs.length === 0 ? <li className="py-3 text-[13px] text-[#6f675c]">No FAQs yet.</li> : content.faqs.map((f) => (
                  <li key={f.id} className="flex items-start justify-between gap-3 py-3">
                    <div><p className="text-[13.5px] font-semibold">{f.question}</p><p className="text-[12.5px] text-[#6f675c]">{f.answer}</p></div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={f.active ? 'active' : 'pending'} label={f.active ? 'Active' : 'Hidden'} />
                      <button type="button" className={adminBtnGhostClass} disabled={busy} onClick={() => act(async () => {
                        await apiRequest('/admin/content.php', { method: 'POST', body: JSON.stringify({ action: 'delete_faq', id: f.id }) });
                      }, 'FAQ deleted.')}>Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
              <form className="mt-4 space-y-2 border-t border-[#efe8dc] pt-4" onSubmit={(e) => {
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
              }}>
                <h3 className="text-[13px] font-semibold">Add FAQ</h3>
                <FormField label="Question"><input className={adminInputClass} name="question" required /></FormField>
                <FormField label="Answer"><textarea className={`${adminInputClass} h-24 py-2`} name="answer" required /></FormField>
                <button type="submit" className={adminBtnClass} disabled={busy}>Save FAQ</button>
              </form>
            </AdminCard>

            <AdminCard>
              <AdminCardHeader title="Contact, social & SEO" />
              <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => {
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
                  <FormField key={key} label={labelText}>
                    <input name={key} defaultValue={content.settings[key] ?? ''} className={adminInputClass} />
                  </FormField>
                ))}
                <div className="sm:col-span-2 mt-2 border-t border-[#efe8dc] pt-4">
                  <h3 className="text-[13.5px] font-semibold">Booking schedule</h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#6f675c]">
                    These values generate the public time slots. Leave them empty to show an honest “not published yet” state.
                  </p>
                </div>
                {[
                  ['booking_days', 'Working days (e.g. Mon-Sat)'],
                  ['booking_hours', 'Opening hours (e.g. 09:00-19:00)'],
                  ['booking_slot_minutes', 'Slot length in minutes (e.g. 60)'],
                  ['booking_timezone', 'Timezone (e.g. Africa/Accra)'],
                ].map(([key, labelText]) => (
                  <FormField key={key} label={labelText}>
                    <input name={key} defaultValue={content.settings[key] ?? ''} className={adminInputClass} />
                  </FormField>
                ))}
                <FormField className="sm:col-span-2" label="Booking notice shown above the booking steps">
                  <textarea name="booking_notice" defaultValue={content.settings.booking_notice ?? ''} rows={3} className={`${adminInputClass} h-auto py-2`} />
                </FormField>
                <div className="sm:col-span-2"><button className={adminBtnClass} type="submit" disabled={busy}>Save settings</button></div>
              </form>
            </AdminCard>
          </div>

          <form className="min-w-0 space-y-3 self-start rounded-[16px] border border-[#e8e0d2] bg-white p-5 shadow-[0_1px_2px_rgba(22,22,22,0.04)]" onSubmit={(e) => {
            e.preventDefault();
            act(async () => {
              await apiRequest('/admin/content.php', { method: 'POST', body: JSON.stringify({ action: 'save_page', ...pageEditor }) });
            }, 'Draft saved.');
          }}>
            <h2 className="font-display text-[22px] font-semibold">{pageEditor.id ? 'Edit page' : 'New page'}</h2>
            <FormField label="Title"><input className={adminInputClass} value={pageEditor.title} onChange={(e) => setPageEditor({ ...pageEditor, title: e.target.value })} required /></FormField>
            <FormField label="Slug"><input className={adminInputClass} value={pageEditor.slug} onChange={(e) => setPageEditor({ ...pageEditor, slug: e.target.value })} required /></FormField>
            <FormField label="Page HTML"><textarea className={`${adminInputClass} h-48 py-2 font-mono text-[12.5px]`} value={pageEditor.bodyHtml} onChange={(e) => setPageEditor({ ...pageEditor, bodyHtml: e.target.value })} /></FormField>
            <FormField label="SEO title"><input className={adminInputClass} value={pageEditor.seoTitle} onChange={(e) => setPageEditor({ ...pageEditor, seoTitle: e.target.value })} /></FormField>
            <FormField label="SEO description"><input className={adminInputClass} value={pageEditor.seoDescription} onChange={(e) => setPageEditor({ ...pageEditor, seoDescription: e.target.value })} /></FormField>
            <button className={adminBtnClass} type="submit" disabled={busy}>Save draft</button>
            {pageEditor.id ? (
              <button type="button" className={adminBtnGhostClass} disabled={busy} onClick={() => act(async () => {
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
            className="rounded-[16px] border border-dashed border-[#d9cfba] bg-white p-5 shadow-[0_1px_2px_rgba(22,22,22,0.04)] flex flex-wrap items-end gap-3"
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
            <FormField className="min-w-[220px] flex-1" label="Upload image" hint="JPEG, PNG or WebP · max 5MB">
              <input name="file" type="file" accept="image/jpeg,image/png,image/webp" className={`${adminInputClass} py-2`} />
            </FormField>
            <button className={adminBtnClass} type="submit" disabled={busy}>Upload</button>
          </form>

          {media.length === 0 ? (
            <AdminCard>
              <EmptyState title="No media uploaded yet." description="Upload images for services and pages." className="py-8" />
            </AdminCard>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {media.map((m) => (
                <article key={m.id} className="rounded-[16px] border border-[#e8e0d2] bg-white p-3 shadow-[0_1px_2px_rgba(22,22,22,0.04)] space-y-3">
                  <div className="aspect-[4/3] overflow-hidden rounded-[14px] bg-[#faf7f2]">
                    <img src={m.url} alt={m.altText || m.filename} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <p className="truncate text-[13px] font-semibold">{m.filename}</p>
                    <p className="text-[11.5px] text-[#6f675c]">{Math.round(m.sizeBytes / 1024)} KB · {m.mime}{m.createdAt ? ` · ${formatScheduledDate(m.createdAt)}` : ''}</p>
                    <button
                      type="button"
                      className="mt-1 text-[12px] font-semibold text-[#8F6D35] hover:underline"
                      onClick={() => {
                        void navigator.clipboard?.writeText(m.url);
                        setNotice('URL copied.');
                      }}
                    >
                      Copy / use URL
                    </button>
                  </div>
                  <form className="flex gap-2" onSubmit={(e) => {
                    e.preventDefault();
                    const alt = new FormData(e.currentTarget).get('altText');
                    act(async () => {
                      await apiRequest('/admin/media.php', {
                        method: 'PATCH',
                        body: JSON.stringify({ id: m.id, altText: String(alt ?? '') }),
                      });
                    }, 'Alt text saved.');
                  }}>
                    <input name="altText" defaultValue={m.altText} className={adminInputClass} placeholder="Alt text" aria-label={`Alt text for ${m.filename}`} />
                    <button className={adminBtnGhostClass} type="submit" disabled={busy}>Save</button>
                  </form>
                  <button className={adminBtnGhostClass} disabled={busy} onClick={() => act(async () => {
                    await apiRequest('/admin/media.php', { method: 'DELETE', body: JSON.stringify({ id: m.id }) });
                  }, 'Media deleted.')}>Delete</button>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === 'updates' ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-5">
          <div className="min-w-0 space-y-4">
            <AdminCard padding={false} className="min-w-0 max-w-full overflow-hidden">
              <div className="px-5 py-4"><h2 className="font-display text-[22px] font-semibold">Announcements</h2></div>
              <DataTable
                headers={['Title', 'Status', 'Updated', 'Actions']}
                empty={announcements.length === 0}
                emptyTitle="No announcements yet."
                minWidth="560px"
              >
                {announcements.map((a) => (
                  <DataRow key={a.id}>
                    <DataCell>
                      <button type="button" className="text-left font-semibold hover:underline" onClick={() => setAnnouncementForm({ id: a.id, title: a.title, bodyHtml: a.bodyHtml })}>
                        {a.title}
                      </button>
                    </DataCell>
                    <DataCell><StatusBadge status={a.status} /></DataCell>
                    <DataCell>{a.updatedAt ?? a.createdAt ?? '—'}</DataCell>
                    <DataCell>
                      <div className="flex flex-wrap gap-2">
                        <button className={adminBtnGhostClass} disabled={busy} onClick={() => act(async () => {
                          await apiRequest('/admin/announcements.php', {
                            method: 'POST',
                            body: JSON.stringify({ action: a.status === 'published' ? 'unpublish' : 'publish', id: a.id }),
                          });
                        }, a.status === 'published' ? 'Announcement unpublished.' : 'Announcement published.')}>
                          {a.status === 'published' ? 'Unpublish' : 'Publish'}
                        </button>
                        <button className={adminBtnGhostClass} disabled={busy} onClick={() => act(async () => {
                          await apiRequest('/admin/announcements.php', { method: 'POST', body: JSON.stringify({ action: 'delete', id: a.id }) });
                          if (announcementForm.id === a.id) setAnnouncementForm({ id: '', title: '', bodyHtml: '' });
                        }, 'Announcement deleted.')}>Delete</button>
                      </div>
                    </DataCell>
                  </DataRow>
                ))}
              </DataTable>
            </AdminCard>

            <AdminCard>
              <AdminCardHeader title="Recent CMS changes" subtitle="Real content, media and service events only." />
              {recentChanges.length === 0 ? (
                <EmptyState title="No recent activity yet." description="CMS changes will appear here after edits." className="py-8" />
              ) : (
                <ul className="divide-y divide-[#efe8dc]">
                  {recentChanges.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                      <span className="truncate">{c.action}{c.entityType ? ` · ${c.entityType}` : ''}</span>
                      <span className="shrink-0 text-[12px] text-[#6f675c]">{c.createdAt}</span>
                    </li>
                  ))}
                </ul>
              )}
            </AdminCard>
          </div>

          <form
            className="min-w-0 space-y-3 self-start rounded-[16px] border border-[#e8e0d2] bg-white p-5 shadow-[0_1px_2px_rgba(22,22,22,0.04)]"
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
            <h2 className="font-display text-[22px] font-semibold">{announcementForm.id ? 'Edit announcement' : 'New announcement'}</h2>
            <FormField label="Title"><input className={adminInputClass} value={announcementForm.title} onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })} required /></FormField>
            <FormField label="Body HTML"><textarea className={`${adminInputClass} h-40 py-2`} value={announcementForm.bodyHtml} onChange={(e) => setAnnouncementForm({ ...announcementForm, bodyHtml: e.target.value })} /></FormField>
            <button className={adminBtnClass} type="submit" disabled={busy}>Save draft</button>
            {announcementForm.id ? (
              <button type="button" className={adminBtnGhostClass} onClick={() => setAnnouncementForm({ id: '', title: '', bodyHtml: '' })}>Clear</button>
            ) : null}
          </form>
        </div>
      ) : null}

      {tab === 'system' && overview ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <AdminCard>
            <AdminCardHeader title="Email delivery" />
            <p className="text-[13px] text-[#6f675c]">
              Transport: <strong>{overview.mail.transport}</strong> ·{' '}
              {overview.mail.configured ? 'configured' : 'not configured'}
            </p>
            {overview.mail.missing.length > 0 ? (
              <p className="mt-3 rounded-[12px] border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">
                Missing keys: {overview.mail.missing.join(', ')}. Values are never shown here.
              </p>
            ) : (
              <p className="mt-3 text-[12.5px] text-emerald-800">All required SMTP keys are present. Values stay server-side.</p>
            )}
          </AdminCard>

          <form
            className="rounded-[16px] border border-[#e8e0d2] bg-white p-5 shadow-[0_1px_2px_rgba(22,22,22,0.04)] space-y-3"
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
            <h2 className="font-display text-[22px] font-semibold">Booking settings</h2>
            <p className="text-[12.5px] text-[#6f675c]">
              Controls public availability. Empty values keep the booking UI honest instead of inventing slots.
            </p>
            {([
              ['booking_days', 'Working days'],
              ['booking_hours', 'Opening hours'],
              ['booking_slot_minutes', 'Slot length (minutes)'],
              ['booking_timezone', 'Timezone'],
            ] as const).map(([key, labelText]) => (
              <FormField key={key} label={labelText}>
                <input
                  className={adminInputClass}
                  value={bookingSettings[key]}
                  onChange={(e) => setBookingSettings({ ...bookingSettings, [key]: e.target.value })}
                />
              </FormField>
            ))}
            <FormField label="Booking notice">
              <textarea
                className={`${adminInputClass} h-24 py-2`}
                value={bookingSettings.booking_notice}
                onChange={(e) => setBookingSettings({ ...bookingSettings, booking_notice: e.target.value })}
              />
            </FormField>
            <button className={adminBtnClass} type="submit" disabled={busy}>Save booking settings</button>
          </form>
        </div>
      ) : null}

      {tab === 'audit' ? (
        <AdminCard padding={false}>
          <DataTable
            headers={['When', 'Action', 'Entity', 'Actor']}
            empty={audit.length === 0}
            emptyTitle="No admin actions recorded yet."
            minWidth="720px"
          >
            {audit.map((a) => (
              <DataRow key={a.id}>
                <DataCell>{a.createdAt}</DataCell>
                <DataCell>{a.action}</DataCell>
                <DataCell>{a.entityType ?? '—'}{a.entityId ? <span className="block text-[11.5px] text-[#6f675c]">{a.entityId}</span> : null}</DataCell>
                <DataCell>{a.actor ?? '—'}</DataCell>
              </DataRow>
            ))}
          </DataTable>
        </AdminCard>
      ) : null}
    </AdminShell>
  );
};

export default AdminWorkspacePage;
