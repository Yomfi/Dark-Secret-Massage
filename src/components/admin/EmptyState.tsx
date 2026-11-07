import React from 'react';
import type { LucideIcon } from 'lucide-react';

export const EmptyState: React.FC<{
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ icon: Icon, title, description, action, className = '' }) => (
  <div className={`flex flex-col items-center justify-center px-6 py-12 text-center ${className}`}>
    {Icon ? (
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-[#e5d9f2] bg-[#faf7ff] text-[#9333ea]">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
    ) : null}
    <h3 className="font-display text-[22px] font-semibold tracking-tight text-[#161616]">{title}</h3>
    {description ? <p className="mt-2 max-w-sm text-[13.5px] leading-relaxed text-[#6b6275]">{description}</p> : null}
    {action ? <div className="mt-5">{action}</div> : null}
  </div>
);
