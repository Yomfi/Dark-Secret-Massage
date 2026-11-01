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
import { Button, Container, PageHeading, surfaceClass } from '../components/ui';

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
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] font-medium text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <UserCheck className="h-4 w-4 text-brand-gold" aria-hidden />
          Reviewed providers
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Lock className="h-4 w-4 text-brand-gold" aria-hidden />
          Private booking details
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-brand-gold" aria-hidden />
          Secure payment ready
        </span>
      </div>
    ),
    []
  );

  if (completed) {
    return (
      <div className="min-h-screen bg-brand-surface text-zinc-200">
        <BookingHeader />
        <Container as="main" className="py-12 sm:py-16">
          <BookingConfirmation booking={completed} onViewBookings={onViewBookings} />
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-surface pb-28 text-zinc-200 lg:pb-16">
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
        <Container className="relative py-10 sm:py-12">
          <PageHeading
            eyebrow="Massage therapy"
            title="Book your massage"
            description="Choose your therapy, setting and time, then request a session with a reviewed provider."
          />
        </Container>
      </section>

      <Container as="main" className="py-8 sm:py-10">
        <div className="mb-8 sm:mb-10">
          <BookingProgress currentStep={step} />
        </div>

        <div className="mb-6 lg:hidden">
          <BookingSummary draft={draft} compact />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          <div className="lg:col-span-7 xl:col-span-8">
            <div className="mb-6">{trustStrip}</div>

            <div className={surfaceClass('bg-[#0B0B0C]/80 p-5 sm:p-7')}>
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
              <div className="mt-8 hidden items-center justify-between gap-4 border-t border-white/10 pt-6 lg:flex">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={step === 1 ? () => navigate('/#massage') : goBack}
                  iconLeft={<ArrowLeft className="h-4 w-4" aria-hidden />}
                >
                  {step === 1 ? 'Back' : 'Previous'}
                </Button>

                {step < 5 ? (
                  <Button
                    size="md"
                    onClick={goNext}
                    iconRight={<ArrowRight className="h-4 w-4" aria-hidden />}
                  >
                    Continue
                  </Button>
                ) : (
                  <Button
                    size="md"
                    onClick={handleSubmitRequest}
                    loading={submitting}
                    loadingLabel="Submitting…"
                    iconRight={<ArrowRight className="h-4 w-4" aria-hidden />}
                  >
                    Confirm booking request
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="hidden lg:block lg:col-span-5 xl:col-span-4">
            <BookingSummary draft={draft} showEdit={step === 5} onEditStep={goToStep} />
          </div>
        </div>
      </Container>

      {/* Mobile sticky continue */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-brand-surface/95 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-2.5">
          {step > 1 && (
            <Button variant="secondary" onClick={goBack} aria-label="Previous step" className="w-12 px-0">
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </Button>
          )}
          {step < 5 ? (
            <Button onClick={goNext} className="flex-1" iconRight={<ArrowRight className="h-4 w-4" aria-hidden />}>
              Continue
            </Button>
          ) : (
            <Button
              onClick={handleSubmitRequest}
              loading={submitting}
              loadingLabel="Submitting…"
              className="flex-1"
            >
              Confirm booking request
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
