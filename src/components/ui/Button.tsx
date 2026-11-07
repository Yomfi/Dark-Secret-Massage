import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'overlay';
/** sm = 44px (minimum touch target) · md = 48px (standard) · lg = 52px */
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE =
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold leading-none transition-colors duration-200 ' +
  '[&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/80 focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-brand-surface disabled:cursor-not-allowed disabled:border disabled:border-white/10 disabled:bg-white/[0.06] disabled:text-zinc-500';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-purple text-white hover:bg-brand-purple-dark active:bg-brand-purple-deep',
  secondary:
    'border border-white/15 bg-white/[0.04] text-zinc-100 hover:border-white/25 hover:bg-white/[0.07]',
  ghost: 'text-zinc-300 hover:bg-white/[0.06] hover:text-white',
  danger: 'border border-rose-500/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20',
  /** Translucent control for use over imagery. */
  overlay: 'border border-white/25 bg-black/55 text-white hover:bg-black/75',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-11 px-4 text-[13px]',
  md: 'h-12 px-5 text-sm',
  lg: 'h-13 px-6 text-[15px]',
};

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}

/** Class string for the shared button look — use on react-router `Link` / `<a>`. */
export function buttonClass({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
}: ButtonStyleOptions = {}): string {
  return [BASE, VARIANTS[variant], SIZES[size], fullWidth ? 'w-full' : '', className]
    .filter(Boolean)
    .join(' ');
}

/** Square icon-only button: 48px (md) or 44px (sm). Always give it an aria-label. */
export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    Pick<ButtonStyleOptions, 'variant' | 'size' | 'className'> {
  'aria-label': string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = 'secondary', size = 'md', className = '', type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass({
        variant,
        size,
        className: `${size === 'sm' ? 'h-11 w-11' : 'h-12 w-12'} shrink-0 px-0 ${className}`,
      })}
      {...rest}
    />
  );
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonStyleOptions {
  loading?: boolean;
  /** Text shown while `loading`, keeping the label width stable. */
  loadingLabel?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    className = '',
    loading = false,
    loadingLabel,
    iconLeft,
    iconRight,
    disabled,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass({ variant, size, fullWidth, className })}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        iconLeft ?? null
      )}
      <span className="truncate">{loading ? loadingLabel ?? children : children}</span>
      {!loading && iconRight ? <span className="shrink-0">{iconRight}</span> : null}
    </button>
  );
});
