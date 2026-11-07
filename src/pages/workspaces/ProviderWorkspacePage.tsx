import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, providerApi } from '../../lib/api';
import { formatScheduledDate } from '../../lib/dates';
import { useAuth } from '../../auth/AuthContext';
import { WorkspaceShell, type WorkspaceNavItem } from '../../components/workspace/WorkspaceShell';
import { ProviderGalleryManager } from '../../components/provider/ProviderGalleryManager';

type ProfilePayload = {
  profile: {
    id: string; slug: string; providerType: string; displayName: string; businessName: string | null;
    city: string; about: string; serviceArea: string; workingDays: string | null; workingHours: string | null;
    startingPrice: number | null; currency: string; primaryImage: string | null;
    publicPhone: boolean; publicWhatsapp: boolean; completed: boolean;
  } | null;
  verificationStatus: string;
  verification: {
    status: string;
    identityStatus: string;
    verificationChoice: 'verify_identity' | 'verify_later' | null;
    businessStatus: string | null;
    rejectionReason: string | null;
    adminNotes: string | null;
    hasIdDocument: boolean;
    hasSelfie: boolean;
  } | null;
};

type Service = {
  id: string; name: string; description: string; durationMinutes: number; price: number;
  currency: string; active: boolean; sortOrder: number;
};

type Booking = {
  id: string; reference: string | null; status: string; serviceName: string; price: number; currency: string;
  scheduledAt: string | null; timeSlot: string | null; customerName: string | null; teamMemberName?: string | null;
};

type TeamMember = { id: string; display_name?: string; displayName?: string; gender?: string; status?: string; services_json?: string[] };

const card = 'rounded-2xl border border-[#e6dfd2] bg-white p-5';
const label = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7a52]';
const input = 'h-12 w-full rounded-xl border border-[#d9cfba] bg-white px-3 text-[13.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8862f]';
const btn = 'inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#221f19] px-4 text-[13px] font-semibold text-white hover:bg-[#3a342a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8862f] disabled:opacity-60';
const btnGhost = 'inline-flex h-12 items-center justify-center rounded-xl border border-[#d9cfba] px-4 text-[13px] font-semibold hover:bg-[#f2eee4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8862f] disabled:opacity-60';
const th = 'px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6b6252]';
const td = 'px-3 py-3 align-top text-[13px]';

