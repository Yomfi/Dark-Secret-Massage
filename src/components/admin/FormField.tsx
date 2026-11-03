import React from 'react';

export const adminInputClass =
  'h-12 w-full rounded-[14px] border border-[#e0d7c8] bg-white px-3.5 text-[13.5px] text-[#161616] placeholder:text-[#9a9184] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B08B4B]/35 focus-visible:border-[#C9A56A]';

export const adminBtnClass =
  'inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-[#161616] px-4 text-[13px] font-semibold text-[#F7F4EF] transition hover:bg-[#2a2a2a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B08B4B] disabled:opacity-55';

export const adminBtnGhostClass =
  'inline-flex h-12 items-center justify-center gap-2 rounded-[14px] border border-[#e0d7c8] bg-white px-4 text-[13px] font-semibold text-[#161616] transition hover:bg-[#faf7f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B08B4B] disabled:opacity-55';

export const FormField: React.FC<{
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, htmlFor, hint, children, className = '' }) => (
  <label className={`block ${className}`} htmlFor={htmlFor}>
    <span className="mb-1.5 block text-[12.5px] font-semibold text-[#3f3a33]">{label}</span>
    {children}
    {hint ? <span className="mt-1.5 block text-[12px] text-[#6f675c]">{hint}</span> : null}
  </label>
);
