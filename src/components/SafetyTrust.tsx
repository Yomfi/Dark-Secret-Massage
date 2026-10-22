import React from 'react';
import { UserCheck, ShieldCheck, Lock } from 'lucide-react';

export const SafetyTrust: React.FC = () => {
  const pillars = [
    {
      icon: UserCheck,
      title: 'Verified Profiles',
      description: 'Verification helps create a more trusted massage marketplace.',
      tag: 'Verification available',
    },
    {
      icon: ShieldCheck,
      title: 'Verified Providers',
      description: 'Provider profiles are reviewed before becoming publicly available.',
      tag: 'Provider verification',
    },
    {
      icon: Lock,
      title: 'Privacy & Protection',
      description: 'Privacy controls, reporting tools and secure account access are built into the platform.',
      tag: 'Privacy controls',
    },
  ];

  return (
    <section id="safety" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.08]">
      {/* Centered header */}
      <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
        <span className="text-xs uppercase tracking-[0.3em] text-purple-400 font-semibold block mb-3">
          SAFETY & DISCRETION
        </span>
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white font-sans leading-[1.08]">
          Zero compromise on trust.
        </h2>
        <p className="mt-4 text-lg sm:text-xl text-zinc-300 font-normal leading-relaxed">
          Thoughtful standards designed for confidentiality and mutual respect.
        </p>
      </div>

      {/* Minimal 3-column architecture */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {pillars.map((pillar, idx) => {
          const Icon = pillar.icon;
          return (
            <div
              key={idx}
              className="rounded-3xl bg-white/[0.02] border border-white/[0.08] p-8 sm:p-9 flex flex-col justify-between hover:border-purple-500/30 transition-all"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-purple-400 mb-6">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">
                  {pillar.title}
                </h3>
                <p className="text-base sm:text-lg text-zinc-300 font-normal leading-relaxed">
                  {pillar.description}
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-white/[0.06] text-xs uppercase tracking-wider text-purple-300 font-medium">
                {pillar.tag}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
