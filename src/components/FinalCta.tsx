import React from 'react';
import { HeartHandshake, Calendar, ArrowRight, ShieldCheck } from 'lucide-react';

interface FinalCtaProps {
  onOpenMatchmaking: () => void;
  onOpenBooking: () => void;
}

export const FinalCta: React.FC<FinalCtaProps> = ({ onOpenMatchmaking, onOpenBooking }) => {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.08]">
      <div className="relative rounded-[2.5rem] bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.1] p-8 sm:p-14 lg:p-18 overflow-hidden text-center">
        {/* Subtle radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-purple-600/15 blur-[120px] pointer-events-none rounded-full" />

        <div className="relative z-10 max-w-3xl mx-auto">
          <span className="text-xs font-semibold uppercase tracking-[0.35em] text-purple-400 block mb-3">
            YOUR NEXT MOMENT
          </span>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-5 leading-[1.08] font-sans">
            Find connection. Find your moment.
          </h2>

          <p className="text-lg sm:text-xl text-zinc-300 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            Begin with verified matchmaking introductions or book a trusted professional massage session today.
          </p>

          {/* Two service pathways */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button
              onClick={onOpenMatchmaking}
              className="w-full sm:w-1/2 py-4 px-6 text-xs sm:text-sm font-semibold uppercase tracking-wider text-white bg-white/[0.06] hover:bg-white/[0.14] border border-white/15 rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg whitespace-nowrap"
            >
              <HeartHandshake className="w-4 h-4 text-purple-400" />
              <span>Find a Life Partner</span>
            </button>

            <button
              onClick={onOpenBooking}
              className="w-full sm:w-1/2 py-4 px-6 text-xs sm:text-sm font-semibold uppercase tracking-wider text-white bg-purple-600 hover:bg-purple-500 rounded-full shadow-xl shadow-purple-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap group"
            >
              <Calendar className="w-4 h-4" />
              <span>Book a Massage</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>Private onboarding & verified profiles</span>
          </div>
        </div>
      </div>
    </section>
  );
};
