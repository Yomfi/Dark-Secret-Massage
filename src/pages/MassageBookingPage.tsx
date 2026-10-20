import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, Lock, ShieldCheck, UserCheck } from 'lucide-react';
import { BookingHeader } from '../components/booking/BookingHeader';
import { BookingProgress } from '../components/booking/BookingProgress';
import { ServiceSelector } from '../components/booking/ServiceSelector';
import { LocationSelector } from '../components/booking/LocationSelector';
import { DateTimeSelector } from '../components/booking/DateTimeSelector';
import { CustomerDetailsForm } from '../components/booking/CustomerDetailsForm';
import { BookingReview } from '../components/booking/BookingReview';
import { BookingSummary } from '../components/booking/BookingSummary';
import { BookingConfirmation } from '../components/booking/BookingConfirmation';
import {
  buildBookingRecord,
  createEmptyDraft,
  validateStep,
  type HomeLocationDetails,
  type MassageBookingDraft,
  type MassageBookingRecord,
  type ProviderPreference,
  type StepFieldErrors,
} from '../lib/massageBooking';
import { MASSAGE_SERVICES } from '../data/mockData';

interface MassageBookingPageProps {
  onBookingRequested: (booking: MassageBookingRecord) => void;
  onViewBookings: () => void;
  accountDefaults?: Partial<Pick<MassageBookingDraft, 'clientName' | 'clientPhone' | 'clientEmail'>>;
}

const ease = [0.16, 1, 0.3, 1] as const;

