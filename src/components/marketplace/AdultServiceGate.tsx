import React, { useEffect, useRef } from 'react';
import { Button } from '../ui/Button';

type Props = {
  open: boolean;
  onConfirm: () => void;
  onDecline: () => void;
};

const SESSION_KEY = 'ms.adult.service.consent';

/** Age confirmation is remembered for the browser session, never permanently. */
export function hasAdultServiceConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function grantAdultServiceConsent(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    // Storage blocked: the gate simply asks again on the next visit.
  }
}

/**
 * Blocks the adult (18+) service category until the customer confirms their age.
 * Declining leaves the rest of the catalogue available.
 */
export const AdultServiceGate: React.FC<Props> = ({ open, onConfirm, onDecline }) => {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDecline();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onDecline]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        aria-label="Close age confirmation"
        onClick={onDecline}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="adult-service-gate-title"
        aria-describedby="adult-service-gate-copy"
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0c0c12] p-6 shadow-2xl"
      >
        <p className="text-[10px] uppercase tracking-[0.22em] text-amber-300/90">Adults only · 18+</p>
        <h2
          id="adult-service-gate-title"
          className="mt-2 text-xl font-semibold tracking-tight text-white"
        >
          Confirm your age to continue
        </h2>
        <p id="adult-service-gate-copy" className="mt-3 text-[14px] leading-relaxed text-zinc-400">
          Erotic Massage is an adults-only category. You must be 18 or older to browse or filter for
          it.
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
          The category lists lawful, non-explicit massage only. Sexual services, explicit imagery and
          any content of a sexual nature are prohibited on Massager Studio.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" className="w-full sm:flex-1" onClick={onDecline}>
            I am under 18
          </Button>
          <Button ref={confirmRef} className="w-full sm:flex-1" onClick={onConfirm}>
            I am 18 or older
          </Button>
        </div>
        <p className="mt-4 text-[11.5px] leading-relaxed text-zinc-600">
          Your answer is remembered for this browser session only.
        </p>
      </div>
    </div>
  );
};
