import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

type AlertVariant = 'error' | 'info' | 'success' | 'warning';

const ALERT_STYLES: Record<AlertVariant, string> = {
  error: 'border-rose-500/30 bg-rose-500/10 text-rose-100',
  info: 'border-white/12 bg-white/[0.04] text-zinc-300',
  success: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-100',
  warning: 'border-amber-500/25 bg-amber-500/10 text-amber-100',
};

const ALERT_ICONS = {
  error: AlertCircle,
  info: Info,
  success: CheckCircle2,
  warning: AlertCircle,
} as const;

export const Alert: React.FC<{
  variant?: AlertVariant;
  title?: string;
  className?: string;
  children?: React.ReactNode;
  role?: 'alert' | 'status';
}> = ({ variant = 'info', title, className = '', children, role }) => {
  const Icon = ALERT_ICONS[variant];
  return (
    <div
      role={role ?? (variant === 'error' ? 'alert' : 'status')}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-[13px] leading-relaxed ${
        ALERT_STYLES[variant]
      } ${className}`.trim()}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 break-words">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={title ? 'mt-0.5' : ''}>{children}</div> : null}
      </div>
    </div>
  );
};

/** Thin progress bar with an accessible label. */
export const ProgressBar: React.FC<{
  value: number;
  label?: string;
  className?: string;
  showValue?: boolean;
}> = ({ value, label, className = '', showValue = false }) => {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={className}>
      {label || showValue ? (
        <div className="mb-1.5 flex items-center justify-between gap-3 text-[12px] font-medium text-zinc-400">
          {label ? <span>{label}</span> : <span />}
          {showValue ? <span className="tabular-nums text-brand-purple-light">{pct}%</span> : null}
        </div>
      ) : null}
      <div
        className="h-1.5 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
      >
        <div
          className="h-full rounded-full bg-brand-purple transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export const Badge: React.FC<{
  children: React.ReactNode;
  tone?: 'purple' | 'neutral' | 'success';
  className?: string;
}> = ({ children, tone = 'neutral', className = '' }) => {
  const tones = {
    purple: 'border-brand-purple/30 bg-brand-purple/12 text-brand-purple-light',
    neutral: 'border-white/12 bg-white/[0.04] text-zinc-300',
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.02em] ${tones[tone]} ${className}`.trim()}
    >
      {children}
    </span>
  );
};

/** Selectable card used for provider type, gender, service settings. */
export const SelectableCard: React.FC<{
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  layout?: 'row' | 'tile';
}> = ({ selected, onClick, title, description, icon, disabled, className = '', layout = 'row' }) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    disabled={disabled}
    onClick={onClick}
    className={[
      'group relative w-full rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/80 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-surface disabled:cursor-not-allowed disabled:opacity-60',
      selected
        ? 'border-brand-purple/60 bg-brand-purple/[0.08]'
        : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]',
      layout === 'row' ? 'flex items-start gap-3.5' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {icon ? (
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
          selected
            ? 'border-brand-purple/40 bg-brand-purple/15 text-brand-purple-light'
            : 'border-white/10 bg-white/[0.04] text-zinc-400'
        }`}
      >
        {icon}
      </span>
    ) : null}
    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-2">
        <span className="text-[15px] font-semibold text-white">{title}</span>
        {selected ? (
          <span className="h-1.5 w-1.5 rounded-full bg-brand-purple" aria-hidden />
        ) : null}
      </span>
      {description ? (
        <span className="mt-1 block text-[13px] leading-relaxed text-zinc-400">{description}</span>
      ) : null}
    </span>
  </button>
);
