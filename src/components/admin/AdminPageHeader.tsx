import React from 'react';

export const AdminPageHeader: React.FC<{
  breadcrumbs: string[];
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}> = ({ breadcrumbs, title, subtitle, actions }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div className="min-w-0">
      <p className="text-[12px] font-medium tracking-wide text-[#8a7a52]">
        {breadcrumbs.join(' / ')}
      </p>
      <h1 className="mt-1 font-display text-[36px] font-semibold leading-[1.05] tracking-tight text-[#161616] sm:text-[40px]">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[#6f675c]">{subtitle}</p>
      ) : null}
    </div>
    {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
  </div>
);
