import React from 'react';
import { BadgeCheck } from 'lucide-react';

type Props = {
  verified: boolean;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
};

export const VerifiedBadge: React.FC<Props> = ({
  verified,
  size = 'sm',
  showLabel = true,
  className = '',
}) => {
  if (verified) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-emerald-400 ${className}`}
        title="Verified Profile"
      >
        <BadgeCheck className={size === 'md' ? 'w-5 h-5' : 'w-4 h-4'} aria-hidden />
        {showLabel && (
          <span className="text-[10px] uppercase tracking-widest font-medium">Verified</span>
        )}
        <span className="sr-only">Verified Profile</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center text-[10px] uppercase tracking-widest text-zinc-500 ${className}`}
      title="Unverified Profile"
    >
      Unverified
    </span>
  );
};

/** Green check beside a display name */
export const VerifiedNameCheck: React.FC<{ verified: boolean; className?: string }> = ({
  verified,
  className = '',
}) => {
  if (!verified) return null;
  return (
    <span className={`inline-flex text-emerald-400 ${className}`} title="Verified Profile">
      <BadgeCheck className="w-5 h-5" aria-label="Verified Profile" />
    </span>
  );
};
