import React from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDisplayDate } from '../../lib/bookingAvailability';
import { STUDIO_LOCATION_LABEL, type MassageBookingRecord } from '../../lib/massageBooking';

interface BookingConfirmationProps {
  booking: MassageBookingRecord;
  onViewBookings: () => void;
}

export const BookingConfirmation: React.FC<BookingConfirmationProps> = ({
  booking,
  onViewBookings,
}) => {
  const locationLabel =
    booking.locationType === 'studio'
      ? STUDIO_LOCATION_LABEL
      : [booking.homeLocation.cityArea, booking.homeLocation.region].filter(Boolean).join(', ');

  return (
    <div className="max-w-xl mx-auto text-center py-8 sm:py-12 px-2">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-950/50 text-emerald-400">
        <CheckCircle2 className="h-8 w-8" aria-hidden />
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
        Your massage request is in.
      </h1>
      <p className="mt-4 text-base sm:text-lg text-zinc-300 font-normal leading-relaxed">
        We&apos;ll notify you when your session is confirmed. Payment has not been completed yet.
      </p>

      <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6 text-left space-y-3">
        <Row label="Booking reference" value={booking.reference} mono />
        <Row label="Therapy" value={booking.serviceName} />
        <Row label="Date" value={formatDisplayDate(booking.date)} />
        <Row label="Time" value={booking.timeSlotLabel} />
        <Row
          label="Location type"
          value={booking.locationType === 'studio' ? 'Studio' : 'In-home'}
        />
        <Row label="Location" value={locationLabel || '—'} />
        <Row label="Status" value="Pending payment / review" />
        <Row label="Quoted total" value={`GHS ${booking.totalGHS}`} mono />
      </div>

      <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
        <button
          type="button"
          onClick={onViewBookings}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-purple-600 px-7 py-3.5 text-sm font-semibold uppercase tracking-wider text-white hover:bg-purple-500 transition-all cursor-pointer"
        >
          View my bookings
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-7 py-3.5 text-sm font-semibold uppercase tracking-wider text-zinc-200 hover:border-purple-400/40 hover:text-white transition-all"
        >
          Return home
        </Link>
      </div>
    </div>
  );
};

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm sm:text-base">
      <span className="text-zinc-400 font-medium shrink-0">{label}</span>
      <span className={`text-white font-medium text-right break-words ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
};
