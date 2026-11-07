import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../lib/api';
import { StatusBadge } from './StatusBadge';
import { adminBtnClass, adminBtnGhostClass, adminBtnCompactClass, adminBtnGhostCompactClass, adminInputClass, FormField } from './FormField';

type ProviderDetail = {
  provider: {
    userId: string;
    profileId: string | null;
    displayName: string;
    email: string;
    kind: string;
    city: string;
    slug: string | null;
    accountStatus: string;
    listingStatus: string;
    removed: boolean;
    verificationStatus: string;
    published: boolean;
    primaryImage: string | null;
    suspendReason?: string | null;
    suspendedUntil?: string | null;
    blockReason?: string | null;
  };
  profile: {
    displayName: string;
    about: string;
    city: string;
    serviceArea: string;
    workingDays: string;
    workingHours: string;
    primaryImage: string | null;
    coverImage: string | null;
    removeReason?: string | null;
  } | null;
  verification: { status: string; identityStatus: string; rejectionReason: string | null; adminNotes: string | null };
  images: Array<{
    id: string; kind: string; url: string; thumbUrl: string; altText: string;
    moderationStatus: string; moderationReason?: string | null;
  }>;
  services: Array<{ id: string; name: string; durationMinutes: number; price: number; currency: string; active: boolean }>;
  bookings: Array<{ id: string; reference: string | null; status: string; serviceName: string; customerName: string | null; scheduledAt: string | null }>;
  moderationHistory: Array<{ id: string; action: string; reason: string | null; notes: string | null; createdAt: string | null }>;
  teamMembers: Array<{ id: string; displayName: string; status: string; gender?: string; bio?: string | null; yearsExperience?: number | null }>;
  badges: string[];
};

type Props = {
  userId: string;
  canDelete: boolean;
  busy: boolean;
  onClose: () => void;
  onChanged: () => void;
  act: (fn: () => Promise<void>, message: string) => void;
};

const TABS = [
  'Overview',
  'Profile Information',
  'Photos & Gallery',
  'Services & Pricing',
  'Verification',
  'Bookings',
  'Team',
  'Account Status',
  'Moderation History',
] as const;

