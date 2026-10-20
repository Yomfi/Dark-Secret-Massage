import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const BookingHeader: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#060608]/90 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[4.25rem] flex items-center justify-between gap-4">
        <Link
          to="/"
          className="group flex items-center gap-2.5"
          aria-label="Dark Secret home"
        >
          <span className="w-2 h-2 rounded-full bg-purple-500 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-bold tracking-[0.28em] uppercase text-white">Dark Secret</span>
        </Link>

        <Link
          to="/massage"
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Back to Massage Services</span>
          <span className="sm:hidden">Massage</span>
        </Link>
      </div>
    </header>
  );
};
