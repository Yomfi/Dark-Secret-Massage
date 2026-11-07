import React from 'react';

/** Shared control surface: 48px tall, readable text, visible border, purple focus ring. */
const CONTROL =
  'w-full rounded-xl border bg-[#100d17] px-3.5 text-sm text-zinc-100 placeholder:text-zinc-500 ' +
  'transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60';

const NEUTRAL = 'border-white/12 focus:border-brand-purple/60 focus:ring-brand-purple/20';
const INVALID = 'border-rose-500/50 focus:border-rose-400 focus:ring-rose-500/20';

export function inputClass(invalid = false, className = ''): string {
  return [CONTROL, 'h-12', invalid ? INVALID : NEUTRAL, className].filter(Boolean).join(' ');
}

export function textareaClass(invalid = false, className = ''): string {
  return [CONTROL, 'min-h-28 py-3', invalid ? INVALID : NEUTRAL, className].filter(Boolean).join(' ');
}

export function selectClass(invalid = false, className = ''): string {
  return [CONTROL, 'h-12 pr-3.5', invalid ? INVALID : NEUTRAL, className].filter(Boolean).join(' ');
}

interface FieldShellProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Label + control + hint/error, spaced consistently across every form. */
export const FieldShell: React.FC<FieldShellProps> = ({
  label,
  htmlFor,
  hint,
  error,
  required,
  className = '',
  children,
}) => (
  <div className={className}>
    <label
      htmlFor={htmlFor}
      className="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-zinc-200"
    >
      {label}
      {required ? (
        <span className="text-brand-purple-light" aria-hidden>
          *
        </span>
      ) : null}
    </label>
    {children}
    {error ? (
      <p className="mt-1.5 text-[13px] text-rose-300">{error}</p>
    ) : hint ? (
      <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">{hint}</p>
    ) : null}
  </div>
);

export interface TextFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  inputClassName?: string;
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, className = '', inputClassName = '', id, required, ...rest },
  ref,
) {
  const fieldId = id ?? rest.name;
  return (
    <FieldShell label={label} htmlFor={fieldId} hint={hint} error={error} required={required} className={className}>
      <input
        ref={ref}
        id={fieldId}
        required={required}
        aria-invalid={error ? true : undefined}
        className={inputClass(Boolean(error), inputClassName)}
        {...rest}
      />
    </FieldShell>
  );
});

export interface TextAreaFieldProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
}

export const TextAreaField = React.forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  function TextAreaField({ label, hint, error, className = '', id, required, ...rest }, ref) {
    const fieldId = id ?? rest.name;
    return (
      <FieldShell label={label} htmlFor={fieldId} hint={hint} error={error} required={required} className={className}>
        <textarea
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={error ? true : undefined}
          className={textareaClass(Boolean(error))}
          {...rest}
        />
      </FieldShell>
    );
  },
);

export interface SelectFieldProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
}

export const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  function SelectField({ label, hint, error, className = '', id, required, children, ...rest }, ref) {
    const fieldId = id ?? rest.name;
    return (
      <FieldShell label={label} htmlFor={fieldId} hint={hint} error={error} required={required} className={className}>
        <select
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={error ? true : undefined}
          className={selectClass(Boolean(error))}
          {...rest}
        >
          {children}
        </select>
      </FieldShell>
    );
  },
);

export interface CheckboxFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> {
  label: React.ReactNode;
  hint?: string;
  className?: string;
}

/** Checkbox with a 44px-tall label row so the whole target is tappable. */
export const CheckboxField: React.FC<CheckboxFieldProps> = ({
  label,
  hint,
  className = '',
  id,
  ...rest
}) => {
  const fieldId = id ?? rest.name;
  return (
    <div className={className}>
      <label htmlFor={fieldId} className="flex min-h-11 cursor-pointer items-start gap-3 py-1.5">
        <input
          id={fieldId}
          type="checkbox"
          className="mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer accent-brand-purple"
          {...rest}
        />
        <span className="text-[13px] leading-relaxed text-zinc-300">{label}</span>
      </label>
      {hint ? <p className="ml-[30px] text-[12px] text-zinc-500">{hint}</p> : null}
    </div>
  );
};
