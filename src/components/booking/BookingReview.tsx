import React from 'react';
import { formatDisplayDate } from '../../lib/bookingAvailability';
import {
  STUDIO_LOCATION_LABEL,
  getServiceById,
  calculateServicePrice,
  type MassageBookingDraft,
} from '../../lib/massageBooking';
import { CERTIFIED_THERAPISTS } from '../../data/mockData';

interface BookingReviewProps {
  draft: MassageBookingDraft;
  onEditStep: (step: number) => void;
}

export const BookingReview: React.FC<BookingReviewProps> = ({ draft, onEditStep }) => {
  const service = getServiceById(draft.serviceId);
  const pricing = calculateServicePrice(service, draft.durationMinutes, draft.locationType);
  const therapist =
    draft.providerPreference === 'specific'
      ? CERTIFIED_THERAPISTS.find((t) => t.id === draft.preferredTherapistId)
      : null;

  const locationDetail =
    draft.locationType === 'studio'
      ? STUDIO_LOCATION_LABEL
      : [
          draft.homeLocation.address,
          draft.homeLocation.landmark,
          draft.homeLocation.cityArea,
          draft.homeLocation.region,
        ]
          .filter(Boolean)
          .join(' · ');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Review & confirm</h2>
        <p className="mt-2 text-base sm:text-lg text-zinc-300 font-normal leading-relaxed">
          Check your details, then submit a booking request. Payment is not taken on this step.
        </p>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] divide-y divide-white/[0.06]">
        <ReviewRow
          label="Massage therapy"
          value={service?.name || '—'}
          onEdit={() => onEditStep(1)}
        />
        <ReviewRow
          label="Duration"
          value={draft.durationMinutes ? `${draft.durationMinutes} minutes` : '—'}
          onEdit={() => onEditStep(1)}
        />
        <ReviewRow
          label="Date"
          value={formatDisplayDate(draft.date)}
          onEdit={() => onEditStep(3)}
        />
        <ReviewRow label="Time" value={draft.timeSlotLabel || '—'} onEdit={() => onEditStep(3)} />
        <ReviewRow
          label="Service type"
          value={draft.locationType === 'studio' ? 'Studio' : 'In-home / mobile'}
          onEdit={() => onEditStep(2)}
        />
        <ReviewRow label="Location" value={locationDetail || '—'} onEdit={() => onEditStep(2)} />
        <ReviewRow
          label="Provider"
          value={therapist?.name || 'Any available provider'}
          onEdit={() => onEditStep(4)}
        />
        <ReviewRow
          label="Price"
          value={`GHS ${pricing.totalGHS}`}
          onEdit={() => onEditStep(1)}
          mono
        />
        <ReviewRow label="Customer name" value={draft.clientName} onEdit={() => onEditStep(4)} />
        <ReviewRow label="Phone" value={draft.clientPhone} onEdit={() => onEditStep(4)} />
        <ReviewRow label="Email" value={draft.clientEmail} onEdit={() => onEditStep(4)} />
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c12] p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-purple-300 mb-2">
          Payment readiness
        </p>
        <p className="text-base text-zinc-300 font-normal leading-relaxed">
          Mobile Money and card checkout via Paystack will be available here. For now, submitting
          creates a <span className="text-white font-medium">pending payment</span> booking request
          — not a paid confirmation.
        </p>
      </div>
    </div>
  );
};

function ReviewRow({
  label,
  value,
  onEdit,
  mono,
}: {
  label: string;
  value: string;
  onEdit: () => void;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 sm:px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-400">{label}</p>
        <p className={`mt-0.5 text-base font-semibold text-white break-words ${mono ? 'font-mono' : ''}`}>
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 text-xs font-semibold uppercase tracking-wider text-purple-300 hover:text-purple-200 cursor-pointer pt-0.5"
      >
        Edit
      </button>
    </div>
  );
}
