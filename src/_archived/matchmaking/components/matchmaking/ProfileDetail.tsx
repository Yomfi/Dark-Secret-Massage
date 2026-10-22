import React, { useState } from 'react';
import { X, MoreHorizontal, BadgeCheck, Flag, Ban } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { DiscoveryProfile } from '../../data/discoveryProfiles';

interface ProfileDetailProps {
  profile: DiscoveryProfile;
  onClose: () => void;
  onReport: (reason: string) => void;
  onBlock: () => void;
  onInterested?: () => void;
  onSave?: () => void;
  variant?: 'panel' | 'fullscreen';
}

const REPORT_REASONS = [
  'Fake profile',
  'Inappropriate content',
  'Harassment',
  'Spam',
  'Safety concern',
  'Other',
];

export const ProfileDetail: React.FC<ProfileDetailProps> = ({
  profile,
  onClose,
  onReport,
  onBlock,
  onInterested,
  onSave,
  variant = 'panel',
}) => {
  const reduceMotion = useReducedMotion();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const photos = profile.photos;

  const shell =
    variant === 'fullscreen'
      ? 'fixed inset-0 z-50 bg-[#060608] overflow-y-auto'
      : 'fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0a0a10] border-l border-white/10 shadow-2xl overflow-y-auto';

  return (
    <motion.div
      className={shell}
      initial={reduceMotion ? false : { opacity: 0, x: variant === 'fullscreen' ? 0 : 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, x: variant === 'fullscreen' ? 0 : 40 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-[#060608]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-zinc-300 hover:text-white cursor-pointer"
          aria-label="Close profile"
        >
          <X className="h-5 w-5" />
        </button>
        <p className="text-sm font-semibold text-white">
          {profile.firstName}, {profile.age}
        </p>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-zinc-300 hover:text-white cursor-pointer"
            aria-label="More options"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-[#12121a] shadow-xl py-1 z-20">
              <button
                type="button"
                className="w-full px-4 py-2.5 text-left text-sm text-zinc-200 hover:bg-white/[0.05] flex items-center gap-2 cursor-pointer"
                onClick={() => {
                  setMenuOpen(false);
                  setReportOpen(true);
                }}
              >
                <Flag className="h-4 w-4" /> Report profile
              </button>
              <button
                type="button"
                className="w-full px-4 py-2.5 text-left text-sm text-rose-300 hover:bg-white/[0.05] flex items-center gap-2 cursor-pointer"
                onClick={() => {
                  setMenuOpen(false);
                  onBlock();
                }}
              >
                <Ban className="h-4 w-4" /> Block user
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="relative aspect-[3/4] max-h-[70vh]">
        <img
          src={photos[photoIndex]}
          alt={profile.firstName}
          className="h-full w-full object-cover object-top"
        />
        {photos.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPhotoIndex(i)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  i === photoIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40'
                }`}
                aria-label={`Photo ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-white">
              {profile.firstName}, {profile.age}
            </h2>
            {profile.verified && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
                <BadgeCheck className="h-4 w-4" /> Profile verified
              </span>
            )}
          </div>
          <p className="mt-1 text-base text-zinc-300 font-medium">
            {profile.city}, {profile.region}
          </p>
        </div>

        <Section title="About me">
          <p className="text-base text-zinc-300 font-normal leading-relaxed">{profile.about}</p>
        </Section>

        <Section title="Details">
          <dl className="grid grid-cols-1 gap-3 text-base">
            <Row label="Profession" value={profile.profession} />
            <Row label="Education" value={profile.education} />
            <Row label="Faith" value={profile.faith} />
            <Row label="Denomination" value={profile.denomination} />
            <Row label="Languages" value={profile.languages.join(', ')} />
            <Row label="Marital status" value={profile.maritalStatus} />
            <Row label="Children" value={profile.hasChildren ? 'Has children' : 'No children'} />
            <Row label="Marriage intent" value={profile.marriageIntent} />
          </dl>
        </Section>

        <Section title="Lifestyle & interests">
          <div className="flex flex-wrap gap-2">
            {[...profile.lifestyle, ...profile.interests].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-zinc-200 font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        </Section>

        <Section title="What I'm looking for">
          <p className="text-base text-zinc-300 font-normal leading-relaxed">{profile.lookingFor}</p>
        </Section>

        {(onSave || onInterested) && (
          <div className="flex gap-3 pt-2 pb-8">
            {onSave && (
              <button
                type="button"
                onClick={onSave}
                className="flex-1 rounded-full border border-white/15 py-3.5 text-sm font-semibold uppercase tracking-wider text-zinc-200 cursor-pointer"
              >
                Save
              </button>
            )}
            {onInterested && (
              <button
                type="button"
                onClick={onInterested}
                className="flex-1 rounded-full bg-purple-600 py-3.5 text-sm font-semibold uppercase tracking-wider text-white hover:bg-purple-500 cursor-pointer"
              >
                Interested
              </button>
            )}
          </div>
        )}
      </div>

      {reportOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#12121a] p-5">
            <h3 className="text-lg font-bold text-white mb-3">Report profile</h3>
            <div className="space-y-1.5">
              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-zinc-200 hover:bg-white/[0.05] cursor-pointer"
                  onClick={() => {
                    onReport(reason);
                    setReportOpen(false);
                    onClose();
                  }}
                >
                  {reason}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setReportOpen(false)}
              className="mt-4 w-full text-sm font-medium text-zinc-400 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300 mb-2.5">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-zinc-400 font-medium shrink-0">{label}</dt>
      <dd className="text-white font-medium text-right">{value}</dd>
    </div>
  );
}
