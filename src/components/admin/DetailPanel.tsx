import React from 'react';
import { X } from 'lucide-react';
import { EmptyState } from './EmptyState';
import type { LucideIcon } from 'lucide-react';

export const DetailPanel: React.FC<{
  open: boolean;
  title?: string;
  onClose?: () => void;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  children?: React.ReactNode;
  className?: string;
}> = ({
  open,
  title,
  onClose,
  emptyIcon,
  emptyTitle = 'Nothing selected',
  emptyDescription = 'Select a row to inspect details.',
  children,
  className = '',
}) => (
  <aside
    className={`min-w-0 max-w-full self-start overflow-hidden rounded-[16px] border border-[#e5d9f2] bg-white shadow-[0_8px_30px_rgba(22,22,22,0.06)] xl:sticky xl:top-24 ${className}`}
  >
    {!open ? (
      <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} className="py-16" />
    ) : (
      <div className="max-w-full overflow-x-hidden p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          {title ? (
            <h2 className="min-w-0 flex-1 truncate font-display text-[22px] font-semibold tracking-tight text-[#161616] sm:text-[24px]">
              {title}
            </h2>
          ) : (
            <span />
          )}
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#e5d9f2] text-[#6b6275] hover:bg-[#faf7ff]"
              aria-label="Close detail panel"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        {children}
      </div>
    )}
  </aside>
);