export const AdminProviderDetail: React.FC<Props> = ({ userId, canDelete, busy, onClose, onChanged, act }) => {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const [detail, setDetail] = useState<ProviderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [until, setUntil] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [profileForm, setProfileForm] = useState({ displayName: '', city: '', about: '', serviceArea: '', workingDays: '', workingHours: '' });

  const load = async () => {
    setError(null);
    const data = await apiRequest<ProviderDetail>(`/admin/providers.php?id=${encodeURIComponent(userId)}`);
    setDetail(data);
    if (data.profile) {
      setProfileForm({
        displayName: data.profile.displayName || '',
        city: data.profile.city || '',
        about: data.profile.about || '',
        serviceArea: data.profile.serviceArea || '',
        workingDays: data.profile.workingDays || '',
        workingHours: data.profile.workingHours || '',
      });
    }
  };

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : 'Unable to load provider.'));
  }, [userId]);

  const post = (body: Record<string, unknown>, message: string) =>
    act(async () => {
      await apiRequest('/admin/providers.php', { method: 'POST', body: JSON.stringify({ providerUserId: userId, ...body }) });
      setReason('');
      setNotes('');
      setUntil('');
      setDeleteConfirm('');
      await load();
      onChanged();
    }, message);

  if (error) {
    return (
      <aside className="min-w-0 rounded-[16px] border border-[#e8e0d2] bg-white p-5 shadow-[0_8px_30px_rgba(22,22,22,0.06)]">
        <p className="text-[13px] text-red-700">{error}</p>
        <button type="button" className={`${adminBtnGhostClass} mt-3`} onClick={onClose}>Close</button>
      </aside>
    );
  }

  if (!detail) {
    return (
      <aside className="min-w-0 rounded-[16px] border border-[#e8e0d2] bg-white p-8 text-center text-[13px] text-[#6f675c] shadow-[0_8px_30px_rgba(22,22,22,0.06)]">
        Loading provider…
      </aside>
    );
  }

  const p = detail.provider;

  return (
    <aside className="min-w-0 max-w-full overflow-hidden rounded-[16px] border border-[#e8e0d2] bg-white shadow-[0_8px_30px_rgba(22,22,22,0.06)] xl:sticky xl:top-24">
      <div className="border-b border-[#efe8dc] p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[#161616] text-[11px] font-semibold text-[#F7F4EF]">
                {p.primaryImage ? <img src={p.primaryImage} alt="" className="h-full w-full object-cover" /> : p.displayName.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <h2 className="truncate font-display text-[24px] font-semibold tracking-tight">{p.displayName}</h2>
                <p className="truncate text-[12.5px] text-[#6f675c]" title={p.email}>{p.email} · {p.kind}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {detail.badges.map((b) => (
                <StatusBadge key={b} status={b.toLowerCase().replace(/\s+/g, '_')} label={b} />
              ))}
            </div>
          </div>
          <button type="button" className={adminBtnGhostCompactClass} onClick={onClose} aria-label="Close">Close</button>
        </div>
        <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-semibold ${
                tab === t ? 'bg-[#161616] text-[#F7F4EF]' : 'bg-[#faf7f2] text-[#6f675c] hover:text-[#161616]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
        {tab === 'Overview' ? (
          <div className="space-y-3 text-[13px]">
            <p><span className="text-[#8a7a52]">City</span> · {p.city || '—'}</p>
            <p><span className="text-[#8a7a52]">Verification</span> · {p.verificationStatus.replace(/_/g, ' ')}</p>
            <p><span className="text-[#8a7a52]">Listing</span> · {p.listingStatus}</p>
            <p><span className="text-[#8a7a52]">Account</span> · {p.accountStatus}</p>
            {p.slug ? <Link to={`/profile/${p.slug}`} className="font-semibold text-[#8F6D35] hover:underline">Open public profile</Link> : null}
            <div className="flex flex-wrap gap-2 border-t border-[#efe8dc] pt-4">
              {!p.published ? (
                <button type="button" className={adminBtnCompactClass} disabled={busy} onClick={() => post({ action: 'publish' }, 'Provider published.')}>Publish</button>
              ) : (
                <button type="button" className={adminBtnGhostCompactClass} disabled={busy} onClick={() => post({ action: 'unpublish' }, 'Provider unpublished.')}>Unpublish</button>
              )}
              <Link to="/admin/provider-reviews" className={adminBtnGhostCompactClass}>Review identity</Link>
            </div>
          </div>
        ) : null}

        {tab === 'Profile Information' && detail.profile ? (
          <form className="space-y-3" onSubmit={(e) => {
            e.preventDefault();
            post({ action: 'update_profile', ...profileForm }, 'Profile updated.');
          }}>
            <FormField label="Display name"><input className={adminInputClass} value={profileForm.displayName} onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })} /></FormField>
            <FormField label="City"><input className={adminInputClass} value={profileForm.city} onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })} /></FormField>
            <FormField label="About"><textarea className={`${adminInputClass} h-28 py-2`} value={profileForm.about} onChange={(e) => setProfileForm({ ...profileForm, about: e.target.value })} /></FormField>
            <FormField label="Service area"><input className={adminInputClass} value={profileForm.serviceArea} onChange={(e) => setProfileForm({ ...profileForm, serviceArea: e.target.value })} /></FormField>
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Working days"><input className={adminInputClass} value={profileForm.workingDays} onChange={(e) => setProfileForm({ ...profileForm, workingDays: e.target.value })} /></FormField>
              <FormField label="Working hours"><input className={adminInputClass} value={profileForm.workingHours} onChange={(e) => setProfileForm({ ...profileForm, workingHours: e.target.value })} /></FormField>
            </div>
            <button type="submit" className={adminBtnClass} disabled={busy}>Save profile</button>
          </form>
        ) : null}

        {tab === 'Photos & Gallery' ? (
          <div className="space-y-3">
            {detail.images.length === 0 ? (
              <p className="text-[13px] text-[#6f675c]">No media uploaded yet.</p>
            ) : detail.images.map((img) => (
              <article key={img.id} className="overflow-hidden rounded-[14px] border border-[#efe8dc]">
                <img src={img.thumbUrl || img.url} alt={img.altText || img.kind} className="aspect-[16/10] w-full object-cover" loading="lazy" />
                <div className="space-y-2 p-3">
                  <p className="text-[12.5px] font-semibold capitalize">{img.kind} · {img.moderationStatus}</p>
                  {img.moderationReason ? <p className="text-[12px] text-[#6f675c]">{img.moderationReason}</p> : null}
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" className={adminBtnGhostCompactClass} disabled={busy} onClick={() => post({ action: 'moderate_image', imageId: img.id, moderation: 'approve' }, 'Image approved.')}>Approve</button>
                    <button type="button" className={adminBtnGhostCompactClass} disabled={busy} onClick={() => {
                      const r = window.prompt('Hide reason (optional)') ?? '';
                      post({ action: 'moderate_image', imageId: img.id, moderation: 'hide', reason: r }, 'Image hidden.');
                    }}>Hide</button>
                    <button type="button" className={adminBtnGhostCompactClass} disabled={busy} onClick={() => {
                      if (!window.confirm('Permanently remove this gallery image?')) return;
                      const r = window.prompt('Removal reason') || 'Removed by admin';
                      post({ action: 'moderate_image', imageId: img.id, moderation: 'remove', reason: r }, 'Image removed.');
                    }}>Remove</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {tab === 'Services & Pricing' ? (
          <ul className="space-y-2 text-[13px]">
            {detail.services.length === 0 ? <li className="text-[#6f675c]">No services yet.</li> : detail.services.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 rounded-[12px] border border-[#efe8dc] px-3 py-2">
                <span className="min-w-0 truncate">{s.name} · {s.durationMinutes}m</span>
                <span className="shrink-0">{s.currency} {s.price.toLocaleString()} · {s.active ? 'Active' : 'Off'}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {tab === 'Verification' ? (
          <div className="space-y-2 text-[13px]">
            <p>Status: <strong className="capitalize">{detail.verification.status.replace(/_/g, ' ')}</strong></p>
            <p>Identity: <strong className="capitalize">{detail.verification.identityStatus.replace(/_/g, ' ')}</strong></p>
            {detail.verification.rejectionReason ? <p className="text-[#6f675c]">{detail.verification.rejectionReason}</p> : null}
            <Link to="/admin/provider-reviews" className={`${adminBtnGhostClass} mt-2 inline-flex`}>Open review queue</Link>
            <p className="text-[12px] text-[#6f675c]">Publishing or restoring a profile never grants verification.</p>
          </div>
        ) : null}

        {tab === 'Bookings' ? (
          <ul className="space-y-2 text-[13px]">
            {detail.bookings.length === 0 ? <li className="text-[#6f675c]">No bookings yet.</li> : detail.bookings.map((b) => (
              <li key={b.id} className="rounded-[12px] border border-[#efe8dc] px-3 py-2">
                <p className="font-medium">{b.serviceName}</p>
                <p className="text-[12px] text-[#6f675c]">{b.customerName || '—'} · {b.status} · {b.reference ?? b.id}</p>
              </li>
            ))}
          </ul>
        ) : null}

        {tab === 'Account Status' ? (
          <div className="space-y-4">
            <div className="rounded-[14px] bg-[#faf7f2] p-3 text-[12.5px] text-[#6f675c]">
              Account, verification, and publication stay independent. Suspend / block / remove do not change verification status.
            </div>
            <FormField label="Reason"><input className={adminInputClass} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Required for suspend, block, remove, delete" /></FormField>
            <FormField label="Internal notes"><textarea className={`${adminInputClass} h-20 py-2`} value={notes} onChange={(e) => setNotes(e.target.value)} /></FormField>
            <FormField label="Suspension end (optional)"><input className={adminInputClass} type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} /></FormField>

            <div className="flex flex-wrap gap-2">
              <button type="button" className={adminBtnGhostCompactClass} disabled={busy} onClick={() => post({ action: 'remove', reason, notes }, 'Profile removed from public platform.')}>Remove Profile</button>
              {p.removed ? (
                <button type="button" className={adminBtnCompactClass} disabled={busy} onClick={() => post({ action: 'restore', notes }, 'Profile restored (still unpublished until you publish).')}>Restore Profile</button>
              ) : null}
              {p.accountStatus === 'suspended' ? (
                <button type="button" className={adminBtnCompactClass} disabled={busy} onClick={() => post({ action: 'activate', notes }, 'Provider reactivated.')}>Reactivate</button>
              ) : (
                <button type="button" className={adminBtnGhostCompactClass} disabled={busy} onClick={() => post({ action: 'suspend', reason, notes, until: until || undefined }, 'Provider suspended.')}>Suspend Profile</button>
              )}
              {p.accountStatus === 'banned' ? (
                <button type="button" className={adminBtnCompactClass} disabled={busy} onClick={() => post({ action: 'unblock', notes }, 'Provider unblocked.')}>Unblock</button>
              ) : (
                <button type="button" className={adminBtnGhostCompactClass} disabled={busy} onClick={() => post({ action: 'block', reason, notes }, 'Provider blocked.')}>Block Profile</button>
              )}
            </div>

            {canDelete ? (
              <div className="space-y-2 border-t border-[#efe8dc] pt-4">
                <p className="text-[12.5px] font-semibold text-[#9b2c2c]">Permanently Delete</p>
                <p className="text-[12px] text-[#6f675c]">Anonymizes the account, preserves bookings, and does not cascade-delete customer records. Type DELETE to confirm.</p>
                <input className={adminInputClass} value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="DELETE" />
                <button
                  type="button"
                  className={`${adminBtnGhostClass} border-red-200 text-red-800`}
                  disabled={busy || deleteConfirm !== 'DELETE' || reason.trim() === ''}
                  onClick={() => {
                    if (!window.confirm('Permanently delete this provider account? This cannot be undone.')) return;
                    post({ action: 'permanently_delete', confirm: 'DELETE', reason, notes }, 'Provider permanently deleted (anonymized).');
                  }}
                >
                  Permanently Delete
                </button>
              </div>
            ) : null}

            {(p.suspendReason || p.blockReason || detail.profile?.removeReason) ? (
              <div className="rounded-[14px] border border-[#efe8dc] p-3 text-[12.5px]">
                {p.suspendReason ? <p>Suspend: {p.suspendReason}{p.suspendedUntil ? ` · until ${p.suspendedUntil}` : ''}</p> : null}
                {p.blockReason ? <p>Block: {p.blockReason}</p> : null}
                {detail.profile?.removeReason ? <p>Remove: {detail.profile.removeReason}</p> : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === 'Team' ? (
          <div className="space-y-2">
            {detail.teamMembers.length === 0 ? (
              <p className="text-[13px] text-[#6f675c]">
                {p.kind === 'agency' ? 'No agency team members have been added.' : 'Team members apply to agency profiles only.'}
              </p>
            ) : detail.teamMembers.map((m) => (
              <article key={m.id} className="rounded-[12px] border border-[#efe8dc] px-3 py-2 text-[13px]">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-semibold">{m.displayName}</p>
                  <StatusBadge status={m.status} />
                </div>
                <p className="mt-0.5 text-[12px] text-[#6f675c]">
                  {m.gender ? `${m.gender} · ` : ''}{m.yearsExperience ? `${m.yearsExperience} years · ` : ''}{m.status}
                </p>
                {m.bio ? <p className="mt-1 text-[12px] text-[#6f675c]">{m.bio}</p> : null}
              </article>
            ))}
            <p className="pt-2 text-[12px] text-[#6f675c]">Suspending or blocking the agency affects new bookability; existing appointments are not silently removed.</p>
          </div>
        ) : null}

        {tab === 'Moderation History' ? (
          <ul className="space-y-2 text-[12.5px]">
            {detail.moderationHistory.length === 0 ? (
              <li className="text-[#6f675c]">No moderation events yet.</li>
            ) : detail.moderationHistory.map((h) => (
              <li key={h.id} className="rounded-[12px] border border-[#efe8dc] px-3 py-2">
                <p className="font-semibold capitalize">{h.action.replace(/_/g, ' ')}</p>
                <p className="text-[#6f675c]">{h.reason || '—'}{h.notes ? ` · ${h.notes}` : ''}</p>
                <p className="text-[11px] text-[#8a7a52]">{h.createdAt}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </aside>
  );
};

export default AdminProviderDetail;
