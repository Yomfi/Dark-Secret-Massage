import React from 'react';

type Props = {
  open: boolean;
  onCancel: () => void;
  onContinue: () => void;
};

export const UnverifiedContactModal: React.FC<Props> = ({ open, onCancel, onContinue }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        aria-label="Close"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="unverified-warning-title"
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0c0c12] p-6 shadow-2xl"
      >
        <p className="text-[10px] uppercase tracking-[0.22em] text-amber-300/90">Unverified Profile</p>
        <h2 id="unverified-warning-title" className="mt-2 text-xl font-semibold text-white tracking-tight">
          Proceed with caution
        </h2>
        <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
          This profile has not yet completed Dark Secret verification.
        </p>
        <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
          Dark Secret has not verified this provider&apos;s identity/profile information. Please use
          your own judgement before making payments, sharing personal information or arranging a
          meeting.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 min-h-[44px] rounded-full border border-white/15 text-xs uppercase tracking-widest text-zinc-200 hover:border-white/30 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="flex-1 min-h-[44px] rounded-full bg-purple-600 hover:bg-purple-500 text-xs uppercase tracking-widest text-white transition-colors"
          >
            Continue to contact
          </button>
        </div>
      </div>
    </div>
  );
};

const SESSION_KEY = 'ds_unverified_contact_ack';

export function hasAcknowledgedUnverified(profileId: string): boolean {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) && parsed.includes(profileId);
  } catch {
    return false;
  }
}

export function acknowledgeUnverified(profileId: string): void {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    const next = Array.isArray(parsed) ? parsed : [];
    if (!next.includes(profileId)) next.push(profileId);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}
