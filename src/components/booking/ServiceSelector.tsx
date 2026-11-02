import React from 'react';
import { Check, Clock, Sparkles } from 'lucide-react';
import type { MassageService } from '../../lib/catalogue';
import type { StepFieldErrors } from '../../lib/massageBooking';

interface ServiceSelectorProps {
  services: MassageService[];
  serviceId: string;
  durationMinutes: number;
  errors: StepFieldErrors;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onSelectService: (serviceId: string) => void;
  onSelectDuration: (minutes: number) => void;
}

export const ServiceSelector: React.FC<ServiceSelectorProps> = ({
  services,
  serviceId,
  durationMinutes,
  errors,
  loading = false,
  error = null,
  onRetry,
  onSelectService,
  onSelectDuration,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Choose your massage</h2>
        <p className="mt-2 text-base sm:text-lg text-zinc-300 font-normal leading-relaxed">
          Select a therapy and session length. Prices are set by the studio and confirmed again when
          your request is saved.
        </p>
      </div>

      {errors.serviceId && (
        <p className="text-sm font-medium text-rose-300" role="alert">
          {errors.serviceId}
        </p>
      )}

      {loading && services.length === 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-center" role="status">
          <p className="text-base text-zinc-300">Loading available therapies…</p>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/30 p-5" role="alert">
          <p className="text-sm font-medium text-rose-200">{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 rounded-lg border border-rose-400/40 px-3 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-900/40 cursor-pointer"
            >
              Retry treatment menu
            </button>
          )}
        </div>
      )}

      {!loading && !error && services.length === 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-brand-gold" aria-hidden />
          <p className="mt-3 text-lg font-semibold text-white">No therapies published yet</p>
          <p className="mx-auto mt-2 max-w-md text-base text-zinc-400">
            Our studio is preparing its treatment menu. Bookings open as soon as the first services
            are approved and published.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:gap-4">
        {services.map((service) => {
          const selected = serviceId === service.id;
          return (
            <button
              key={service.id}
              type="button"
              onClick={() => {
                onSelectService(service.id);
                if (!service.durationMinutes.includes(durationMinutes)) {
                  onSelectDuration(service.durationMinutes[0]);
                }
              }}
              className={`group relative w-full text-left rounded-2xl border p-4 sm:p-5 transition-all duration-300 cursor-pointer ${
                selected
                  ? 'border-brand-gold/70 bg-brand-gold/12 shadow-[0_0_32px_-12px_rgba(176,139,75,0.45)]'
                  : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                      {service.name}
                    </h3>
                    {selected && (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-gold text-brand-ink shrink-0">
                        <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                      </span>
                    )}
                  </div>
                  {service.tagline && (
                    <p className="mt-1.5 text-sm sm:text-base text-zinc-300 font-normal leading-snug">
                      {service.tagline}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" aria-hidden />
                      {service.durationMinutes.map((m) => `${m} min`).join(' · ')}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span className="block text-xs font-medium uppercase tracking-wider text-zinc-400">
                    From
                  </span>
                  <span className="text-base sm:text-lg font-semibold text-white font-mono">
                    GHS {service.basePriceGHS}
                  </span>
                </div>
              </div>

              {selected && (
                <div className="mt-4 pt-4 border-t border-white/[0.08]">
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand-gold-light mb-2">
                    Session duration
                  </p>
                  {errors.durationMinutes && (
                    <p className="text-sm font-medium text-rose-300 mb-2" role="alert">
                      {errors.durationMinutes}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {service.durationMinutes.map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDuration(mins);
                        }}
                        className={`px-4 py-2.5 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                          durationMinutes === mins
                            ? 'bg-brand-gold text-white border border-brand-gold/60'
                            : 'bg-black/30 text-zinc-300 border border-white/10 hover:border-white/25 hover:text-white'
                        }`}
                      >
                        {mins} minutes
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
