import React from 'react';
import { BRAND, type BrandLogoVariant } from '../lib/brand';

interface BrandLogoProps {
  /** Visual treatment for the surrounding surface. */
  variant?: BrandLogoVariant;
  /** Show “Massager Studio” wordmark beside the mark. */
  withWordmark?: boolean;
  /** Extra classes on the outer wrapper. */
  className?: string;
  /** Mark height in Tailwind terms via style, default 28. */
  markHeight?: number;
  /** Hide decorative plate even on dark shells when using `plate`. */
  compact?: boolean;
}

/**
 * Shared Massager Studio logo. Uses the prepared transparent PNG derived from
 * the official JPEG — proportions are preserved (object-contain, no crop).
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'plate',
  withWordmark = false,
  className = '',
  markHeight = 28,
  compact = false,
}) => {
  const usePlate = variant === 'plate' && !compact;
  const src = variant === 'onDark' ? BRAND.logoOnDark : BRAND.logo;

  const mark = (
    <img
      src={src}
      alt=""
      width={Math.round(markHeight * (508 / 369))}
      height={markHeight}
      decoding="async"
      className="block h-full w-auto max-w-none object-contain select-none"
      style={{ height: markHeight }}
      draggable={false}
    />
  );

  return (
    <span className={`inline-flex items-center gap-2.5 min-w-0 ${className}`.trim()}>
      {usePlate ? (
        <span
          className="inline-flex items-center justify-center rounded-xl bg-brand-offwhite px-1.5 py-1 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
          style={{ height: markHeight + 10 }}
        >
          {mark}
        </span>
      ) : (
        <span className="inline-flex items-center justify-center" style={{ height: markHeight }}>
          {mark}
        </span>
      )}
      {withWordmark ? (
        <span className="hidden text-[12px] font-semibold tracking-[0.22em] uppercase text-white whitespace-nowrap sm:inline">
          {BRAND.name}
        </span>
      ) : null}
      <span className="sr-only">{BRAND.name}</span>
    </span>
  );
};
