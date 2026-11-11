import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Lock,
  MapPin,
  RefreshCw,
  User as UserIcon,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { LocationFields, emptyLocation, type LocationValue } from './location/LocationFields';
import { apiRequest } from '../lib/api';
import { PhotoUploadField } from './media/PhotoUploadField';
import { formatScheduledDate } from '../lib/dates';
import { fetchAvailability, todayISO, type AvailabilityResponse } from '../lib/bookingAvailability';

type Booking = {
  id: string;
  reference: string | null;
  status: string;
  serviceName: string;
  price: number;
  currency: string;
  scheduledAt: string | null;
  timeSlot: string | null;
  locationType: string | null;
  providerName?: string | null;
  serviceId?: string | null;
  providerProfileId?: string | null;
  durationMinutes?: number | null;
  canCancel?: boolean;
  canReschedule?: boolean;
};

type CustomerPayload = {
  bookings: Booking[];
  upcoming: Booking[];
  receipts: Array<{ id: string; reference: string | null; serviceName: string; amount: number; currency: string; status: string; date: string | null }>;
};

type ProfilePayload = {
  user: { firstName: string; lastName: string; email: string; phone: string; role: string };
  emailVerified: boolean;
  accountStatus: string;
  avatarUrl?: string | null;
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
  updatedAt?: string | null;
};

function toLocationValue(location: CustomerLocation | null): LocationValue {
  if (!location) return { ...emptyLocation };
  return {
    country: location.country || 'Ghana',
    region: location.region || '',
    district: location.district || '',
    city: location.city || '',
    area: location.area || '',
    latitude: location.latitude ?? null,
    longitude: location.longitude ?? null,
  };
}

const surface = 'rounded-2xl border border-[#e4d8f2] bg-white p-5 shadow-[0_1px_2px_rgba(59,7,100,0.05)]';
const statusTone: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  confirmed: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  reschedule_requested: 'bg-sky-50 text-sky-800 border-sky-200',
  completed: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  no_show: 'bg-red-50 text-red-700 border-red-200',
};

