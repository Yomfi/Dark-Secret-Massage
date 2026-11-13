import React from 'react';
import { LayoutGrid, List } from 'lucide-react';
import type { ExploreView } from '../../lib/exploreView';

type Props = {
  value: ExploreView;
  onChange: (view: ExploreView) => void;
  className?: string;
};

const OPTIONS: { value: ExploreView; label: string; Icon: typeof LayoutGrid }[] = [
  { value: 'grid', label: 'Grid', Icon: LayoutGrid },
  { value: 'list', label: 'List', Icon: List },
];

/** Grid/List segmented control used beside the Explore search and filter controls. */
export const ExploreViewToggle: React.FC<Props> = ({ value, onChange, className = '' }) => {
  return (
    <div
      role="group"
      aria-label="Provider layout"
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-xl border border-white/10 bg-white/[0.02] p-1 ${className}`}
    >
      {OPTIONS.map(({ value: optionValue, label, Icon }) => {
        const active = value === optionValue;
        return (
          <button
            key={optionValue}
            type="button"
            aria-pressed={active}
            aria-label={`${label} view`}
            title={`${label} view`}
            onClick={() => onChange(optionValue)}
            className={[
              'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/80',
              active
                ? 'bg-brand-purple/20 text-white shadow-[inset_0_0_0_1px_rgba(168,85,247,0.45)]'
                : 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200',
            ].join(' ')}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
};
