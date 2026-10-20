import React from 'react';
import { CERTIFIED_THERAPISTS } from '../../data/mockData';
import type { ProviderPreference, StepFieldErrors } from '../../lib/massageBooking';

interface CustomerDetailsFormProps {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  providerPreference: ProviderPreference;
  preferredTherapistId: string;
  specialRequests: string;
  tensionNotes: string;
  accessibilityNeeds: string;
  errors: StepFieldErrors;
  onChange: (patch: Record<string, string>) => void;
  onProviderPreference: (pref: ProviderPreference) => void;
}

const inputClass =
  'w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base font-normal text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/40 transition-colors';

export const CustomerDetailsForm: React.FC<CustomerDetailsFormProps> = ({
  clientName,
  clientPhone,
  clientEmail,
  providerPreference,
  preferredTherapistId,
  specialRequests,
  tensionNotes,
  accessibilityNeeds,
  errors,
  onChange,
  onProviderPreference,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Tell us who we&apos;re booking for
        </h2>
        <p className="mt-2 text-base sm:text-lg text-zinc-300 font-normal leading-relaxed">
          We only ask for what we need to arrange your session.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Field
          id="clientName"
          label="Full name"
          value={clientName}
          error={errors.clientName}
          onChange={(v) => onChange({ clientName: v })}
          autoComplete="name"
        />
        <Field
          id="clientPhone"
          label="Phone number"
          type="tel"
          value={clientPhone}
          error={errors.clientPhone}
          onChange={(v) => onChange({ clientPhone: v })}
          placeholder="+233 …"
          autoComplete="tel"
        />
        <Field
          id="clientEmail"
          label="Email address"
          type="email"
          value={clientEmail}
          error={errors.clientEmail}
          onChange={(v) => onChange({ clientEmail: v })}
          autoComplete="email"
        />
      </div>

      <div className="space-y-3 pt-2">
        <p className="text-sm font-semibold text-zinc-200">Preferred provider</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onProviderPreference('any')}
            className={`rounded-2xl border p-4 text-left transition-all cursor-pointer ${
              providerPreference === 'any'
                ? 'border-purple-500/70 bg-purple-950/35'
                : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'
            }`}
          >
            <span className="block text-base font-semibold text-white">Any available provider</span>
            <span className="mt-1 block text-sm text-zinc-400 font-normal">
              We&apos;ll match a reviewed provider for your therapy and time.
            </span>
          </button>
          <button
            type="button"
            onClick={() => onProviderPreference('specific')}
            className={`rounded-2xl border p-4 text-left transition-all cursor-pointer ${
              providerPreference === 'specific'
                ? 'border-purple-500/70 bg-purple-950/35'
                : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'
            }`}
          >
            <span className="block text-base font-semibold text-white">Choose a provider</span>
            <span className="mt-1 block text-sm text-zinc-400 font-normal">
              Request someone from our reviewed team if you have a preference.
            </span>
          </button>
        </div>

        {providerPreference === 'specific' && (
          <div className="space-y-2">
            {errors.preferredTherapistId && (
              <p className="text-sm font-medium text-rose-300" role="alert">
                {errors.preferredTherapistId}
              </p>
            )}
            <div className="grid grid-cols-1 gap-2">
              {CERTIFIED_THERAPISTS.map((t) => {
                const selected = preferredTherapistId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onChange({ preferredTherapistId: t.id })}
                    className={`rounded-xl border px-4 py-3.5 text-left transition-all cursor-pointer ${
                      selected
                        ? 'border-purple-500/70 bg-purple-950/30'
                        : 'border-white/[0.08] bg-black/20 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-white">{t.name}</p>
                        <p className="text-sm text-zinc-400 font-normal mt-0.5">
                          {t.specialties.slice(0, 2).join(' · ')}
                        </p>
                      </div>
                      {t.verified && (
                        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-emerald-400 border border-emerald-500/25 bg-emerald-950/40 px-2 py-1 rounded-full">
                          Reviewed
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4 pt-2">
        <OptionalArea
          id="tensionNotes"
          label="Areas of tension / treatment notes"
          value={tensionNotes}
          onChange={(v) => onChange({ tensionNotes: v })}
        />
        <OptionalArea
          id="specialRequests"
          label="Special requests"
          value={specialRequests}
          onChange={(v) => onChange({ specialRequests: v })}
        />
        <OptionalArea
          id="accessibilityNeeds"
          label="Accessibility needs"
          value={accessibilityNeeds}
          onChange={(v) => onChange({ accessibilityNeeds: v })}
        />
      </div>
    </div>
  );
};

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = 'text',
  placeholder,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-zinc-200 mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={inputClass}
      />
      {error && (
        <p className="mt-1.5 text-sm font-medium text-rose-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function OptionalArea({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-zinc-200 mb-1.5">
        {label} <span className="font-normal text-zinc-500">(optional)</span>
      </label>
      <textarea
        id={id}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} resize-y min-h-[88px]`}
      />
    </div>
  );
};
