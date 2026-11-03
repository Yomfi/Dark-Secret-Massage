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
}> = ({
  open,
  title,
  onClose,
  emptyIcon,
  emptyTitle = 'Nothing selected',
  emptyDescription = 'Select a row to inspect details.',
  children,
}) => (
  <aside className="rounded-[16px] border border-[#e8e0d2] bg-white shadow-[0_8px_30px_rgba(22,22,22,0.06)] self-start lg:sticky lg:top-24">
    {!open ? (
      <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} className="py-16" />
    ) : (
      <div className="p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          {title ? <h2 className="font-display text-[24px] font-semibold tracking-tight text-[#161616]">{title}</h2> : <span />}
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-xl border border-[#e8e0d2] text-[#6f675c] hover:bg-[#faf7f2]"
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
