import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, ShieldCheck, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { MASSAGE_SERVICES, CERTIFIED_THERAPISTS } from '../data/mockData';
import { calculateBookingPrice, validateBookingForm, BookingRequest } from '../lib/bookingAndMatchmaking';
import { VisualMedia } from './VisualMedia';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingConfirmed: (booking: BookingRequest & { totalGHS: number; id: string }) => void;
  preselectedServiceId?: string;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  onBookingConfirmed,
  preselectedServiceId,
}) => {
  const [selectedServiceId, setSelectedServiceId] = useState(
    preselectedServiceId || MASSAGE_SERVICES[0].id
  );
  const [selectedTherapistId, setSelectedTherapistId] = useState(
    CERTIFIED_THERAPISTS[0].id
  );
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [locationType, setLocationType] = useState<'studio' | 'home'>('studio');
  const [date, setDate] = useState('2026-10-22');
  const [timeSlot, setTimeSlot] = useState('14:00 - 15:00');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen) return null;

  const currentService = MASSAGE_SERVICES.find((s) => s.id === selectedServiceId) || MASSAGE_SERVICES[0];
  const currentTherapist = CERTIFIED_THERAPISTS.find((t) => t.id === selectedTherapistId) || CERTIFIED_THERAPISTS[0];

  const pricing = calculateBookingPrice(
    currentTherapist.hourlyRateGHS,
    durationMinutes,
    locationType
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const req: Partial<BookingRequest> = {
      therapistId: selectedTherapistId,
      serviceType: currentService.name,
      durationMinutes,
      date,
      timeSlot,
      locationType,
      clientName,
      clientPhone,
      clientAddress: locationType === 'home' ? clientAddress : undefined,
      specialRequests,
    };

    const validation = validateBookingForm(req);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors([]);
    const confirmedBooking = {
      ...(req as BookingRequest),
      totalGHS: pricing.totalGHS,
      id: `bk-${Date.now().toString(36)}`,
    };

    onBookingConfirmed(confirmedBooking);
    setConfirmed(true);

    setTimeout(() => {
      setConfirmed(false);
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#09090e] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-white/[0.08] bg-[#0c0c14]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-purple-400">
                CLINICAL RECOVERY & WELLNESS
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3" />
                <span>Certified Allied Health</span>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
              Reserve Professional Massage
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
            aria-label="Close booking modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {confirmed ? (
          <div className="p-12 text-center my-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-white">Booking Confirmed</h3>
            <p className="text-sm text-zinc-400 max-w-md mx-auto">
              Your appointment with <span className="text-white font-medium">{currentTherapist.name}</span> for{' '}
              <span className="text-white font-medium">{currentService.name}</span> on {date} at {timeSlot} has been
              registered discreetly.
            </p>
            <div className="text-xs text-purple-300 font-mono">
              Total: GHS {pricing.totalGHS} · Confirmation dispatched to your member portal
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8">
            {errors.length > 0 && (
              <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 space-y-1">
                <div className="flex items-center gap-2 font-semibold text-xs">
                  <AlertCircle className="w-4 h-4" />
                  <span>Please review the following requirements:</span>
                </div>
                <ul className="text-xs list-disc list-inside space-y-0.5">
                  {errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Step 1: Select Therapy */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-purple-300 mb-3">
                1. Select Massage Therapy
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MASSAGE_SERVICES.map((serv) => (
                  <button
                    key={serv.id}
                    type="button"
                    onClick={() => setSelectedServiceId(serv.id)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedServiceId === serv.id
                        ? 'border-purple-500 bg-purple-950/30'
                        : 'border-white/[0.08] bg-[#0e0e16] hover:border-white/20'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="text-sm font-semibold text-white">{serv.name}</div>
                      <span className="text-xs font-mono text-purple-300">GHS {serv.basePriceGHS}</span>
                    </div>
                    <div className="text-xs text-zinc-400 mt-1 line-clamp-1">{serv.tagline}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Select Certified Therapist */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-purple-300 mb-3">
                2. Select Licensed Therapist
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {CERTIFIED_THERAPISTS.map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => setSelectedTherapistId(th.id)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedTherapistId === th.id
                        ? 'border-purple-500 bg-purple-950/30'
                        : 'border-white/[0.08] bg-[#0e0e16] hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <VisualMedia
                          type={`therapist-${th.id.replace('therapist-', '') === '1' ? 'akua' : th.id.replace('therapist-', '') === '2' ? 'nana' : 'efua'}` as any}
                          className="w-10 h-10"
                          alt={th.name}
                        />
                        <div>
                          <div className="text-sm font-bold text-white">{th.name}</div>
                          <div className="text-[11px] text-zinc-400 font-mono">{th.licenseNumber}</div>
                        </div>
                      </div>
                      <div className="text-xs text-zinc-400 line-clamp-2">{th.bio}</div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
                      <span className="text-emerald-400 font-medium">★ {th.rating} ({th.reviewCount})</span>
                      <span className="text-zinc-400">GHS {th.hourlyRateGHS}/hr</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Location Type & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-purple-300 mb-2">
                  3. Location Preference
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLocationType('studio')}
                    className={`p-3 rounded-xl border text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      locationType === 'studio'
                        ? 'border-purple-500 bg-purple-950/40 text-white'
                        : 'border-white/10 bg-[#0e0e16] text-zinc-400 hover:text-white'
                    }`}
                  >
                    Private Studio
                    <span className="block text-[10px] font-normal normal-case text-zinc-500 mt-0.5">
                      Airport Residential Sanctuary
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationType('home')}
                    className={`p-3 rounded-xl border text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      locationType === 'home'
                        ? 'border-purple-500 bg-purple-950/40 text-white'
                        : 'border-white/10 bg-[#0e0e16] text-zinc-400 hover:text-white'
                    }`}
                  >
                    In-Home Visit
                    <span className="block text-[10px] font-normal normal-case text-zinc-500 mt-0.5">
                      Your residence (+120 GHS)
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-purple-300 mb-2">
                  4. Session Duration
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[60, 90, 120].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={`p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        durationMinutes === mins
                          ? 'border-purple-500 bg-purple-950/40 text-white'
                          : 'border-white/10 bg-[#0e0e16] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {mins} Mins
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* In-Home address input if applicable */}
            {locationType === 'home' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Residential / Estate Address in Accra
                </label>
                <input
                  type="text"
                  placeholder="e.g., Villa 14, Cantonments Crescent, Accra"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
            )}

            {/* Step 4: Schedule */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-purple-300 mb-2">
                  5. Preferred Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-purple-300 mb-2">
                  Time Slot
                </label>
                <select
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="10:00 - 11:00">10:00 AM – Morning Tranquility</option>
                  <option value="12:00 - 13:00">12:00 PM – Midday Respite</option>
                  <option value="14:00 - 15:00">02:00 PM – Afternoon Restoration</option>
                  <option value="16:30 - 17:30">04:30 PM – Twilight Decompression</option>
                  <option value="19:00 - 20:00">07:00 PM – Evening Sleep Ritual</option>
                </select>
              </div>
            </div>

            {/* Client Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Full Name (Confidential)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kwabena Mensah"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Private Phone / WhatsApp
                </label>
                <input
                  type="tel"
                  placeholder="+233 24 000 0000"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
            </div>

            {/* Price breakdown and confirmation button */}
            <div className="pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6 bg-[#0c0c14] p-5 rounded-2xl">
              <div>
                <div className="text-xs text-zinc-400">
                  Base ({pricing.durationHours} hrs): <span className="text-white font-mono">GHS {pricing.baseRate}</span>
                  {pricing.travelFee > 0 && (
                    <span> + Concierge Travel: <span className="text-white font-mono">GHS {pricing.travelFee}</span></span>
                  )}
                </div>
                <div className="text-xl sm:text-2xl font-bold text-white mt-1">
                  Total: <span className="text-purple-400 font-mono">GHS {pricing.totalGHS}</span>
                </div>
              </div>

              <button
                type="submit"
                className="px-8 py-3.5 text-xs sm:text-sm font-semibold uppercase tracking-wider text-white bg-purple-600 hover:bg-purple-500 rounded-full shadow-lg shadow-purple-950/50 transition-all cursor-pointer whitespace-nowrap text-center"
              >
                Confirm Confidential Booking →
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
