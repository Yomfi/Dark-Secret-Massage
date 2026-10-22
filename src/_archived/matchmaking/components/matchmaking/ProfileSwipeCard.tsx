import React, { useState } from 'react';
import { BadgeCheck, Briefcase, GraduationCap, HeartHandshake, Church } from 'lucide-react';
import type { DiscoveryProfile } from '../../data/discoveryProfiles';

interface ProfileSwipeCardProps {
  profile: DiscoveryProfile;
  interactive?: boolean;
  dragX?: number;
  onOpenProfile?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export const ProfileSwipeCard: React.FC<ProfileSwipeCardProps> = ({
  profile,
  interactive = false,
  dragX = 0,
  onOpenProfile,
  style,
  className = '',
}) => {
  const [photoIndex, setPhotoIndex] = useState(0);
  const photos = profile.photos.length ? profile.photos : ['/profiles/profile_ama.jpg'];
  const photo = photos[Math.min(photoIndex, photos.length - 1)];

  const interestedOpacity = Math.min(Math.max(dragX / 120, 0), 1);
  const passOpacity = Math.min(Math.max(-dragX / 120, 0), 1);

  const cyclePhoto = (dir: 1 | -1, e?: React.MouseEvent | React.PointerEvent) => {
    e?.stopPropagation();
    setPhotoIndex((i) => {
      const next = i + dir;
      if (next < 0) return photos.length - 1;
      if (next >= photos.length) return 0;
      return next;
    });
  };

  return (
    <div
      className={`relative w-full h-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0c0c12] shadow-[0_30px_80px_-28px_rgba(0,0,0,0.9)] select-none ${className}`}
      style={style}
    >
      <img
        src={photo}
        alt={`${profile.firstName}, ${profile.age}`}
        className="absolute inset-0 h-full w-full object-cover object-top pointer-events-none"
        draggable={false}
      />

      {/* Photo hit zones — tap sides to change photo without swiping profile */}
      {interactive && photos.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            className="absolute left-0 top-0 bottom-[28%] w-[32%] z-10 cursor-pointer"
            onClick={(e) => cyclePhoto(-1, e)}
          />
          <button
            type="button"
            aria-label="Next photo"
            className="absolute right-0 top-0 bottom-[28%] w-[32%] z-10 cursor-pointer"
            onClick={(e) => cyclePhoto(1, e)}
          />
        </>
      )}

      {/* Image count */}
      {photos.length > 1 && (
        <div className="absolute top-3 left-3 right-3 z-20 flex gap-1">
          {photos.map((_, i) => (
            <div
              key={i}
              className={`h-0.5 flex-1 rounded-full ${i === photoIndex ? 'bg-white' : 'bg-white/35'}`}
            />
          ))}
        </div>
      )}
      {photos.length > 1 && (
        <span className="absolute top-5 right-4 z-20 text-[11px] font-semibold tracking-wide text-white/90 bg-black/40 px-2 py-0.5 rounded-full">
          {photoIndex + 1} / {photos.length}
        </span>
      )}

      {/* Swipe indicators */}
      <div
        className="pointer-events-none absolute top-16 left-5 z-20 rotate-[-12deg] rounded-xl border-2 border-rose-400/80 px-3 py-1.5 text-sm font-bold uppercase tracking-[0.18em] text-rose-300 bg-black/40"
        style={{ opacity: passOpacity }}
      >
        Pass
      </div>
      <div
        className="pointer-events-none absolute top-16 right-5 z-20 rotate-[12deg] rounded-xl border-2 border-purple-400/90 px-3 py-1.5 text-sm font-bold uppercase tracking-[0.18em] text-purple-200 bg-black/40"
        style={{ opacity: interestedOpacity }}
      >
        Interested
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent opacity-95" />

      <div className="absolute inset-x-0 bottom-0 z-20 p-5 sm:p-6">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {profile.firstName}, {profile.age}
              </h2>
              {profile.verified && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-950/50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                  Verified
                </span>
              )}
            </div>
            <p className="mt-1 text-base font-medium text-zinc-200">
              {profile.city}, {profile.region}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:text-[15px] text-zinc-200 font-medium">
          <Detail icon={Briefcase} text={profile.profession} />
          <Detail icon={Church} text={profile.faith} />
          <Detail icon={GraduationCap} text={profile.education} />
          <Detail icon={HeartHandshake} text={profile.marriageIntent} />
        </div>

        {profile.highlights && profile.highlights.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {profile.highlights.slice(0, 3).map((h) => (
              <span
                key={h}
                className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] sm:text-xs font-medium text-zinc-200"
              >
                {h}
              </span>
            ))}
          </div>
        )}

        {interactive && onOpenProfile && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenProfile();
            }}
            className="pointer-events-auto mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-purple-300 hover:text-purple-200 transition-colors"
          >
            View profile
          </button>
        )}
      </div>
    </div>
  );
};

function Detail({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="h-4 w-4 text-purple-300 shrink-0" />
      <span className="truncate">{text}</span>
    </div>
  );
}
