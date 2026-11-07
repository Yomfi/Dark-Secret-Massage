import React from 'react';

export const adminInputClass =
  'h-12 w-full rounded-[14px] border border-[#e2d4f2] bg-white px-3.5 text-[13.5px] text-[#161616] placeholder:text-[#a99bbd] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9333ea]/35 focus-visible:border-[#a855f7]';

export const adminBtnClass =
  'inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-[#6d28d9] px-4 text-[13px] font-semibold text-white transition hover:bg-[#9333ea] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9333ea] disabled:opacity-55';

export const adminBtnGhostClass =
  'inline-flex h-12 items-center justify-center gap-2 rounded-[14px] border border-[#e2d4f2] bg-white px-4 text-[13px] font-semibold text-[#161616] transition hover:bg-[#faf7ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9333ea] disabled:opacity-55';

export const adminBtnCompactClass =
  'inline-flex h-9 min-h-9 items-center justify-center gap-1.5 rounded-[10px] bg-[#6d28d9] px-2.5 text-[12px] font-semibold text-white transition hover:bg-[#9333ea] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9333ea] disabled:opacity-55';

export const adminBtnGhostCompactClass =
  'inline-flex h-9 min-h-9 items-center justify-center gap-1.5 rounded-[10px] border border-[#e2d4f2] bg-white px-2.5 text-[12px] font-semibold text-[#161616] transition hover:bg-[#faf7ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9333ea] disabled:opacity-55';

export const FormField: React.FC<{
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, htmlFor, hint, children, className = '' }) => (
  <label className={`block ${className}`} htmlFor={htmlFor}>
    <span className="mb-1.5 block text-[12.5px] font-semibold text-[#3f3548]">{label}</span>
    {children}
    {hint ? <span className="mt-1.5 block text-[12px] text-[#6b6275]">{hint}</span> : null}
  </label>
);