export const ProviderWorkspacePage: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState(() =>
    new URLSearchParams(window.location.search).get('tab') === 'verification' ? 'verification' : 'overview',
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [profileData, setProfileData] = useState<ProfilePayload | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [isAgency, setIsAgency] = useState(false);
  const [form, setForm] = useState({ displayName: '', city: '', about: '', serviceArea: '', workingDays: '', workingHours: '', startingPrice: 0 });
  const [serviceForm, setServiceForm] = useState({ id: '', name: '', description: '', durationMinutes: 60, price: 0, active: false });
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyForm, setVerifyForm] = useState({
    idType: 'Ghana Card',
    idNumber: '',
    idImage: null as File | null,
    selfieImage: null as File | null,
  });

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
    const me = await apiRequest<ProfilePayload>('/provider/profile.php');
    setProfileData(me);
    if (me.profile) {
      setIsAgency(me.profile.providerType === 'agency');
      setForm({
        displayName: me.profile.displayName,
        city: me.profile.city,
        about: me.profile.about,
        serviceArea: me.profile.serviceArea,
        workingDays: me.profile.workingDays ?? '',
        workingHours: me.profile.workingHours ?? '',
        startingPrice: me.profile.startingPrice ?? 0,
      });
    }
    const [svc, bk] = await Promise.all([
      apiRequest<{ services: Service[] }>('/provider/services.php'),
      apiRequest<{ bookings: Booking[]; teamMembers: TeamMember[]; isAgency: boolean }>('/provider/bookings.php'),
    ]);
    setServices(svc.services);
    setBookings(bk.bookings);
    setTeam(bk.teamMembers);
    setIsAgency(bk.isAgency);
  }, []);

  useEffect(() => {
    run(load);
  }, [run, load]);

  const nav = useMemo<WorkspaceNavItem[]>(() => [
    { id: 'overview', label: 'Overview' },
    { id: 'profile', label: 'Public profile' },
    { id: 'gallery', label: isAgency ? 'Branding & Gallery' : 'Profile & Gallery' },
    { id: 'services', label: 'Services & rates' },
    { id: 'bookings', label: 'Bookings' },
    ...(isAgency ? [{ id: 'team', label: 'Team' }] : []),
    { id: 'verification', label: 'Verification' },
  ], [isAgency]);

  const verification = profileData?.verificationStatus ?? 'unverified';
  const verificationInfo = profileData?.verification;
  const verificationLabel =
    verification === 'verified'
      ? 'Verified'
      : verification === 'pending_review'
        ? 'Pending Verification'
        : verification === 'changes_requested'
          ? 'Changes requested'
          : verification === 'rejected'
            ? 'Rejected'
            : 'Unverified';
  const membershipFree = true;

  const act = (fn: () => Promise<void>, message: string) =>
    run(async () => {
      await fn();
      setNotice(message);
      await load();
    });

  const submitVerification = () =>
    run(async () => {
      if (!verifyForm.idImage || !verifyForm.selfieImage) {
        throw new Error('Upload a government ID image and a selfie / live photo.');
      }
      const form = new FormData();
      form.append('choice', 'verify_identity');
      form.append('idType', verifyForm.idType);
      form.append('idNumber', verifyForm.idNumber);
      form.append('idImage', verifyForm.idImage);
      form.append('selfieImage', verifyForm.selfieImage);
      await providerApi.submitIdentity(form);
      try {
        await providerApi.submitReview();
        setNotice('Identity submitted. Your application is now Pending Verification.');
      } catch {
        setNotice('Documents uploaded. Complete your profile, then submit for review from the dashboard.');
      }
      setVerifyOpen(false);
      setVerifyForm({ idType: 'Ghana Card', idNumber: '', idImage: null, selfieImage: null });
      await load();
    });

  return (
    <WorkspaceShell
      roleLabel={isAgency ? 'Agency workspace' : 'Individual provider workspace'}
      title={nav.find((n) => n.id === tab)?.label ?? 'Overview'}
      subtitle={profileData?.profile?.displayName ?? user?.email}
      nav={nav}
      active={tab}
      onNavigate={(id) => { setNotice(null); setTab(id); }}
      actions={<Link to="/provider/dashboard" className={btnGhost}>Verification steps</Link>}
    >
      {error ? <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">{error}</div> : null}
      {notice ? <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">{notice}</div> : null}
      {busy ? <div className="mb-4 h-1 w-full overflow-hidden rounded bg-[#e6dfd2]"><div className="h-full w-1/3 animate-pulse bg-[#b8862f]" /></div> : null}

      {tab === 'overview' ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <section className={`${card} lg:col-span-2`}>
            <h2 className="text-[15px] font-semibold">Your workspace</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-3">
              <div><dt className={label}>Verification</dt><dd className="mt-1 text-[14px] font-semibold capitalize">{verification.replace('_', ' ')}</dd></div>
              <div><dt className={label}>Services</dt><dd className="mt-1 text-[14px] font-semibold">{services.length}</dd></div>
              <div><dt className={label}>Bookings</dt><dd className="mt-1 text-[14px] font-semibold">{bookings.length}</dd></div>
            </dl>
            <p className="mt-4 rounded-xl border border-[#eee7d9] bg-[#fbf8f1] px-3 py-2.5 text-[12.5px] leading-relaxed text-[#6b6252]">
              Your profile is public only after identity review and admin approval. The verified badge cannot be
              self-granted from this workspace.
            </p>
          </section>
          <section className={card}>
            <h2 className="text-[15px] font-semibold">Membership</h2>
            <p className="mt-2 text-[13px] text-[#6b6252]">Membership is currently free.</p>
            <ul className="mt-3 space-y-2 text-[12.5px] text-[#6b6252]">
              <li>No membership payment is required.</li>
              <li>Identity checks and admin review still apply.</li>
              <li>Email confirmation is required to accept bookings.</li>
            </ul>
          </section>
        </div>
      ) : null}

      {tab === 'profile' ? (
        <form className={`${card} max-w-2xl space-y-3`} onSubmit={(e) => {
          e.preventDefault();
          act(async () => {
            await apiRequest('/provider/profile.php', {
              method: 'POST',
              body: JSON.stringify({
                providerType: isAgency ? 'agency' : 'individual',
                displayName: form.displayName,
                businessName: isAgency ? form.displayName : undefined,
                city: form.city,
                about: form.about,
                serviceArea: form.serviceArea,
                workingDays: form.workingDays,
                workingHours: form.workingHours,
                startingPrice: form.startingPrice,
                publicPhone: profileData?.profile?.publicPhone ?? false,
                publicWhatsapp: profileData?.profile?.publicWhatsapp ?? false,
              }),
            });
          }, 'Profile saved.');
        }}>
          <h2 className="text-[15px] font-semibold">Public profile</h2>
          <label className="block text-[12px] font-medium text-[#6b6252]">Display name
            <input className={`${input} mt-1`} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required />
          </label>
          <label className="block text-[12px] font-medium text-[#6b6252]">City
            <input className={`${input} mt-1`} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </label>
          <label className="block text-[12px] font-medium text-[#6b6252]">About
            <textarea className={`${input} mt-1 h-32 py-2`} value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-[12px] font-medium text-[#6b6252]">Service area
              <input className={`${input} mt-1`} value={form.serviceArea} onChange={(e) => setForm({ ...form, serviceArea: e.target.value })} />
            </label>
            <label className="block text-[12px] font-medium text-[#6b6252]">Starting price (GHS)
              <input className={`${input} mt-1`} type="number" min={0} value={form.startingPrice} onChange={(e) => setForm({ ...form, startingPrice: Number(e.target.value) })} />
            </label>
            <label className="block text-[12px] font-medium text-[#6b6252]">Working days
              <input className={`${input} mt-1`} value={form.workingDays} onChange={(e) => setForm({ ...form, workingDays: e.target.value })} />
            </label>
            <label className="block text-[12px] font-medium text-[#6b6252]">Working hours
              <input className={`${input} mt-1`} value={form.workingHours} onChange={(e) => setForm({ ...form, workingHours: e.target.value })} />
            </label>
          </div>
          <button className={btn} type="submit" disabled={busy}>Save profile</button>
          {profileData?.profile?.slug ? (
            <Link to={`/profile/${profileData.profile.slug}`} className="ml-2 inline-flex h-12 items-center text-[13px] font-semibold text-[#8a6a1f] hover:underline">View public page</Link>
          ) : null}
        </form>
      ) : null}

      {tab === 'gallery' ? (
        <ProviderGalleryManager mode={isAgency ? 'agency' : 'individual'} onChanged={() => void run(load)} />
      ) : null}

      {tab === 'services' ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className={`${card} overflow-x-auto p-0`}>
            <table className="w-full min-w-[560px]">
              <thead className="bg-[#f2eee4]"><tr><th className={th}>Service</th><th className={th}>Duration</th><th className={th}>Price</th><th className={th}>Status</th><th className={th}></th></tr></thead>
              <tbody>
                {services.length === 0 ? (
                  <tr><td className={`${td} text-[#6b6252]`} colSpan={5}>No services yet. Add your real services and rates.</td></tr>
                ) : services.map((s) => (
                  <tr key={s.id} className="border-t border-[#eee7d9]">
                    <td className={td}><p className="font-medium">{s.name}</p><p className="text-[12px] text-[#6b6252]">{s.description}</p></td>
                    <td className={td}>{s.durationMinutes} min</td>
                    <td className={td}>{s.currency} {s.price.toLocaleString()}</td>
                    <td className={td}>{s.active ? 'Active' : 'Inactive'}</td>
                    <td className={td}>
                      <div className="flex gap-2">
                        <button className={btnGhost} onClick={() => setServiceForm({ id: s.id, name: s.name, description: s.description, durationMinutes: s.durationMinutes, price: s.price, active: s.active })}>Edit</button>
                        <button className={btnGhost} disabled={busy} onClick={() => act(async () => {
                          await apiRequest('/provider/services.php', { method: 'DELETE', body: JSON.stringify({ id: s.id }) });
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
              await apiRequest('/provider/services.php', { method: 'POST', body: JSON.stringify(serviceForm) });
              setServiceForm({ id: '', name: '', description: '', durationMinutes: 60, price: 0, active: false });
            }, 'Service saved.');
          }}>
            <h2 className="text-[15px] font-semibold">{serviceForm.id ? 'Edit service' : 'New service'}</h2>
            <input className={input} placeholder="Service name" value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} required />
            <textarea className={`${input} h-24 py-2`} placeholder="Description" value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className={input} type="number" min={15} max={480} value={serviceForm.durationMinutes} onChange={(e) => setServiceForm({ ...serviceForm, durationMinutes: Number(e.target.value) })} aria-label="Duration" />
              <input className={input} type="number" min={0} value={serviceForm.price} onChange={(e) => setServiceForm({ ...serviceForm, price: Number(e.target.value) })} aria-label="Price" />
            </div>
            <label className="flex min-h-12 items-center gap-3 text-[13px]">
              <input type="checkbox" className="h-5 w-5" checked={serviceForm.active} onChange={(e) => setServiceForm({ ...serviceForm, active: e.target.checked })} />
              Show on my public profile
            </label>
            <button className={btn} type="submit" disabled={busy}>Save service</button>
          </form>
        </div>
      ) : null}

      {tab === 'bookings' ? (
        <div className={`${card} overflow-x-auto p-0`}>
          <table className="w-full min-w-[780px]">
            <thead className="bg-[#f2eee4]"><tr><th className={th}>Booking</th><th className={th}>Customer</th><th className={th}>When</th><th className={th}>Team</th><th className={th}>Status</th><th className={th}>Actions</th></tr></thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr><td className={`${td} text-[#6b6252]`} colSpan={6}>No bookings assigned yet.</td></tr>
              ) : bookings.map((b) => (
                <tr key={b.id} className="border-t border-[#eee7d9]">
                  <td className={td}><p className="font-medium">{b.serviceName}</p><p className="text-[12px] text-[#6b6252]">{b.reference ?? b.id}</p></td>
                  <td className={td}>{b.customerName ?? '—'}</td>
                  <td className={td}>{formatScheduledDate(b.scheduledAt)}<p className="text-[12px] text-[#6b6252]">{b.timeSlot ?? ''}</p></td>
                  <td className={td}>{b.teamMemberName ?? '—'}</td>
                  <td className={td}>{b.status.replace('_', ' ')}</td>
                  <td className={td}>
                    <select
                      className="h-11 rounded-lg border border-[#d9cfba] bg-white px-2 text-[12.5px]"
                      defaultValue=""
                      disabled={busy}
                      onChange={(e) => {
                        const next = e.target.value;
                        if (!next) return;
                        act(async () => {
                          await apiRequest('/provider/bookings.php', { method: 'POST', body: JSON.stringify({ bookingId: b.id, action: 'status', status: next }) });
                        }, 'Booking updated.');
                      }}
                    >
                      <option value="">Update…</option>
                      {['confirmed', 'completed', 'cancelled', 'no_show'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === 'team' && isAgency ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className={`${card} p-0`}>
            <ul className="divide-y divide-[#eee7d9]">
              {team.length === 0 ? <li className="px-5 py-6 text-[13px] text-[#6b6252]">No team members yet.</li> : team.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div><p className="text-[13.5px] font-medium">{m.display_name ?? m.displayName ?? 'Team member'}</p><p className="text-[12px] text-[#6b6252]">{m.gender ?? ''} · {m.status ?? 'active'}</p></div>
                  <button className={btnGhost} disabled={busy} onClick={() => act(async () => {
                    await apiRequest('/provider/team.php', { method: 'DELETE', body: JSON.stringify({ id: m.id }) });
                  }, 'Team member removed.')}>Remove</button>
                </li>
              ))}
            </ul>
          </div>
          <form className={`${card} space-y-3`} onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            act(async () => {
              await apiRequest('/provider/team.php', {
                method: 'POST',
                body: JSON.stringify({
                  displayName: String(data.get('displayName') ?? ''),
                  gender: String(data.get('gender') ?? 'female'),
                  status: 'active',
                }),
              });
              (e.target as HTMLFormElement).reset();
            }, 'Team member added.');
          }}>
            <h2 className="text-[15px] font-semibold">Add team member</h2>
            <input name="displayName" className={input} placeholder="Name" required />
            <select name="gender" className={input} defaultValue="female"><option value="female">Female</option><option value="male">Male</option></select>
            <button className={btn} type="submit" disabled={busy}>Add member</button>
            <p className="text-[11.5px] leading-relaxed text-[#6b6252]">Team members do not receive login access; they are assignable resources on agency bookings.</p>
          </form>
        </div>
      ) : null}

      {tab === 'verification' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className={card}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[15px] font-semibold">Identity verification</h2>
              <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
                verification === 'verified'
                  ? 'bg-emerald-50 text-emerald-800'
                  : verification === 'pending_review'
                    ? 'bg-amber-50 text-amber-800'
                    : verification === 'rejected'
                      ? 'bg-red-50 text-red-800'
                      : 'bg-[#f2eee4] text-[#6b6252]'
              }`}>
                {verificationLabel}
              </span>
            </div>

            {verification === 'verified' ? (
              <p className="mt-3 text-[13px] leading-relaxed text-[#6b6252]">
                Your identity has been approved. The Verified badge appears beside your name on public profiles.
              </p>
            ) : verification === 'pending_review' ? (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] leading-relaxed text-amber-900">
                Pending Verification. Your documents are with the admin review team. You will stay Unverified publicly until approval.
              </p>
            ) : (
              <>
                <p className="mt-3 text-[13px] leading-relaxed text-[#6b6252]">
                  Your profile is currently Unverified. Complete identity verification to receive a Verified badge after approval.
                </p>
                {verificationInfo?.verificationChoice === 'verify_later' ? (
                  <p className="mt-2 text-[12.5px] leading-relaxed text-[#6b6252]">
                    You chose Verify Later. Your selfie is on file; add a government ID whenever you are ready.
                  </p>
                ) : null}
                {verificationInfo?.rejectionReason ? (
                  <p className="mt-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[12.5px] leading-relaxed text-red-800">
                    {verification === 'changes_requested' ? 'Changes requested: ' : 'Reason: '}
                    {verificationInfo.rejectionReason}
                  </p>
                ) : null}
                {verification === 'rejected' || verification === 'changes_requested' ? (
                  <p className="mt-2 text-[12.5px] leading-relaxed text-[#6b6252]">
                    Upload a new government ID and selfie to resubmit. You do not need to repeat registration.
                  </p>
                ) : null}

                {!verifyOpen ? (
                  <button type="button" className={`${btn} mt-4`} onClick={() => setVerifyOpen(true)} disabled={busy}>
                    Verify My Identity
                  </button>
                ) : (
                  <form
                    className="mt-4 space-y-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitVerification();
                    }}
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-[12px] font-medium text-[#6b6252]">
                        ID type
                        <select
                          className={`${input} mt-1`}
                          value={verifyForm.idType}
                          onChange={(e) => setVerifyForm({ ...verifyForm, idType: e.target.value })}
                        >
                          <option>Ghana Card</option>
                          <option>Passport</option>
                          <option>Driver Licence</option>
                          <option>Voter ID</option>
                        </select>
                      </label>
                      <label className="block text-[12px] font-medium text-[#6b6252]">
                        ID number (optional)
                        <input
                          className={`${input} mt-1`}
                          value={verifyForm.idNumber}
                          onChange={(e) => setVerifyForm({ ...verifyForm, idNumber: e.target.value })}
                        />
                      </label>
                    </div>
                    <label className="block text-[12px] font-medium text-[#6b6252]">
                      Government ID image
                      <input
                        className={`${input} mt-1 py-2.5`}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        required
                        onChange={(e) => setVerifyForm({ ...verifyForm, idImage: e.target.files?.[0] ?? null })}
                      />
                    </label>
                    <label className="block text-[12px] font-medium text-[#6b6252]">
                      Selfie / live photo
                      <input
                        className={`${input} mt-1 py-2.5`}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        required
                        onChange={(e) => setVerifyForm({ ...verifyForm, selfieImage: e.target.files?.[0] ?? null })}
                      />
                    </label>
                    <p className="text-[11.5px] leading-relaxed text-[#6b6252]">
                      JPG, PNG or WebP under 5MB. These documents are private, separate from your gallery, and visible only to authorised admins. Uploading does not grant a Verified badge.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button className={btn} type="submit" disabled={busy}>
                        {busy ? 'Submitting…' : 'Submit for verification'}
                      </button>
                      <button className={btnGhost} type="button" onClick={() => setVerifyOpen(false)} disabled={busy}>
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}

            <p className="mt-4 text-[12px] leading-relaxed text-[#6b6252]">
              Identity documents are stored privately. Only authorised admins can open them, and every view is recorded in the audit log.
            </p>
          </section>
          <section className={card}>
            <h2 className="text-[15px] font-semibold">Membership</h2>
            <p className="mt-2 text-[13px]">{membershipFree ? 'Membership is currently free.' : 'Membership fee required.'}</p>
            <p className="mt-2 text-[12.5px] text-[#6b6252]">Identity checks and admin approval are still required, and no payment gateway is integrated.</p>
          </section>
        </div>
      ) : null}
    </WorkspaceShell>
  );
};

export default ProviderWorkspacePage;
