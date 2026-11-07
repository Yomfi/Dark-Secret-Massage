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
import { formatScheduledDate } from '../lib/dates';

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

const surface = 'rounded-2xl border border-[#e6dfd2] bg-white p-5 shadow-[0_1px_2px_rgba(24,20,12,0.04)]';
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

  const reschedule = async (bookingId: string) => {
    const note = window.prompt('What date or time would suit you better?') ?? '';
    if (!note.trim()) return;
    setBusy(true);
    try {
      await apiRequest(`/customer/bookings.php`, {
        method: 'POST',
        body: JSON.stringify({ action: 'reschedule', bookingId, note }),
      });
      setNotice('Reschedule request sent.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to request a reschedule.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7f0] text-[#221f19]">
      <header className="sticky top-0 z-40 border-b border-[#e6dfd2] bg-[#f2eee4]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToHome}
              className="inline-flex h-11 items-center gap-2 rounded-lg px-2 text-[12px] font-semibold uppercase tracking-wider text-[#6b6252] hover:text-[#221f19] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8862f]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden /> Home
            </button>
            <BrandLogo variant="plate" withWordmark markHeight={24} />
          </div>
          <div className="flex items-center gap-3">
            {profile ? (
              <div className="hidden text-right sm:block">
                <p className="text-[13px] font-semibold">{profile.user.firstName} {profile.user.lastName}</p>
                <p className="text-[11px] text-[#6b6252]">{profile.user.email}</p>
              </div>
            ) : null}
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#221f19] text-[13px] font-semibold text-[#e5c17a]">
              {profile?.user.firstName?.[0] ?? 'M'}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a7a52]">My account</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Your bookings</h1>
        </div>

        <nav className="mb-6 flex gap-2 border-b border-[#e6dfd2] pb-3" aria-label="Account sections">
          {[
            { id: 'bookings' as const, label: 'Bookings', icon: Calendar },
            { id: 'location' as const, label: 'Location', icon: MapPin },
            { id: 'profile' as const, label: 'Profile', icon: UserIcon },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex h-11 items-center gap-2 rounded-lg px-4 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8862f] ${
                tab === id ? 'bg-[#221f19] text-white' : 'text-[#6b6252] hover:bg-[#ece6d8]'
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
          <p className="py-16 text-center text-[13.5px] text-[#6b6252]">Loading your account…</p>
        ) : null}

        {tab === 'bookings' && data ? (
          data.bookings.length === 0 ? (
            <div className={`${surface} text-center`}>
              <Calendar className="mx-auto h-10 w-10 text-[#b7a883]" aria-hidden />
              <h2 className="mt-3 text-[17px] font-semibold">No bookings yet</h2>
              <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-[#6b6252]">
                When you request a massage, it will appear here with its status and reference so you can
                track it from request to completion.
              </p>
              <button
                type="button"
                onClick={onOpenBooking}
                className="mt-5 inline-flex h-12 items-center rounded-xl bg-[#221f19] px-5 text-[13.5px] font-semibold text-white hover:bg-[#3a342a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8862f]"
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
                      <p className="mt-0.5 text-[12px] text-[#6b6252]">
                        {booking.reference ? `Ref ${booking.reference}` : 'Reference pending'}
                      </p>
                    </div>
                    <p className="text-[14px] font-semibold">{booking.currency} {booking.price.toLocaleString()}</p>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-[#eee7d9] bg-[#fbf8f1] p-3 text-[12px]">
                    <div>
                      <dt className="text-[#8a7a52]">When</dt>
                      <dd className="mt-0.5 font-medium">
                        <Clock className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                        {formatScheduledDate(booking.scheduledAt)}
                        {booking.timeSlot ? ` · ${booking.timeSlot}` : ''}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#8a7a52]">Where</dt>
                      <dd className="mt-0.5 font-medium capitalize">
                        <MapPin className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                        {booking.locationType === 'home' ? 'Home visit' : 'Studio'}
                      </dd>
                    </div>
                    {booking.providerName ? (
                      <div className="col-span-2">
                        <dt className="text-[#8a7a52]">Provider</dt>
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
                          onClick={() => reschedule(booking.id)}
                          className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#d9cfba] px-3.5 text-[12.5px] font-semibold hover:bg-[#f2eee4] disabled:opacity-60"
                        >
                          <RefreshCw className="h-4 w-4" aria-hidden /> Request reschedule
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
                <thead className="bg-[#f2eee4] text-[11px] uppercase tracking-wider text-[#6b6252]">
                  <tr>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.receipts.map((r) => (
                    <tr key={r.id} className="border-t border-[#eee7d9]">
                      <td className="px-4 py-3 font-medium">{r.reference ?? '—'}</td>
                      <td className="px-4 py-3">{r.serviceName}</td>
                      <td className="px-4 py-3">{r.currency} {r.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[#6b6252]">{r.date ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11.5px] text-[#8a7a52]">
              Receipts list completed bookings only. No online payment gateway is integrated, so no card
              transactions are recorded.
            </p>
          </section>
        ) : null}

        {tab === 'location' ? (
          <section className={surface}>
            <h2 className="text-[15px] font-semibold">Your location</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[#6b6252]">
              Explore uses this to show nearby, eligible providers first. Your exact pin and home address
              are private and are never shown to providers or other customers.
            </p>

            {location?.region || location?.city ? (
              <div className="mt-4 rounded-xl border border-[#eee7d9] bg-[#fbf8f1] px-3 py-2.5 text-[13px]">
                <p className="font-semibold text-[#221f19]">
                  {[location.area, location.city, location.district, location.region].filter(Boolean).join(', ')}
                </p>
                <p className="mt-0.5 text-[11.5px] text-[#8a7a52]">
                  {location.latitude != null && location.longitude != null
                    ? 'Exact pin saved — distances use approximate straight-line measurement.'
                    : 'No exact pin saved — matching uses your town and region.'}
                </p>
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-[#d9cfba] px-3 py-3 text-[13px] text-[#6b6252]">
                No saved location yet. You can still browse Explore, but nearest-first results need a town.
              </p>
            )}

            <form onSubmit={saveLocation} className="mt-4 space-y-4">
              <LocationFields value={locationForm} onChange={setLocationForm} disabled={busy} />
              <label className="block">
                <span className="text-[12px] font-medium text-[#6b6252]">Location note (optional)</span>
                <textarea
                  className="mt-1.5 min-h-24 w-full rounded-xl border border-[#d9cfba] bg-white px-3 py-2.5 text-[14px] text-[#221f19] outline-none focus:border-[#b8862f] focus:ring-2 focus:ring-[#b8862f]/25"
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
                  className="inline-flex h-12 items-center rounded-xl bg-[#221f19] px-5 text-[13.5px] font-semibold text-white hover:bg-[#3a342a] disabled:opacity-60"
                >
                  {busy ? 'Saving…' : 'Save location'}
                </button>
                {location ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={clearLocation}
                    className="inline-flex h-12 items-center rounded-xl border border-[#d9cfba] px-4 text-[13px] font-semibold text-[#6b6252] hover:bg-[#f2eee4] disabled:opacity-60"
                  >
                    Remove saved location
                  </button>
                ) : null}
                <Link
                  to="/explore/accra"
                  className="inline-flex h-12 items-center rounded-xl border border-[#d9cfba] px-4 text-[13px] font-semibold text-[#221f19] hover:bg-[#f2eee4]"
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
              <dl className="mt-3 space-y-3 text-[13px]">
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-[#8a7a52]">Name</dt>
                  <dd className="mt-0.5 font-medium">{profile.user.firstName} {profile.user.lastName}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-[#8a7a52]">Email</dt>
                  <dd className="mt-0.5 font-medium">{profile.user.email}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-[#8a7a52]">Phone (contact only)</dt>
                  <dd className="mt-0.5 font-medium">{profile.user.phone || 'Not provided'}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-[#8a7a52]">Email status</dt>
                  <dd className={`mt-0.5 inline-flex items-center gap-1.5 font-medium ${profile.emailVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {profile.emailVerified ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
                    {profile.emailVerified ? 'Confirmed' : 'Not confirmed'}
                  </dd>
                </div>
              </dl>
              {!profile.emailVerified ? (
                <Link
                  to="/verify-email?sent=0"
                  className="mt-4 inline-flex h-11 items-center rounded-lg border border-[#d9cfba] px-3.5 text-[12.5px] font-semibold hover:bg-[#f2eee4]"
                >
                  Confirm your email
                </Link>
              ) : null}
            </section>
            <section className={surface}>
              <h2 className="text-[15px] font-semibold">Security</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-[#6b6252]">
                Use the password reset flow to change your password securely. Your phone number is contact
                information only and is never used as a sign-in gate.
              </p>
              <Link
                to="/forgot-password"
                className="mt-4 inline-flex h-11 items-center rounded-lg border border-[#d9cfba] px-3.5 text-[12.5px] font-semibold hover:bg-[#f2eee4]"
              >
                Change password
              </Link>
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
};
