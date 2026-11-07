import React, { useCallback, useEffect, useState } from 'react';
import {
  fetchAvailability,
  PERIOD_LABELS,
  SLOT_REASON_LABELS,
  todayISO,
  type AvailabilityResponse,
  type AvailabilitySlot,
  type TimePeriod,
} from '../../lib/bookingAvailability';
import type { StepFieldErrors } from '../../lib/massageBooking';

interface DateTimeSelectorProps {
  date: string;
  timeSlotId: string;
  serviceId: string;
  durationMinutes: number;
  providerProfileId?: string;
  errors: StepFieldErrors;
  onSelectDate: (date: string) => void;
  onSelectSlot: (slotId: string, label: string) => void;
}

const PERIODS: TimePeriod[] = ['morning', 'afternoon', 'evening'];

export const DateTimeSelector: React.FC<DateTimeSelectorProps> = ({
  date,
  timeSlotId,
  serviceId,
  durationMinutes,
  providerProfileId,
  errors,
  onSelectDate,
  onSelectSlot,
}) => {
  const minDate = todayISO();
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(
    async (signal: { cancelled: boolean }) => {
      if (!date) {
        setAvailability(null);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await fetchAvailability({
          date,
          serviceId: serviceId || undefined,
          providerProfileId: providerProfileId || undefined,
        });
        if (!signal.cancelled) setAvailability(result);
      } catch (err) {
        if (signal.cancelled) return;
        setAvailability(null);
        setError(
          err instanceof Error && err.message
            ? err.message
            : 'We could not load live availability. Please retry.'
        );
      } finally {
        if (!signal.cancelled) setLoading(false);
      }
    },
    [date, serviceId, providerProfileId]
  );

  useEffect(() => {
    const signal = { cancelled: false };
    void load(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [load, attempt]);

  const slots: AvailabilitySlot[] = availability?.slots ?? [];
  const openCount = slots.filter((slot) => slot.available).length;
  const hoursLabel =
    availability?.start && availability?.end ? `${availability.start}–${availability.end}` : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Choose a date and time
        </h2>
        <p className="mt-2 text-base sm:text-lg text-zinc-300 font-normal leading-relaxed">
          {durationMinutes
            ? `Showing ${durationMinutes}-minute slots that are genuinely open on the published calendar.`
            : 'Pick an open slot. Unavailable times cannot be selected.'}
        </p>
        {availability?.configured && hoursLabel && (
          <p className="mt-2 text-sm text-zinc-400">
            Published hours: {hoursLabel}
            {availability.source === 'provider' && availability.providerName
              ? ` · ${availability.providerName}`
              : ''}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="booking-date" className="block text-sm font-semibold text-zinc-200 mb-1.5">
          Date
        </label>
        <input
          id="booking-date"
          type="date"
          min={minDate}
          value={date}
          onChange={(e) => {
            onSelectDate(e.target.value);
            onSelectSlot('', '');
          }}
          className="w-full sm:max-w-xs rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base font-normal text-white focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/40 [color-scheme:dark]"
        />
        {errors.date && (
          <p className="mt-1.5 text-sm font-medium text-rose-300" role="alert">
            {errors.date}
          </p>
        )}
      </div>

      {!date ? (
        <p className="text-base text-zinc-400 font-normal">Select a date to view available times.</p>
      ) : loading ? (
        <div
          className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-center"
          role="status"
        >
          <p className="text-base text-zinc-300">Checking live availability…</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/30 p-5" role="alert">
          <p className="text-sm font-medium text-rose-200">{error}</p>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="mt-3 rounded-lg border border-rose-400/40 px-3 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-900/40 cursor-pointer"
          >
            Retry availability
          </button>
        </div>
      ) : availability && !availability.configured ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-center">
          <p className="text-base font-semibold text-white">Booking hours are not published yet</p>
          <p className="mt-1 text-sm text-zinc-400">
            {availability.message ||
              'The studio has not published its booking days and hours, so no times can be offered.'}
          </p>
        </div>
      ) : availability?.closed ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-center">
          <p className="text-base font-semibold text-white">Closed on this date</p>
          <p className="mt-1 text-sm text-zinc-400">
            {availability.message || 'Choose another date inside the published working days.'}
          </p>
        </div>
      ) : slots.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-center">
          <p className="text-base font-semibold text-white">No times published for this date</p>
          <p className="mt-1 text-sm text-zinc-400">
            {availability?.message ||
              'Try another date, or contact the studio to request a time outside the published calendar.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {errors.timeSlot && (
            <p className="text-sm font-medium text-rose-300" role="alert">
              {errors.timeSlot}
            </p>
          )}

          <p className="text-sm text-zinc-400">
            {openCount > 0
              ? `${openCount} open ${openCount === 1 ? 'slot' : 'slots'} on this date.`
              : 'Every published slot on this date is already taken.'}
          </p>

          {PERIODS.map((period) => {
            const periodSlots = slots.filter((slot) => slot.period === period);
            if (periodSlots.length === 0) return null;
            return (
              <div key={period}>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-purple-light mb-2.5">
                  {PERIOD_LABELS[period]}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {periodSlots.map((slot) => {
                    const selected = timeSlotId === slot.id;
                    const disabled = !slot.available;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                          onSelectSlot(slot.id, `${slot.label} (${slot.start}–${slot.end})`)
                        }
                        className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-all ${
                          disabled
                            ? 'border-white/[0.05] bg-white/[0.015] text-zinc-600 cursor-not-allowed line-through decoration-zinc-600'
                            : selected
                              ? 'border-brand-purple/70 bg-brand-purple/15 text-white shadow-[0_0_24px_-10px_rgba(147,51,234,0.4)] cursor-pointer'
                              : 'border-white/10 bg-white/[0.03] text-zinc-200 hover:border-brand-purple/40 hover:text-white cursor-pointer'
                        }`}
                      >
                        {slot.label}
                        {disabled && (
                          <span className="block text-[10px] font-medium no-underline mt-0.5 tracking-wide uppercase text-zinc-600">
                            {SLOT_REASON_LABELS[slot.reason ?? ''] ?? 'Unavailable'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
