import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Clock, MapPin, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { IconButton, buttonClass } from '../ui/Button';
import {
  bookMassageHref,
  formatDurationOptions,
  type MassageServicePresentation,
} from '../../lib/massageServicePresentation';

interface MassageServiceDetailsProps {
  item: MassageServicePresentation | null;
  onClose: () => void;
}

export const MassageServiceDetails: React.FC<MassageServiceDetailsProps> = ({ item, onClose }) => {
  const reduceMotion = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!item) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [item, onClose]);

  return (
    <AnimatePresence>
      {item && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.button
            type="button"
            aria-label="Close details"
            className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            onClick={onClose}
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="massage-service-title"
            initial={reduceMotion ? false : { x: '100%' }}
            animate={{ x: 0 }}
            exit={reduceMotion ? undefined : { x: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-white/10 bg-brand-surface shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/[0.07] bg-brand-surface/95 px-5 py-3.5 backdrop-blur-xl">
              <p className="text-[13px] font-semibold text-zinc-300">Service details</p>
              <IconButton ref={closeRef} onClick={onClose} aria-label="Close">
                <X className="h-5 w-5" aria-hidden />
              </IconButton>
            </div>

            <div className="relative aspect-[16/9] w-full overflow-hidden bg-brand-ink">
              <img src={item.image} alt={item.imageAlt} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-surface/80 via-transparent to-transparent" />
            </div>

            <div className="flex-1 space-y-6 px-5 py-6">
              <div>
                <h2
                  id="massage-service-title"
                  className="text-xl font-semibold tracking-[-0.01em] text-white sm:text-2xl"
                >
                  {item.service.name}
                </h2>
                <p className="mt-2 text-[14.5px] leading-relaxed text-zinc-400">
                  {item.service.description}
                </p>
              </div>

              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
                    <Clock className="h-3.5 w-3.5" aria-hidden /> Duration
                  </dt>
                  <dd className="mt-1.5 text-[14px] font-medium text-white">
                    {formatDurationOptions(item.service.durationMinutes)}
                  </dd>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
                    Starting price
                  </dt>
                  <dd className="mt-1.5 text-[15px] font-semibold tabular-nums text-white">
                    GHS {item.service.basePriceGHS}
                  </dd>
                </div>
              </dl>

              <DetailBlock title="Who it may suit">
                <p className="text-[14px] leading-relaxed text-zinc-300">{item.whoItMaySuit}</p>
              </DetailBlock>

              <DetailBlock title="What to expect">
                <ul className="space-y-2">
                  {item.whatToExpect.map((line) => (
                    <li key={line} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-zinc-300">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gold" aria-hidden />
                      {line}
                    </li>
                  ))}
                </ul>
              </DetailBlock>

              <DetailBlock title="Where it is available">
                <p className="inline-flex items-start gap-2 text-[14px] leading-relaxed text-zinc-300">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold-light" aria-hidden />
                  {item.locationAvailability}
                </p>
              </DetailBlock>
            </div>

            <div className="sticky bottom-0 border-t border-white/[0.07] bg-brand-surface/95 px-5 py-4 backdrop-blur-xl">
              <Link to={bookMassageHref(item.service.id)} className={buttonClass({ size: 'lg', fullWidth: true })}>
                Book now · GHS {item.service.basePriceGHS}
              </Link>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[12px] font-semibold text-zinc-400">{title}</h3>
      {children}
    </section>
  );
}
