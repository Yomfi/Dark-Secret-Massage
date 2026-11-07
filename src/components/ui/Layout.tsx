import React from 'react';

/** One shared rhythm for every page: 1280px max width, 20/32/40px gutters. */
export const Container: React.FC<{
  className?: string;
  children: React.ReactNode;
  as?: 'div' | 'section' | 'main' | 'header' | 'footer';
}> = ({ className = '', children, as: Tag = 'div' }) => (
  <Tag className={`mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10 ${className}`.trim()}>{children}</Tag>
);

/** Vertical section rhythm, with an optional hairline divider. */
export const Section: React.FC<{
  id?: string;
  className?: string;
  divider?: boolean;
  children: React.ReactNode;
}> = ({ id, className = '', divider = false, children }) => (
  <section
    id={id}
    className={`${divider ? 'border-t border-white/[0.07] ' : ''}py-14 sm:py-16 lg:py-20 scroll-mt-20 ${className}`.trim()}
  >
    <Container>{children}</Container>
  </section>
);

interface SectionHeadingProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  /** Centre the block (used by CTA sections). */
  centered?: boolean;
  size?: 'md' | 'lg';
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  eyebrow,
  title,
  description,
  actions,
  className = '',
  centered = false,
  size = 'md',
}) => (
  <div
    className={[
      centered ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl',
      'mb-8 sm:mb-10',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {eyebrow ? (
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-purple-light">
        {eyebrow}
      </p>
    ) : null}
    <h2
      className={[
        size === 'lg' ? 'text-3xl sm:text-4xl lg:text-[2.75rem]' : 'text-2xl sm:text-3xl',
        'font-semibold leading-[1.15] tracking-[-0.02em] text-white text-balance',
      ].join(' ')}
    >
      {title}
    </h2>
    {description ? (
      <p className="mt-3 text-[15px] leading-relaxed text-zinc-400 sm:text-base">{description}</p>
    ) : null}
    {actions ? <div className={`mt-6 flex flex-wrap gap-3 ${centered ? 'justify-center' : ''}`}>{actions}</div> : null}
  </div>
);

/** Standard surface used for panels, cards and form shells. */
export function surfaceClass(className = ''): string {
  return ['rounded-2xl border border-white/10 bg-white/[0.03]', className].filter(Boolean).join(' ');
}

/** Page-level heading used above panels and dashboards. */
export const PageHeading: React.FC<{
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}> = ({ eyebrow, title, description, actions, className = '' }) => (
  <div
    className={[
      'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    <div className="max-w-2xl">
      {eyebrow ? (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-purple-light">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-white sm:text-3xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-2 text-[15px] leading-relaxed text-zinc-400">{description}</p>
      ) : null}
    </div>
    {actions ? <div className="flex flex-wrap gap-2.5">{actions}</div> : null}
  </div>
);
