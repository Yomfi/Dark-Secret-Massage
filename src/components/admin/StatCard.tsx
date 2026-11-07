import React from 'react';
import type { LucideIcon } from 'lucide-react';

export const StatCard: React.FC<{
  title: string;
  value: React.ReactNode;
  icon: LucideIcon;
  hint?: string;
}> = ({ title, value, icon: Icon, hint }) => (
  <article className="rounded-[16px] border border-[#e5d9f2] bg-white p-5 shadow-[0_1px_2px_rgba(22,22,22,0.04)]">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7e22ce]">{title}</p>
        <p className="mt-2 font-display text-[32px] font-semibold leading-none tracking-tight text-[#161616]">
          {value}
        </p>
        {hint ? <p className="mt-2 text-[12px] text-[#6b6275]">{hint}</p> : null}
      </div>
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(145deg,#faf7ff,#f0e8fb)] text-[#9333ea] ring-1 ring-[#e5d9f2]">
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </div>
    </div>
  </article>
);
