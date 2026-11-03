import React from 'react';

export const AdminCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}> = ({ children, className = '', padding = true }) => (
  <section
    className={`rounded-[16px] border border-[#e8e0d2] bg-white shadow-[0_1px_2px_rgba(22,22,22,0.04)] ${
      padding ? 'p-5 sm:p-6' : ''
    } ${className}`}
  >
    {children}
  </section>
);

export const AdminCardHeader: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}> = ({ title, subtitle, action }) => (
  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
    <div className="min-w-0">
      <h2 className="font-display text-[22px] font-semibold tracking-tight text-[#161616]">{title}</h2>
      {subtitle ? <p className="mt-1 text-[13px] leading-relaxed text-[#6f675c]">{subtitle}</p> : null}
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </div>
);
