import React, { useMemo } from 'react';
import {
  getAvailableSlotsForDate,
  PERIOD_LABELS,
  todayISO,
  type TimePeriod,
} from '../../lib/bookingAvailability';
import type { StepFieldErrors } from '../../lib/massageBooking';

interface DateTimeSelectorProps {
  date: string;
  timeSlotId: string;
  errors: StepFieldErrors;
  onSelectDate: (date: string) => void;
  onSelectSlot: (slotId: string, label: string) => void;
}

const PERIODS: TimePeriod[] = ['morning', 'afternoon', 'evening'];

export const DateTimeSelector: React.FC<DateTimeSelectorProps> = ({
  date,
  timeSlotId,
  errors,
  onSelectDate,
  onSelectSlot,
}) => {
  const minDate = todayISO();
  const slots = useMemo(() => getAvailableSlotsForDate(date), [date]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Choose a date and time
        </h2>
        <p className="mt-2 text-base sm:text-lg text-zinc-300 font-normal leading-relaxed">
          Pick an open slot. Unavailable times cannot be selected.
        </p>
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
          className="w-full sm:max-w-xs rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base font-normal text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/40 [color-scheme:dark]"
        />
        {errors.date && (
          <p className="mt-1.5 text-sm font-medium text-rose-300" role="alert">
            {errors.date}
          </p>
        )}
      </div>

      {date ? (
        <div className="space-y-5">
          {errors.timeSlot && (
            <p className="text-sm font-medium text-rose-300" role="alert">
              {errors.timeSlot}
            </p>
          )}

          {PERIODS.map((period) => {
            const periodSlots = slots.filter((s) => s.period === period);
            if (periodSlots.length === 0) return null;
            return (
              <div key={period}>
                <p className="text-xs font-semibold uppercase tracking-wider text-purple-300 mb-2.5">
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
                        onClick={() => onSelectSlot(slot.id, `${slot.label} (${slot.start}–${slot.end})`)}
                        className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-all ${
                          disabled
                            ? 'border-white/[0.05] bg-white/[0.015] text-zinc-600 cursor-not-allowed line-through decoration-zinc-600'
                            : selected
                              ? 'border-purple-500/70 bg-purple-950/40 text-white shadow-[0_0_24px_-10px_rgba(168,85,247,0.5)] cursor-pointer'
                              : 'border-white/10 bg-white/[0.03] text-zinc-200 hover:border-purple-400/40 hover:text-white cursor-pointer'
                        }`}
                      >
                        {slot.label}
                        {disabled && (
                          <span className="block text-[10px] font-medium no-underline mt-0.5 tracking-wide uppercase text-zinc-600">
                            Unavailable
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
      ) : (
        <p className="text-base text-zinc-400 font-normal">Select a date to view available times.</p>
      )}
    </div>
  );
};
