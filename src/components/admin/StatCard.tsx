import React from 'react';
import type { LucideIcon } from 'lucide-react';

export const StatCard: React.FC<{
  title: string;
  value: React.ReactNode;
  icon: LucideIcon;
  hint?: string;
}> = ({ title, value, icon: Icon, hint }) => (
  <article className="rounded-[16px] border border-[#e8e0d2] bg-white p-5 shadow-[0_1px_2px_rgba(22,22,22,0.04)]">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7a52]">{title}</p>
        <p className="mt-2 font-display text-[32px] font-semibold leading-none tracking-tight text-[#161616]">
          {value}
        </p>
        {hint ? <p className="mt-2 text-[12px] text-[#6f675c]">{hint}</p> : null}
      </div>
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(145deg,#faf7f2,#f0e8da)] text-[#B08B4B] ring-1 ring-[#e8e0d2]">
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </div>
    </div>
  </article>
);
