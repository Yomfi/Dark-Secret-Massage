import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../BrandLogo';
import { Container } from '../ui/Layout';

interface AuthLayoutProps {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Register needs a slightly wider card than sign-in. */
  width?: 'md' | 'lg';
}

/** Shared shell for sign-in, registration, reset and verification screens. */
export const AuthLayout: React.FC<AuthLayoutProps> = ({
  title,
  description,
  children,
  footer,
  width = 'md',
}) => (
  <div className="flex min-h-screen flex-col bg-brand-surface text-zinc-200">
    <header className="border-b border-white/[0.07]">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link to="/" className="inline-flex items-center" aria-label="Massager Studio home">
          <BrandLogo variant="plate" withWordmark markHeight={26} />
        </Link>
        <Link
          to="/"
          className="inline-flex h-11 items-center rounded-lg px-3 text-[13.5px] font-medium text-zinc-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/80"
        >
          Back to home
        </Link>
      </Container>
    </header>

    <main className="flex flex-1 items-center justify-center px-5 py-10 sm:py-14">
      <div className={`w-full ${width === 'lg' ? 'max-w-lg' : 'max-w-md'}`}>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">
          <div className="mb-5">
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-white">{title}</h1>
            {description ? (
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-zinc-400">{description}</p>
            ) : null}
          </div>
          {children}
        </div>
        {footer ? <div className="mt-4 text-center text-[13.5px] text-zinc-400">{footer}</div> : null}
      </div>
    </main>
  </div>
);
