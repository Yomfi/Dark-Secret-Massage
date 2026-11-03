import React from 'react';

const STYLES: Record<string, string> = {
  active: 'border-emerald-200/80 bg-emerald-50 text-emerald-800',
  verified: 'border-emerald-200/80 bg-emerald-50 text-emerald-800',
  published: 'border-emerald-200/80 bg-emerald-50 text-emerald-800',
  confirmed: 'border-emerald-200/80 bg-emerald-50 text-emerald-800',
  resolved: 'border-emerald-200/80 bg-emerald-50 text-emerald-800',
  pending: 'border-amber-200/90 bg-amber-50 text-amber-900',
  pending_review: 'border-amber-200/90 bg-amber-50 text-amber-900',
  draft: 'border-amber-200/90 bg-amber-50 text-amber-900',
  changes_requested: 'border-sky-200 bg-sky-50 text-sky-900',
  open: 'border-sky-200 bg-sky-50 text-sky-900',
  suspended: 'border-red-200 bg-red-50 text-red-800',
  rejected: 'border-red-200 bg-red-50 text-red-800',
  cancelled: 'border-[#e4ddd0] bg-[#f3efe6] text-[#6f675c]',
  completed: 'border-[#e4ddd0] bg-[#f3efe6] text-[#6f675c]',
  deleted: 'border-[#e4ddd0] bg-[#f3efe6] text-[#6f675c]',
  inactive: 'border-[#e4ddd0] bg-[#f3efe6] text-[#6f675c]',
};

export function statusBadgeClass(status: string): string {
  const key = status.toLowerCase().replace(/\s+/g, '_');
  return `inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${STYLES[key] ?? 'border-[#e4ddd0] bg-[#f3efe6] text-[#6f675c]'}`;
}

export const StatusBadge: React.FC<{ status: string; label?: string }> = ({ status, label }) => (
  <span className={statusBadgeClass(status)}>{label ?? status.replace(/_/g, ' ')}</span>
);
