import React from 'react';
import { ArrowUpRight, Heart, Sparkles, ShieldCheck, Clock, Check } from 'lucide-react';

interface TwoExperiencesProps {
  onOpenMatchmaking: () => void;
  onOpenBooking: () => void;
}

export const TwoExperiences: React.FC<TwoExperiencesProps> = ({
  onOpenMatchmaking,
  onOpenBooking,
}) => {
  return (
    <section id="experiences" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Editorial section header with large headline and short supporting copy */}
      <div className="max-w-3xl mb-12 sm:mb-16">
        <span className="text-xs uppercase tracking-[0.3em] text-purple-400 font-semibold block mb-3">
          TWO DISTINCT PATHWAYS
        </span>
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white font-sans leading-[1.08]">
          Two private worlds.
          <br />
          <span className="text-zinc-500 font-light">One trusted platform.</span>
        </h2>
        <p className="mt-4 text-lg sm:text-xl text-zinc-300 font-normal leading-relaxed">
          Choose between intentional, marriage-minded matchmaking or professional therapeutic massage.
        </p>
      </div>

      {/* Editorial dual treatment with lighter cards and high readability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Pathway 1: Intentional Matrimonial Matchmaking */}
        <div className="group relative rounded-3xl bg-white/[0.02] border border-white/[0.08] p-8 sm:p-10 flex flex-col justify-between transition-all duration-300 hover:border-purple-500/40 hover:bg-white/[0.03]">
          <div>
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-purple-400">
                PATHWAY 01
              </span>
              <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-purple-400">
                <Heart className="w-5 h-5" />
              </div>
            </div>

            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Find a Life Partner
            </h3>
            <p className="text-base sm:text-lg text-zinc-300 font-normal leading-relaxed mb-6">
              Private matrimonial introductions for marriage-minded Ghanaian and African professionals.
            </p>

            {/* Concise highlights */}
            <div className="space-y-2.5 mb-8 text-sm sm:text-base text-zinc-300">
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                <span>Verified candidate profiles</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                <span>Values, faith and family alignment</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                <span>Private, confidential introductions</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/[0.06]">
            <button
              onClick={onOpenMatchmaking}
              className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white group-hover:text-purple-300 transition-colors cursor-pointer"
            >
              <span>Explore Matchmaking</span>
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>
        </div>

        {/* Pathway 2: Professional Wellness & Massage */}
        <div className="group relative rounded-3xl bg-white/[0.02] border border-white/[0.08] p-8 sm:p-10 flex flex-col justify-between transition-all duration-300 hover:border-purple-500/40 hover:bg-white/[0.03]">
          <div>
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-purple-400">
                PATHWAY 02
              </span>
              <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-purple-400">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>

            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Book a Massage
            </h3>
            <p className="text-base sm:text-lg text-zinc-300 font-normal leading-relaxed mb-6">
              Restorative bodywork delivered by trusted practitioners for targeted physical recovery.
            </p>

            {/* Concise highlights */}
            <div className="space-y-2.5 mb-8 text-sm sm:text-base text-zinc-300">
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                <span>Reviewed professional therapists</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                <span>Deep tissue, Swedish & recovery therapies</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                <span>Private studio or comfortable in-home visits</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/[0.06]">
            <button
              onClick={onOpenBooking}
              className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white group-hover:text-purple-300 transition-colors cursor-pointer"
            >
              <span>Book a Massage</span>
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
