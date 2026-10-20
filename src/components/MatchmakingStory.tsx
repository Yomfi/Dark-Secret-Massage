import React from 'react';
import { VisualMedia } from './VisualMedia';
import { ShieldCheck, HeartHandshake, Lock, ArrowRight } from 'lucide-react';

interface MatchmakingStoryProps {
  onOpenMatchmaking: () => void;
}

export const MatchmakingStory: React.FC<MatchmakingStoryProps> = ({ onOpenMatchmaking }) => {
  return (
    <section id="matchmaking" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.08]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        {/* Left: Narrative with Large Typography and Restrained Copy */}
        <div className="lg:col-span-6 space-y-6 sm:space-y-8">
          <div className="inline-flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-400">
              MATRIMONIAL MATCHMAKING
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.08] font-sans">
            Companionship built for marriage.
            <br />
            <span className="text-zinc-500 font-light">Not casual distraction.</span>
          </h2>

          {/* Single concise supporting paragraph in readable 18px-20px typography */}
          <p className="text-zinc-200 text-lg sm:text-xl leading-relaxed font-normal">
            Meet verified people who are intentional about marriage, values and long-term commitment.
          </p>

          {/* 3 Concise Supporting Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-white">Verified profiles</h4>
                <p className="text-xs text-zinc-400 mt-0.5">Authentic members</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <HeartHandshake className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-white">Marriage-focused</h4>
                <p className="text-xs text-zinc-400 mt-0.5">Shared values & intent</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-white">Private connections</h4>
                <p className="text-xs text-zinc-400 mt-0.5">Discreet introductions</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="pt-2">
            <button
              onClick={onOpenMatchmaking}
              className="inline-flex items-center gap-2 px-6 py-3.5 text-xs sm:text-sm font-semibold uppercase tracking-wider text-white bg-purple-600 hover:bg-purple-500 rounded-full shadow-lg shadow-purple-950/40 transition-all cursor-pointer group"
            >
              <span>Explore Matrimonial Profiles</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* Right: Large Editorial Photograph of Contemporary Ghanaian Couple */}
        <div className="lg:col-span-6">
          <VisualMedia
            type="matchmaking-editorial"
            className="w-full aspect-[4/3] sm:aspect-[16/11] shadow-2xl rounded-3xl overflow-hidden"
            alt="Contemporary Ghanaian couple sharing an intimate and authentic matrimonial moment"
          />
        </div>
      </div>
    </section>
  );
};
