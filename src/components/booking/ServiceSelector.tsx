import React from 'react';
import { Check, Clock } from 'lucide-react';
import { MASSAGE_SERVICES } from '../../data/mockData';
import type { StepFieldErrors } from '../../lib/massageBooking';

interface ServiceSelectorProps {
  serviceId: string;
  durationMinutes: number;
  errors: StepFieldErrors;
  onSelectService: (serviceId: string) => void;
  onSelectDuration: (minutes: number) => void;
}

export const ServiceSelector: React.FC<ServiceSelectorProps> = ({
  serviceId,
  durationMinutes,
  errors,
  onSelectService,
  onSelectDuration,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Choose your massage</h2>
        <p className="mt-2 text-base sm:text-lg text-zinc-300 font-normal leading-relaxed">
          Select a therapy and session length. Pricing starts from the listed rate for a 60-minute session.
        </p>
      </div>

      {errors.serviceId && (
        <p className="text-sm font-medium text-rose-300" role="alert">
          {errors.serviceId}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:gap-4">
        {MASSAGE_SERVICES.map((service) => {
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
                  ? 'border-purple-500/70 bg-purple-950/35 shadow-[0_0_32px_-12px_rgba(168,85,247,0.55)]'
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
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-white shrink-0">
                        <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm sm:text-base text-zinc-300 font-normal leading-snug">
                    {service.tagline}
                  </p>
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
                  <p className="text-xs font-semibold uppercase tracking-wider text-purple-300 mb-2">
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
                            ? 'bg-purple-600 text-white border border-purple-400/60'
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
