import React from 'react';
import { VisualMedia } from './VisualMedia';
import { Calendar, ArrowRight, Clock, Sparkles } from 'lucide-react';
import { MASSAGE_SERVICES } from '../data/mockData';

interface MassageStoryProps {
  onOpenBooking: () => void;
  onSelectService?: (serviceId: string) => void;
}

export const MassageStory: React.FC<MassageStoryProps> = ({
  onOpenBooking,
  onSelectService,
}) => {
  return (
    <section id="massage" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.08]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        {/* Left: Professional Massage & Sanctuary Photography */}
        <div className="lg:col-span-6 order-2 lg:order-1">
          <VisualMedia
            type="massage-sanctuary"
            className="w-full aspect-[4/3] sm:aspect-[16/11] shadow-2xl rounded-3xl overflow-hidden"
            alt="Professional luxury wellness treatment room with massage therapy setup"
          />
        </div>

        {/* Right: Narrative with Concise Overview & Service Breakdown */}
        <div className="lg:col-span-6 order-1 lg:order-2 space-y-6 sm:space-y-8">
          <div className="inline-flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-400">
              PROFESSIONAL MASSAGE WELLNESS
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.08] font-sans">
            Restorative bodywork.
            <br />
            <span className="text-zinc-500 font-light">Professional wellness.</span>
          </h2>

          {/* Single concise supporting paragraph */}
          <p className="text-zinc-200 text-lg sm:text-xl leading-relaxed font-normal">
            Book trusted professional massage services for relaxation, recovery and wellbeing.
          </p>

          {/* Concise Service Details (Services, Provider, Duration, Price, Availability) */}
          <div className="space-y-3 pt-1">
            {MASSAGE_SERVICES.slice(0, 3).map((service) => (
              <div
                key={service.id}
                onClick={() => {
                  if (onSelectService) {
                    onSelectService(service.id);
                  } else {
                    onOpenBooking();
                  }
                }}
                className="group p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-purple-500/40 hover:bg-white/[0.06] transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="text-base font-semibold text-white group-hover:text-purple-300 transition-colors">
                    {service.name}
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5 flex flex-wrap items-center gap-2">
                    <span>Reviewed Provider</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      60 / 90 min
                    </span>
                    <span>•</span>
                    <span className="text-emerald-400 font-medium">Studio or In-Home</span>
                  </div>
                </div>

                <div className="sm:text-right shrink-0">
                  <span className="text-xs text-zinc-400 mr-1 sm:block sm:mr-0">From</span>
                  <span className="text-base font-semibold text-white font-mono">
                    GHS {service.basePriceGHS}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Secondary CTA — explore full massage services */}
          <div className="pt-1">
            <a
              href="/massage"
              className="group inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-full border border-white/15 bg-white/[0.03] px-6 py-3.5 text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-zinc-200 shadow-[0_0_0_1px_rgba(168,85,247,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:border-purple-400/45 hover:bg-purple-500/[0.08] hover:text-white hover:shadow-[0_12px_40px_-16px_rgba(168,85,247,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060608] motion-reduce:transform-none"
            >
              <span>View More Massage Services</span>
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none"
                aria-hidden
              />
            </a>
          </div>

          {/* CTA Button */}
          <div className="pt-2">
            <button
              onClick={onOpenBooking}
              className="inline-flex items-center gap-2 px-6 py-3.5 text-xs sm:text-sm font-semibold uppercase tracking-wider text-white bg-purple-600 hover:bg-purple-500 rounded-full shadow-lg shadow-purple-950/40 transition-all cursor-pointer group"
            >
              <Calendar className="w-4 h-4" />
              <span>Book a Massage Service</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