export const MassageBookingPage: React.FC<MassageBookingPageProps> = ({
  onBookingRequested,
  onViewBookings,
  accountDefaults,
}) => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const preselected =
    searchParams.get('service') ||
    (location.state as { serviceId?: string } | null)?.serviceId ||
    undefined;

  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<MassageBookingDraft>(() => {
    const base = createEmptyDraft(preselected);
    const preService = MASSAGE_SERVICES.find((s) => s.id === preselected);
    return {
      ...base,
      clientName: accountDefaults?.clientName || '',
      clientPhone: accountDefaults?.clientPhone || '',
      clientEmail: accountDefaults?.clientEmail || '',
      durationMinutes: preService?.durationMinutes[0] ?? 0,
    };
  });
  const [errors, setErrors] = useState<StepFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState<MassageBookingRecord | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [step, completed, reduceMotion]);

  const patchDraft = (patch: Partial<MassageBookingDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const goNext = () => {
    const result = validateStep(step, draft);
    setErrors(result.errors);
    if (!result.valid) return;
    setStep((s) => Math.min(5, s + 1));
  };

  const goBack = () => {
    setErrors({});
    setStep((s) => Math.max(1, s - 1));
  };

  const goToStep = (target: number) => {
    setErrors({});
    setStep(target);
  };

  const handleSubmitRequest = async () => {
    const result = validateStep(4, draft);
    if (!result.valid) {
      setErrors(result.errors);
      setStep(4);
      return;
    }
    setSubmitting(true);
    // Prototype: no Paystack charge — create pending_payment request only.
    await new Promise((r) => setTimeout(r, 650));
    const record = buildBookingRecord(draft);
    onBookingRequested(record);
    setCompleted(record);
    setSubmitting(false);
  };

  const trustStrip = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-zinc-400 font-medium">
        <span className="inline-flex items-center gap-1.5">
          <UserCheck className="h-4 w-4 text-purple-400" aria-hidden />
          Reviewed providers
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Lock className="h-4 w-4 text-purple-400" aria-hidden />
          Private booking details
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-purple-400" aria-hidden />
          Secure payment ready
        </span>
      </div>
    ),
    []
  );

  if (completed) {
    return (
      <div className="min-h-screen bg-[#060608] text-[#e4e4e9]">
        <BookingHeader />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <BookingConfirmation booking={completed} onViewBookings={onViewBookings} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060608] text-[#e4e4e9] pb-28 lg:pb-16">
      <BookingHeader />

      {/* Compact hero */}
      <section className="relative border-b border-white/[0.06] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/massage_therapy_booking_hero.jpg"
            alt="Professional massage therapy session in a calm wellness setting"
            className="h-full w-full object-cover object-[center_35%] opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#060608] via-[#060608]/92 to-[#060608]/75" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#060608] via-transparent to-[#060608]/50" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-purple-300 mb-3">
            Massage Therapy
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-white tracking-tight leading-[1.08] max-w-xl">
            Book your massage.
            <br />
            <span className="text-zinc-300 font-semibold">Your time. Your space.</span>
          </h1>
          <p className="mt-4 max-w-lg text-base sm:text-lg text-zinc-300 font-normal leading-relaxed">
            Choose your preferred therapy, location and time, and request a session with a trusted
            provider.
          </p>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="mb-8 sm:mb-10">
          <BookingProgress currentStep={step} />
        </div>

        <div className="mb-6 lg:hidden">
          <BookingSummary draft={draft} compact />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          <div className="lg:col-span-7 xl:col-span-8">
            <div className="mb-6">{trustStrip}</div>

            <div className="rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-[#0a0a10]/80 p-5 sm:p-7 lg:p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease }}
                >
                  {step === 1 && (
                    <ServiceSelector
                      serviceId={draft.serviceId}
                      durationMinutes={draft.durationMinutes}
                      errors={errors}
                      onSelectService={(serviceId) => {
                        patchDraft({ serviceId });
                        setErrors((e) => ({ ...e, serviceId: '' }));
                      }}
                      onSelectDuration={(durationMinutes) => {
                        patchDraft({ durationMinutes });
                        setErrors((e) => ({ ...e, durationMinutes: '' }));
                      }}
                    />
                  )}
                  {step === 2 && (
                    <LocationSelector
                      locationType={draft.locationType}
                      homeLocation={draft.homeLocation}
                      errors={errors}
                      onSelectType={(locationType) => {
                        patchDraft({ locationType });
                        setErrors((e) => ({ ...e, locationType: '' }));
                      }}
                      onHomeChange={(patch: Partial<HomeLocationDetails>) => {
                        patchDraft({
                          homeLocation: { ...draft.homeLocation, ...patch },
                        });
                      }}
                    />
                  )}
                  {step === 3 && (
                    <DateTimeSelector
                      date={draft.date}
                      timeSlotId={draft.timeSlotId}
                      errors={errors}
                      onSelectDate={(date) => patchDraft({ date })}
                      onSelectSlot={(timeSlotId, timeSlotLabel) =>
                        patchDraft({ timeSlotId, timeSlotLabel })
                      }
                    />
                  )}
                  {step === 4 && (
                    <CustomerDetailsForm
                      clientName={draft.clientName}
                      clientPhone={draft.clientPhone}
                      clientEmail={draft.clientEmail}
                      providerPreference={draft.providerPreference}
                      preferredTherapistId={draft.preferredTherapistId}
                      specialRequests={draft.specialRequests}
                      tensionNotes={draft.tensionNotes}
                      accessibilityNeeds={draft.accessibilityNeeds}
                      errors={errors}
                      onChange={(patch) => patchDraft(patch as Partial<MassageBookingDraft>)}
                      onProviderPreference={(providerPreference: ProviderPreference) =>
                        patchDraft({
                          providerPreference,
                          preferredTherapistId:
                            providerPreference === 'any' ? '' : draft.preferredTherapistId,
                        })
                      }
                    />
                  )}
                  {step === 5 && <BookingReview draft={draft} onEditStep={goToStep} />}
                </motion.div>
              </AnimatePresence>

              {/* Desktop step controls */}
              <div className="mt-8 pt-6 border-t border-white/[0.08] hidden lg:flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={step === 1 ? () => navigate('/#massage') : goBack}
                  className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-transparent px-5 py-3 text-sm font-semibold text-zinc-300 hover:text-white hover:border-white/25 transition-all cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  {step === 1 ? 'Back' : 'Previous'}
                </button>

                {step < 5 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-7 py-3 text-sm font-semibold uppercase tracking-wider text-white hover:bg-purple-500 shadow-[0_12px_36px_-14px_rgba(147,51,234,0.7)] transition-all hover:-translate-y-0.5 cursor-pointer motion-reduce:transform-none"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmitRequest}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-7 py-3 text-sm font-semibold uppercase tracking-wider text-white hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_12px_36px_-14px_rgba(147,51,234,0.7)] transition-all hover:-translate-y-0.5 cursor-pointer motion-reduce:transform-none"
                  >
                    {submitting ? 'Submitting…' : 'Confirm booking request'}
                    {!submitting && <ArrowRight className="h-4 w-4" aria-hidden />}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="hidden lg:block lg:col-span-5 xl:col-span-4">
            <BookingSummary draft={draft} showEdit={step === 5} onEditStep={goToStep} />
          </div>
        </div>
      </main>

      {/* Mobile sticky continue */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/[0.08] bg-[#060608]/95 backdrop-blur-xl px-4 py-3 safe-area-pb">
        <div className="max-w-lg mx-auto flex items-center gap-2.5">
          {step > 1 && (
            <button
              type="button"
              onClick={goBack}
              className="shrink-0 inline-flex items-center justify-center rounded-full border border-white/15 px-4 py-3.5 text-sm font-semibold text-zinc-200 cursor-pointer"
              aria-label="Previous step"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          {step < 5 ? (
            <button
              type="button"
              onClick={goNext}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-purple-600 px-5 py-3.5 text-sm font-semibold uppercase tracking-wider text-white hover:bg-purple-500 cursor-pointer"
            >
              Continue
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmitRequest}
              disabled={submitting}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-purple-600 px-5 py-3.5 text-sm font-semibold uppercase tracking-wider text-white disabled:opacity-60 cursor-pointer"
            >
              {submitting ? 'Submitting…' : 'Confirm booking request'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