export const ClientDashboard: React.FC<{
  onBackToHome: () => void;
  onOpenBooking: () => void;
  userBookings?: unknown[];
}> = ({ onBackToHome, onOpenBooking }) => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab = tabParam === 'profile' ? 'profile' : tabParam === 'location' ? 'location' : 'bookings';
  const [tab, setTab] = useState<'bookings' | 'profile' | 'location'>(initialTab);
  const [data, setData] = useState<CustomerPayload | null>(null);
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [location, setLocation] = useState<CustomerLocation | null>(null);
  const [locationForm, setLocationForm] = useState<LocationValue>({ ...emptyLocation });
  const [locationDescription, setLocationDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlotId, setRescheduleSlotId] = useState('');
  const [rescheduleNote, setRescheduleNote] = useState('');
  const [rescheduleAvailability, setRescheduleAvailability] = useState<AvailabilityResponse | null>(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const load = () => {
    setError(null);
    Promise.all([
      apiRequest<CustomerPayload>('/customer/bookings.php'),
      apiRequest<ProfilePayload>('/customer/profile.php'),
      apiRequest<{ location: CustomerLocation | null }>('/customer/location.php').catch(() => ({ location: null })),
    ])
      .then(([bookings, me, savedLocation]) => {
        setData(bookings);
        setProfile(me);
        setLocation(savedLocation.location);
        setLocationForm(toLocationValue(savedLocation.location));
        setLocationDescription(savedLocation.location?.description ?? '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load your account.'));
  };

  useEffect(load, []);

  const cancel = async (bookingId: string) => {
    const reason = window.prompt('Reason for cancelling (optional)') ?? '';
    setBusy(true);
    try {
      await apiRequest(`/customer/bookings.php`, {
        method: 'POST',
        body: JSON.stringify({ action: 'cancel', bookingId, reason }),
      });
      setNotice('Booking cancelled.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to cancel this booking.');
    } finally {
      setBusy(false);
    }
  };

  const saveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!locationForm.region || !locationForm.city.trim()) {
      setError('Choose your region and town so providers can be matched.');
      return;
    }
    setBusy(true);
    try {
      const result = await apiRequest<{ location: CustomerLocation; message?: string }>('/customer/location.php', {
        method: 'POST',
        body: JSON.stringify({
          action: 'save',
          ...locationForm,
          description: locationDescription,
        }),
      });
      setLocation(result.location);
      setLocationForm(toLocationValue(result.location));
      setLocationDescription(result.location.description ?? '');
      setNotice(result.message ?? 'Location saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save your location.');
    } finally {
      setBusy(false);
    }
  };

  const saveAvatar = async () => {
    if (!avatarFile) return;
    setAvatarBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', avatarFile);
      const result = await apiRequest<{ avatarUrl: string }>('/customer/avatar.php', {
        method: 'POST',
        body: form,
      });
      setProfile((prev) => (prev ? { ...prev, avatarUrl: result.avatarUrl } : prev));
      setAvatarFile(null);
      setNotice('Profile photo saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save your profile photo.');
    } finally {
      setAvatarBusy(false);
    }
  };

  const removeAvatar = async () => {
    if (!window.confirm('Remove your profile photo?')) return;
    setAvatarBusy(true);
    setError(null);
    try {
      await apiRequest('/customer/avatar.php', { method: 'DELETE' });
      setProfile((prev) => (prev ? { ...prev, avatarUrl: null } : prev));
      setAvatarFile(null);
      setNotice('Profile photo removed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove your profile photo.');
    } finally {
      setAvatarBusy(false);
    }
  };

  const clearLocation = async () => {
    if (!window.confirm('Remove your saved location? Discovery will ask for a location next time.')) return;
    setBusy(true);
    try {
      await apiRequest('/customer/location.php', {
        method: 'POST',
        body: JSON.stringify({ action: 'clear' }),
      });
      setLocation(null);
      setLocationForm({ ...emptyLocation });
      setLocationDescription('');
      setNotice('Saved location removed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove your location.');
    } finally {
      setBusy(false);
    }
  };

  const openReschedule = (booking: Booking) => {
    setRescheduleBooking(booking);
    setRescheduleDate('');
    setRescheduleSlotId('');
    setRescheduleNote('');
    setRescheduleAvailability(null);
    setRescheduleError(null);
  };

  useEffect(() => {
    if (!rescheduleBooking || !rescheduleDate) {
      setRescheduleAvailability(null);
      return;
    }
    let cancelled = false;
    setRescheduleLoading(true);
    setRescheduleError(null);
    setRescheduleSlotId('');
    fetchAvailability({
      date: rescheduleDate,
      serviceId: rescheduleBooking.serviceId ?? undefined,
      providerProfileId: rescheduleBooking.providerProfileId ?? undefined,
      durationMinutes: rescheduleBooking.durationMinutes ?? undefined,
    })
      .then((result) => {
        if (!cancelled) setRescheduleAvailability(result);
      })
      .catch((err) => {
        if (cancelled) return;
        setRescheduleAvailability(null);
        setRescheduleError(err instanceof Error ? err.message : 'Unable to check live availability.');
      })
      .finally(() => {
        if (!cancelled) setRescheduleLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rescheduleBooking, rescheduleDate]);

  const submitReschedule = async () => {
    const slot = rescheduleAvailability?.slots.find(
      (candidate) => candidate.id === rescheduleSlotId && candidate.available,
    );
    if (!rescheduleBooking || !rescheduleDate || !slot) {
      setRescheduleError('Choose a date and an open time before confirming.');
      return;
    }
    setBusy(true);
    setRescheduleError(null);
    try {
      await apiRequest('/customer/bookings.php', {
        method: 'POST',
        body: JSON.stringify({
          action: 'reschedule',
          bookingId: rescheduleBooking.id,
          scheduledAt: `${rescheduleDate}T00:00:00`,
          timeSlotId: slot.id,
          timeSlot: slot.label,
          note: rescheduleNote.trim(),
        }),
      });
      setNotice(`Booking rescheduled to ${formatScheduledDate(`${rescheduleDate}T00:00:00`)} · ${slot.label}.`);
      setRescheduleBooking(null);
      load();
    } catch (err) {
      setRescheduleError(err instanceof Error ? err.message : 'Unable to reschedule this booking.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf5ff] text-[#1a1424]">
      <header className="sticky top-0 z-40 border-b border-[#e4d8f2] bg-[#f3edfa]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToHome}
              className="inline-flex h-11 items-center gap-2 rounded-lg px-2 text-[12px] font-semibold uppercase tracking-wider text-[#675f73] hover:text-[#1a1424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9333ea]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden /> Home
            </button>
            <BrandLogo variant="plate" withWordmark onLight markHeight={24} />
          </div>
          <div className="flex items-center gap-3">
            {profile ? (
              <div className="hidden text-right sm:block">
                <p className="text-[13px] font-semibold">{profile.user.firstName} {profile.user.lastName}</p>
                <p className="text-[11px] text-[#675f73]">{profile.user.email}</p>
              </div>
            ) : null}
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#1a1424] text-[13px] font-semibold text-[#c084fc]">
              {profile?.user.firstName?.[0] ?? 'M'}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7e22ce]">My account</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Your bookings</h1>
        </div>

        <nav className="mb-6 flex gap-2 border-b border-[#e4d8f2] pb-3" aria-label="Account sections">
          {[
            { id: 'bookings' as const, label: 'Bookings', icon: Calendar },
            { id: 'location' as const, label: 'Location', icon: MapPin },
            { id: 'profile' as const, label: 'Profile', icon: UserIcon },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex h-11 items-center gap-2 rounded-lg px-4 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9333ea] ${
                tab === id ? 'bg-[#6d28d9] text-white' : 'text-[#675f73] hover:bg-[#ece4f7]'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </button>
          ))}
        </nav>

        {error ? (
          <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">
            {notice}
          </div>
        ) : null}

        {!data && !error ? (
          <p className="py-16 text-center text-[13.5px] text-[#675f73]">Loading your account…</p>
        ) : null}

        {tab === 'bookings' && data ? (
          data.bookings.length === 0 ? (
            <div className={`${surface} text-center`}>
              <Calendar className="mx-auto h-10 w-10 text-[#a78bfa]" aria-hidden />
              <h2 className="mt-3 text-[17px] font-semibold">No bookings yet</h2>
              <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-[#675f73]">
                When you request a massage, it will appear here with its status and reference so you can
                track it from request to completion.
              </p>
              <button
                type="button"
                onClick={onOpenBooking}
                className="mt-5 inline-flex h-12 items-center rounded-xl bg-[#6d28d9] px-5 text-[13.5px] font-semibold text-white hover:bg-[#9333ea] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9333ea]"
              >
                Book A Massage
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {data.bookings.map((booking) => (
                <article key={booking.id} className={surface}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusTone[booking.status] ?? 'border-zinc-200 bg-zinc-50 text-zinc-700'}`}>
                        {booking.status.replace('_', ' ')}
                      </span>
                      <h3 className="mt-2 text-[16px] font-semibold">{booking.serviceName}</h3>
                      <p className="mt-0.5 text-[12px] text-[#675f73]">
                        {booking.reference ? `Ref ${booking.reference}` : 'Reference pending'}
                      </p>
                    </div>
                    <p className="text-[14px] font-semibold">{booking.currency} {booking.price.toLocaleString()}</p>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-[#ece3f6] bg-[#faf5ff] p-3 text-[12px]">
                    <div>
                      <dt className="text-[#7e22ce]">When</dt>
                      <dd className="mt-0.5 font-medium">
                        <Clock className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                        {formatScheduledDate(booking.scheduledAt)}
                        {booking.timeSlot ? ` · ${booking.timeSlot}` : ''}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#7e22ce]">Where</dt>
                      <dd className="mt-0.5 font-medium capitalize">
                        <MapPin className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                        {booking.locationType === 'home' ? 'Home visit' : 'Studio'}
                      </dd>
                    </div>
                    {booking.providerName ? (
                      <div className="col-span-2">
                        <dt className="text-[#7e22ce]">Provider</dt>
                        <dd className="mt-0.5 font-medium">{booking.providerName}</dd>
                      </div>
                    ) : null}
                  </dl>

                  {booking.canCancel || booking.canReschedule ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {booking.canReschedule ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => openReschedule(booking)}
                          className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#d8c7ea] px-3.5 text-[12.5px] font-semibold hover:bg-[#f3edfa] disabled:opacity-60"
                        >
                          <RefreshCw className="h-4 w-4" aria-hidden /> Reschedule
                        </button>
                      ) : null}
                      {booking.canCancel ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => cancel(booking.id)}
                          className="inline-flex h-11 items-center rounded-lg border border-red-200 px-3.5 text-[12.5px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          Cancel booking
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )
        ) : null}

        {tab === 'bookings' && data && data.receipts.length > 0 ? (
          <section className="mt-8">
            <h2 className="mb-3 text-[15px] font-semibold">Receipts</h2>
            <div className={`${surface} overflow-x-auto p-0`}>
              <table className="w-full min-w-[540px] text-left text-[13px]">
                <thead className="bg-[#f3edfa] text-[11px] uppercase tracking-wider text-[#675f73]">
                  <tr>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.receipts.map((r) => (
                    <tr key={r.id} className="border-t border-[#ece3f6]">
                      <td className="px-4 py-3 font-medium">{r.reference ?? '—'}</td>
                      <td className="px-4 py-3">{r.serviceName}</td>
                      <td className="px-4 py-3">{r.currency} {r.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[#675f73]">{r.date ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11.5px] text-[#7e22ce]">
              Receipts list completed bookings only. No online payment gateway is integrated, so no card
              transactions are recorded.
            </p>
          </section>
        ) : null}

        {tab === 'location' ? (
          <section className={surface}>
            <h2 className="text-[15px] font-semibold">Your location</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[#675f73]">
              Explore uses this to show nearby, eligible providers first. Your exact pin and home address
              are private and are never shown to providers or other customers.
            </p>

            {location?.region || location?.city ? (
              <div className="mt-4 rounded-xl border border-[#ece3f6] bg-[#faf5ff] px-3 py-2.5 text-[13px]">
                <p className="font-semibold text-[#1a1424]">
                  {[location.area, location.city, location.district, location.region].filter(Boolean).join(', ')}
                </p>
                <p className="mt-0.5 text-[11.5px] text-[#7e22ce]">
                  {location.latitude != null && location.longitude != null
                    ? 'Exact pin saved — distances use approximate straight-line measurement.'
                    : 'No exact pin saved — matching uses your town and region.'}
                </p>
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-[#d8c7ea] px-3 py-3 text-[13px] text-[#675f73]">
                No saved location yet. You can still browse Explore, but nearest-first results need a town.
              </p>
            )}

            <form onSubmit={saveLocation} className="mt-4 space-y-4">
              <LocationFields value={locationForm} onChange={setLocationForm} disabled={busy} />
              <label className="block">
                <span className="text-[12px] font-medium text-[#675f73]">Location note (optional)</span>
                <textarea
                  className="mt-1.5 min-h-24 w-full rounded-xl border border-[#d8c7ea] bg-white px-3 py-2.5 text-[14px] text-[#1a1424] outline-none focus:border-[#9333ea] focus:ring-2 focus:ring-[#9333ea]/25"
                  maxLength={500}
                  value={locationDescription}
                  onChange={(e) => setLocationDescription(e.target.value)}
                  placeholder="Landmark or directions that help a provider, kept private."
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex h-12 items-center rounded-xl bg-[#6d28d9] px-5 text-[13.5px] font-semibold text-white hover:bg-[#9333ea] disabled:opacity-60"
                >
                  {busy ? 'Saving…' : 'Save location'}
                </button>
                {location ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={clearLocation}
                    className="inline-flex h-12 items-center rounded-xl border border-[#d8c7ea] px-4 text-[13px] font-semibold text-[#675f73] hover:bg-[#f3edfa] disabled:opacity-60"
                  >
                    Remove saved location
                  </button>
                ) : null}
                <Link
                  to="/explore/accra"
                  className="inline-flex h-12 items-center rounded-xl border border-[#d8c7ea] px-4 text-[13px] font-semibold text-[#1a1424] hover:bg-[#f3edfa]"
                >
                  Find nearby providers
                </Link>
              </div>
            </form>
          </section>
        ) : null}

        {tab === 'profile' && profile ? (
          <div className="grid gap-4 md:grid-cols-2">
            <section className={surface}>
              <h2 className="text-[15px] font-semibold">Account details</h2>
              <div className="mt-4 rounded-xl border border-[#ece3f6] bg-[#faf7ff] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7e22ce]">Profile photo</p>
                <div className="mt-2 flex items-center gap-3">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="Your profile" className="h-16 w-16 rounded-full border border-[#d8c7ea] object-cover" />
                  ) : (
                    <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#1a1424] text-[20px] font-semibold text-[#c084fc]">
                      {profile.user.firstName?.[0] ?? 'M'}
                    </span>
                  )}
                  <p className="text-[12px] leading-relaxed text-[#675f73]">
                    This photo appears on your account. It is not identity verification.
                  </p>
                </div>
                <div className="mt-3">
                  <PhotoUploadField
                    theme="light"
                    label="Customer profile photo"
                    file={avatarFile}
                    onChange={setAvatarFile}
                    disabled={avatarBusy}
                    hint="Take a selfie, choose a phone gallery image, or pick a file on desktop."
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!avatarFile || avatarBusy}
                    onClick={saveAvatar}
                    className="inline-flex h-11 items-center rounded-lg bg-[#6d28d9] px-4 text-[12.5px] font-semibold text-white hover:bg-[#9333ea] disabled:opacity-50"
                  >
                    {avatarBusy ? 'Saving…' : 'Save photo'}
                  </button>
                  {profile.avatarUrl ? (
                    <button
                      type="button"
                      disabled={avatarBusy}
                      onClick={removeAvatar}
                      className="inline-flex h-11 items-center rounded-lg border border-red-200 px-4 text-[12.5px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      Remove photo
                    </button>
                  ) : null}
                </div>
              </div>
              <dl className="mt-3 space-y-3 text-[13px]">
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-[#7e22ce]">Name</dt>
                  <dd className="mt-0.5 font-medium">{profile.user.firstName} {profile.user.lastName}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-[#7e22ce]">Email</dt>
                  <dd className="mt-0.5 font-medium">{profile.user.email}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-[#7e22ce]">Phone (contact only)</dt>
                  <dd className="mt-0.5 font-medium">{profile.user.phone || 'Not provided'}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-[#7e22ce]">Email status</dt>
                  <dd className={`mt-0.5 inline-flex items-center gap-1.5 font-medium ${profile.emailVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {profile.emailVerified ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
                    {profile.emailVerified ? 'Confirmed' : 'Not confirmed'}
                  </dd>
                </div>
              </dl>
              {!profile.emailVerified ? (
                <Link
                  to="/verify-email?sent=0"
                  className="mt-4 inline-flex h-11 items-center rounded-lg border border-[#d8c7ea] px-3.5 text-[12.5px] font-semibold hover:bg-[#f3edfa]"
                >
                  Confirm your email
                </Link>
              ) : null}
            </section>
            <section className={surface}>
              <h2 className="text-[15px] font-semibold">Security</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-[#675f73]">
                Use the password reset flow to change your password securely. Your phone number is contact
                information only and is never used as a sign-in gate.
              </p>
              <Link
                to="/forgot-password"
                className="mt-4 inline-flex h-11 items-center rounded-lg border border-[#d8c7ea] px-3.5 text-[12.5px] font-semibold hover:bg-[#f3edfa]"
              >
                Change password
              </Link>
            </section>
          </div>
        ) : null}
      </main>

      {rescheduleBooking ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reschedule-title"
        >
          <div className="w-full max-w-lg rounded-2xl border border-[#e4d8f2] bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7e22ce]">Reschedule booking</p>
                <h2 id="reschedule-title" className="mt-1 text-[19px] font-semibold">{rescheduleBooking.serviceName}</h2>
                <p className="mt-1 text-[12.5px] text-[#675f73]">
                  Currently {formatScheduledDate(rescheduleBooking.scheduledAt)}
                  {rescheduleBooking.timeSlot ? ` · ${rescheduleBooking.timeSlot}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRescheduleBooking(null)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#e4d8f2] text-[18px] text-[#675f73] hover:bg-[#f3edfa]"
                aria-label="Close reschedule dialog"
              >
                ×
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block text-[12px] font-medium text-[#675f73]">New date
                <input
                  type="date"
                  min={todayISO()}
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="mt-1 h-12 w-full rounded-xl border border-[#d8c7ea] bg-white px-3 text-[13.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9333ea]"
                />
              </label>

              {rescheduleLoading ? (
                <p role="status" className="text-[12.5px] text-[#675f73]">Checking live availability…</p>
              ) : null}
              {rescheduleError ? (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-800">
                  {rescheduleError}
                </p>
              ) : null}
              {!rescheduleLoading && rescheduleAvailability ? (
                rescheduleAvailability.slots.some((slot) => slot.available) ? (
                  <label className="block text-[12px] font-medium text-[#675f73]">Open time
                    <select
                      value={rescheduleSlotId}
                      onChange={(e) => setRescheduleSlotId(e.target.value)}
                      className="mt-1 h-12 w-full rounded-xl border border-[#d8c7ea] bg-white px-3 text-[13.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9333ea]"
                    >
                      <option value="">Select an open time</option>
                      {rescheduleAvailability.slots.filter((slot) => slot.available).map((slot) => (
                        <option key={slot.id} value={slot.id}>{slot.label}</option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <p className="rounded-xl border border-[#ece3f6] bg-[#faf5ff] px-3 py-2 text-[12.5px] leading-relaxed text-[#675f73]">
                    {rescheduleAvailability.message || 'No open slots on this date. Try another day.'}
                  </p>
                )
              ) : null}

              <label className="block text-[12px] font-medium text-[#675f73]">Note (optional)
                <textarea
                  value={rescheduleNote}
                  onChange={(e) => setRescheduleNote(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-[#d8c7ea] bg-white px-3 py-2 text-[13.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9333ea]"
                  placeholder="Anything the provider should know about the new time"
                />
              </label>

              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRescheduleBooking(null)}
                  disabled={busy}
                  className="inline-flex h-12 items-center rounded-xl border border-[#d8c7ea] px-4 text-[13px] font-semibold text-[#675f73] hover:bg-[#f3edfa] disabled:opacity-60"
                >
                  Keep current time
                </button>
                <button
                  type="button"
                  onClick={submitReschedule}
                  disabled={busy || !rescheduleSlotId}
                  className="inline-flex h-12 items-center rounded-xl bg-[#6d28d9] px-4 text-[13px] font-semibold text-white hover:bg-[#9333ea] disabled:opacity-60"
                >
                  {busy ? 'Rescheduling…' : 'Confirm new time'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
