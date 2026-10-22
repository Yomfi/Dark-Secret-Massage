import React from 'react';
import { SlidersHorizontal, Bookmark } from 'lucide-react';

interface EmptyDiscoveryStateProps {
  onAdjustPreferences: () => void;
  onViewSaved: () => void;
}

export const EmptyDiscoveryState: React.FC<EmptyDiscoveryStateProps> = ({
  onAdjustPreferences,
  onViewSaved,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-16 max-w-md mx-auto">
      <div className="h-16 w-16 rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center mb-6">
        <span className="text-2xl text-purple-300">✦</span>
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
        You&apos;ve explored today&apos;s profiles.
      </h2>
      <p className="mt-3 text-base sm:text-lg text-zinc-300 font-normal leading-relaxed">
        Adjust your preferences or check back later for new people.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <button
          type="button"
          onClick={onAdjustPreferences}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-purple-600 px-6 py-3.5 text-sm font-semibold uppercase tracking-wider text-white hover:bg-purple-500 cursor-pointer"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Adjust preferences
        </button>
        <button
          type="button"
          onClick={onViewSaved}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-3.5 text-sm font-semibold uppercase tracking-wider text-zinc-200 cursor-pointer"
        >
          <Bookmark className="h-4 w-4" />
          View saved profiles
        </button>
      </div>
    </div>
  );
};
