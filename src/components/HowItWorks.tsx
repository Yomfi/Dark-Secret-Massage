import React from 'react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      number: '01',
      title: 'CREATE YOUR PROFILE',
      description: 'Tell us who you are and what you are looking for.',
    },
    {
      number: '02',
      title: 'CHOOSE YOUR PATH',
      description: 'Explore marriage-focused matchmaking or professional massage services.',
    },
    {
      number: '03',
      title: 'CONNECT OR BOOK',
      description: 'Connect privately or reserve a trusted massage service.',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.08]">
      <div className="max-w-3xl mb-12 sm:mb-16">
        <span className="text-xs uppercase tracking-[0.3em] text-purple-400 font-semibold block mb-3">
          THE JOURNEY
        </span>
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white font-sans leading-[1.08]">
          Simple. Measured. Dignified.
        </h2>
        <p className="mt-4 text-lg sm:text-xl text-zinc-300 font-normal leading-relaxed">
          Three clear steps designed for privacy, ease and peace of mind.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {steps.map((step) => (
          <div
            key={step.number}
            className="p-8 sm:p-9 rounded-3xl bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between hover:border-purple-500/30 transition-colors"
          >
            <div>
              <div className="text-4xl sm:text-5xl font-bold text-purple-400/80 font-mono mb-6">
                {step.number}
              </div>
              <h3 className="text-lg sm:text-xl font-bold tracking-wide uppercase text-white mb-3">
                {step.title}
              </h3>
              <p className="text-base sm:text-lg text-zinc-300 font-normal leading-relaxed">
                {step.description}
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-white/[0.06] text-xs uppercase tracking-widest text-zinc-500 font-medium">
              Step {step.number}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
