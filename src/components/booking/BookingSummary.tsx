import React, { useState } from 'react';
import { ChevronDown, Lock, ShieldCheck } from 'lucide-react';
import { formatDisplayDate } from '../../lib/bookingAvailability';
import {
  STUDIO_LOCATION_LABEL,
  getServiceById,
  calculateServicePrice,
  type MassageBookingDraft,
} from '../../lib/massageBooking';
import { CERTIFIED_THERAPISTS } from '../../data/mockData';

interface BookingSummaryProps {
  draft: MassageBookingDraft;
  compact?: boolean;
  onEditStep?: (step: number) => void;
  showEdit?: boolean;
}

export const BookingSummary: React.FC<BookingSummaryProps> = ({
  draft,
  compact = false,
  onEditStep,
  showEdit = false,
}) => {
  const [open, setOpen] = useState(false);
  const service = getServiceById(draft.serviceId);
  const pricing = calculateServicePrice(service, draft.durationMinutes, draft.locationType);
  const therapist =
    draft.providerPreference === 'specific'
      ? CERTIFIED_THERAPISTS.find((t) => t.id === draft.preferredTherapistId)
      : null;

  const locationLabel =
    draft.locationType === 'studio'
      ? STUDIO_LOCATION_LABEL
      : draft.locationType === 'home'
        ? [draft.homeLocation.cityArea, draft.homeLocation.region].filter(Boolean).join(', ') ||
          'In-home'
        : '—';

  const rows: { label: string; value: string; step?: number }[] = [
    { label: 'Service', value: service?.name || '—', step: 1 },
    {
      label: 'Duration',
      value: draft.durationMinutes ? `${draft.durationMinutes} minutes` : '—',
      step: 1,
    },
    { label: 'Date', value: draft.date ? formatDisplayDate(draft.date) : '—', step: 3 },
    { label: 'Time', value: draft.timeSlotLabel || '—', step: 3 },
    {
      label: 'Setting',
      value:
        draft.locationType === 'studio'
          ? 'Studio'
          : draft.locationType === 'home'
            ? 'In-home'
            : '—',
      step: 2,
    },
    { label: 'Location', value: locationLabel, step: 2 },
    {
      label: 'Provider',
      value: therapist?.name || (draft.providerPreference === 'any' ? 'Any available' : '—'),
      step: 4,
    },
  ];

  const body = (
    <div className="space-y-4">
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-3 text-sm sm:text-base">
            <div className="min-w-0">
              <p className="text-zinc-400 font-medium">{row.label}</p>
              <p className="text-white font-medium leading-snug break-words">{row.value}</p>
            </div>
            {showEdit && row.step && onEditStep && (
              <button
                type="button"
                onClick={() => onEditStep(row.step!)}
                className="shrink-0 text-xs font-semibold uppercase tracking-wider text-purple-300 hover:text-purple-200 cursor-pointer"
              >
                Edit
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-white/[0.08]">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Price</span>
          <span className="text-xl font-bold text-white font-mono">
            {pricing.totalGHS > 0 ? `GHS ${pricing.totalGHS}` : '—'}
          </span>
        </div>
        {pricing.travelFee > 0 && (
          <p className="mt-1 text-sm text-zinc-400 font-normal text-right">
            Includes GHS {pricing.travelFee} travel fee
          </p>
        )}
      </div>

      <div className="flex items-start gap-2 text-sm text-zinc-400 font-normal pt-1">
        <Lock className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" aria-hidden />
        <span>Booking details stay private. Payment is confirmed only after secure checkout.</span>
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c12] overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left cursor-pointer"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-300">Your session</p>
            <p className="text-sm font-semibold text-white mt-0.5">
              {service?.name || 'Select a therapy'}
              {pricing.totalGHS > 0 ? ` · GHS ${pricing.totalGHS}` : ''}
            </p>
          </div>
          <ChevronDown
            className={`h-5 w-5 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
        {open && <div className="px-4 pb-4 border-t border-white/[0.06] pt-3">{body}</div>}
      </div>
    );
  }

  return (
    <aside className="rounded-2xl border border-white/[0.08] bg-[#0c0c12] p-5 sm:p-6 sticky top-24">
      <div className="flex items-center gap-2 mb-5">
        <ShieldCheck className="h-4 w-4 text-purple-400" aria-hidden />
        <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Your session</h3>
      </div>
      {body}
    </aside>
  );
};
