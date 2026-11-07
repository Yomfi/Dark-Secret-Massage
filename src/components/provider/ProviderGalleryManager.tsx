import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../lib/api';

export type GalleryImage = {
  id: string;
  kind: string;
  url: string;
  thumbUrl: string;
  altText: string;
  description: string;
  sortOrder: number;
  moderationStatus: string;
  moderationReason?: string | null;
  teamMemberId?: string | null;
};

type TeamMember = { id: string; displayName?: string; display_name?: string; profileImage?: string | null };

type Props = {
  mode: 'individual' | 'agency';
  onChanged?: () => void;
};

const card = 'rounded-2xl border border-[#e4d8f2] bg-white p-5';
const btn = 'inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#6d28d9] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#9333ea] disabled:opacity-60';
const btnGhost = 'inline-flex h-11 items-center justify-center rounded-xl border border-[#d8c7ea] px-3.5 text-[12.5px] font-semibold hover:bg-[#f3edfa] disabled:opacity-60';
const label = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7e22ce]';

export const ProviderGalleryManager: React.FC<Props> = ({ mode, onChanged }) => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [limit, setLimit] = useState(12);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [altText, setAltText] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState(mode === 'agency' ? 'logo' : 'profile');
  const [teamMemberId, setTeamMemberId] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    const data = await apiRequest<{
      images: GalleryImage[];
      limit: number;
      teamMembers: TeamMember[];
    }>('/provider/gallery.php');
    setImages(data.images);
    setLimit(data.limit);
    setTeam(data.teamMembers ?? []);
  }, []);

  useEffect(() => {
    setBusy(true);
    load()
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load gallery.'))
      .finally(() => setBusy(false));
  }, [load]);

  const kindOptions = useMemo(() => {
    if (mode === 'agency') {
      return [
        { value: 'logo', label: 'Agency logo' },
        { value: 'cover', label: 'Cover / banner' },
        { value: 'facility', label: 'Facility photo' },
        { value: 'service', label: 'Service image' },
        { value: 'gallery', label: 'Gallery' },
        { value: 'team', label: 'Team portrait' },
      ];
    }
    return [
      { value: 'profile', label: 'Profile picture' },
      { value: 'cover', label: 'Cover image' },
      { value: 'gallery', label: 'Gallery' },
    ];
  }, [mode]);

  const onFile = (f: File | null) => {
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const upload = async () => {
    if (!file) {
      setError('Choose an image first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('kind', kind);
      if (altText.trim()) form.append('altText', altText.trim());
      if (description.trim()) form.append('description', description.trim());
      if (kind === 'team') form.append('teamMemberId', teamMemberId);
      await apiRequest('/provider/gallery.php', { method: 'POST', body: form });
      setNotice('Image uploaded.');
      setFile(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      setAltText('');
      setDescription('');
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const act = async (fn: () => Promise<void>, message: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setNotice(message);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  const move = async (id: string, dir: -1 | 1) => {
    const ids = images.map((i) => i.id);
    const idx = ids.indexOf(id);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= ids.length) return;
    const order = [...ids];
    [order[idx], order[next]] = [order[next], order[idx]];
    await act(async () => {
      await apiRequest('/provider/gallery.php', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'reorder', order }),
      });
    }, 'Gallery order updated.');
  };

  return (
    <div className="space-y-4">
      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">{error}</div> : null}
      {notice ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">{notice}</div> : null}

      <section className={card}>
        <h2 className="text-[15px] font-semibold">{mode === 'agency' ? 'Branding & Gallery' : 'Profile & Gallery'}</h2>
        <p className="mt-1 text-[12.5px] text-[#675f73]">
          JPEG, PNG or WebP · max 5MB · up to {limit} images. Identity documents stay private and are never shown here.
        </p>

        <div className="mt-4 grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="aspect-square overflow-hidden rounded-2xl border border-dashed border-[#d8c7ea] bg-[#faf7ff]">
            {preview ? (
              <img src={preview} alt="Upload preview" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center px-4 text-center text-[12.5px] text-[#7e22ce]">Preview appears here</div>
            )}
          </div>
          <div className="space-y-3">
            <label className="block text-[12px] font-medium text-[#675f73]">
              Image type
              <select className="mt-1 h-11 w-full rounded-xl border border-[#d8c7ea] bg-white px-3 text-[13px]" value={kind} onChange={(e) => setKind(e.target.value)}>
                {kindOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            {kind === 'team' ? (
              <label className="block text-[12px] font-medium text-[#675f73]">
                Team member
                <select className="mt-1 h-11 w-full rounded-xl border border-[#d8c7ea] bg-white px-3 text-[13px]" value={teamMemberId} onChange={(e) => setTeamMemberId(e.target.value)} required>
                  <option value="">Select…</option>
                  {team.map((m) => (
                    <option key={m.id} value={m.id}>{m.displayName ?? m.display_name ?? m.id}</option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="block text-[12px] font-medium text-[#675f73]">
              File
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="mt-1 block w-full text-[13px]"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <label className="block text-[12px] font-medium text-[#675f73]">
              Alt text
              <input className="mt-1 h-11 w-full rounded-xl border border-[#d8c7ea] px-3 text-[13px]" value={altText} onChange={(e) => setAltText(e.target.value)} placeholder="Describe the image" />
            </label>
            <label className="block text-[12px] font-medium text-[#675f73]">
              Description (optional)
              <input className="mt-1 h-11 w-full rounded-xl border border-[#d8c7ea] px-3 text-[13px]" value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <button type="button" className={btn} disabled={busy || !file || (kind === 'team' && !teamMemberId)} onClick={() => void upload()}>
              {busy ? 'Uploading…' : 'Upload image'}
            </button>
          </div>
        </div>
      </section>

      <section className={card}>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-semibold">Your images</h3>
            <p className={label}>{images.length} / {limit}</p>
          </div>
        </div>
        {images.length === 0 ? (
          <p className="text-[13px] text-[#675f73]">No media uploaded yet.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {images.map((img, index) => (
              <li key={img.id} className="overflow-hidden rounded-2xl border border-[#ede4f7]">
                <div className="aspect-[4/3] bg-[#faf7ff]">
                  <img src={img.thumbUrl || img.url} alt={img.altText || img.kind} className="h-full w-full object-cover" loading="lazy" />
                </div>
                <div className="space-y-2 p-3">
                  <p className="truncate text-[12.5px] font-semibold capitalize">{img.kind.replace('_', ' ')}</p>
                  <p className="text-[11.5px] text-[#675f73]">
                    {img.moderationStatus === 'hidden' ? `Hidden by admin${img.moderationReason ? `: ${img.moderationReason}` : ''}` : img.moderationStatus}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" className={btnGhost} disabled={busy || index === 0} onClick={() => void move(img.id, -1)}>Up</button>
                    <button type="button" className={btnGhost} disabled={busy || index === images.length - 1} onClick={() => void move(img.id, 1)}>Down</button>
                    {img.kind !== 'profile' && img.kind !== 'logo' ? (
                      <button type="button" className={btnGhost} disabled={busy || img.moderationStatus === 'hidden'} onClick={() => void act(async () => {
                        await apiRequest('/provider/gallery.php', { method: 'PATCH', body: JSON.stringify({ action: 'set_primary', id: img.id }) });
                      }, 'Primary image updated.')}>Set primary</button>
                    ) : null}
                    {img.kind !== 'cover' ? (
                      <button type="button" className={btnGhost} disabled={busy || img.moderationStatus === 'hidden'} onClick={() => void act(async () => {
                        await apiRequest('/provider/gallery.php', { method: 'PATCH', body: JSON.stringify({ action: 'set_cover', id: img.id }) });
                      }, 'Cover image updated.')}>Set cover</button>
                    ) : null}
                    <button type="button" className={btnGhost} disabled={busy || img.moderationStatus === 'hidden'} onClick={() => {
                      if (!window.confirm('Delete this image?')) return;
                      void act(async () => {
                        await apiRequest('/provider/gallery.php', { method: 'DELETE', body: JSON.stringify({ id: img.id }) });
                      }, 'Image deleted.');
                    }}>Delete</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default ProviderGalleryManager;
