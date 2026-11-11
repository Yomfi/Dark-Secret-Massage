import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { Container } from '../components/ui/Layout';
import { useAuth } from '../auth/AuthContext';
import { fetchPublicContent, type PublicPage } from '../lib/cmsCatalogue';
import { getLegalDocument, type LegalDocument } from '../lib/legalContent';

type Props = {
  slug: string;
};

const proseClass =
  'text-[15px] leading-7 text-zinc-300 [&_h2]:mt-10 [&_h2]:border-t [&_h2]:border-white/[0.08] [&_h2]:pt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-[-0.01em] [&_h2]:text-white [&_h2:first-child]:mt-0 [&_h2:first-child]:border-t-0 [&_h2:first-child]:pt-0 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-white [&_p]:mt-4 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_li]:pl-1 [&_a]:text-brand-purple-light [&_a]:underline [&_a]:decoration-brand-purple/40 [&_a]:underline-offset-4 [&_strong]:text-white';

function formatDate(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export const LegalPage: React.FC<Props> = ({ slug }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const fallback = getLegalDocument(slug);
  const [page, setPage] = useState<PublicPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPublicContent()
      .then((content) => {
        if (!cancelled) setPage(content.pages.find((item) => item.slug === slug) ?? null);
      })
      .catch(() => {
        if (!cancelled) setPage(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [slug]);

  const legalDoc = fallback;
  const title = page?.title || legalDoc?.title || 'Legal information';
  const intro = legalDoc?.intro || 'Information about how Massager Studio operates.';
  const isPublished = Boolean(page?.bodyHtml?.trim());
  const lastUpdated = formatDate(page?.publishedAt, legalDoc?.lastUpdated || '11 November 2026');

  useEffect(() => {
    document.title = page?.seoTitle || `${title} — Massager Studio`;
  }, [page?.seoTitle, title]);

  const sections = useMemo(() => legalDoc?.sections ?? [], [legalDoc]);

  if (!legalDoc) {
    return (
      <div className="min-h-screen bg-brand-surface text-zinc-200">
        <Navbar
          onOpenBooking={() => navigate('/book-massage')}
          onOpenDashboard={() => navigate(isAuthenticated ? '/dashboard' : '/login?redirect=/dashboard')}
          isAuthenticated={isAuthenticated}
        />
        <main className="pb-20 pt-28">
          <Container>
            <h1 className="text-3xl font-semibold text-white">Page not found</h1>
            <Link to="/" className="mt-6 inline-flex text-brand-purple-light underline underline-offset-4">
              Back to Massager Studio
            </Link>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-surface text-zinc-200">
      <Navbar
        onOpenBooking={() => navigate('/book-massage')}
        onOpenDashboard={() => navigate(isAuthenticated ? '/dashboard' : '/login?redirect=/dashboard')}
        isAuthenticated={isAuthenticated}
      />

      <main className="pb-16 pt-24 sm:pb-20 sm:pt-28">
        <Container>
          <header className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-purple-light">
              Legal & trust
            </p>
            <h1 className="mt-3 text-[2rem] font-semibold leading-tight tracking-[-0.03em] text-white sm:text-[2.6rem]">
              {title}
            </h1>
            <p className="mt-4 text-[15px] leading-7 text-zinc-400 sm:text-base">{intro}</p>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-zinc-500">
              <span>Last updated {lastUpdated}</span>
              <span aria-hidden>·</span>
              <span>Version {legalDoc.version}</span>
              <span aria-hidden>·</span>
              <span>{isPublished ? 'Published policy' : 'Draft for review'}</span>
            </div>
          </header>

          {!isPublished ? (
            <div className="mt-7 max-w-3xl rounded-2xl border border-brand-purple/25 bg-brand-purple/[0.08] px-4 py-3.5 text-[13px] leading-relaxed text-zinc-300 sm:px-5">
              <strong className="font-semibold text-white">Draft for review.</strong> The registered legal
              entity, business address, official legal/privacy contact, retention periods and confirmed
              processor list still need to be supplied and reviewed. This page is not final legal advice.
            </div>
          ) : null}

          <div className="mt-10 grid gap-10 lg:mt-12 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-14">
            {(sections.length > 0 && !isPublished) ? (
              <aside className="hidden lg:block">
                <nav aria-label="On this page" className="sticky top-28 border-l border-white/[0.09] pl-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    On this page
                  </p>
                  <ul className="mt-3 space-y-2.5">
                    {sections.map((section) => (
                      <li key={section.id}>
                        <a
                          href={`#${section.id}`}
                          className="block text-[12.5px] leading-snug text-zinc-500 transition-colors hover:text-brand-purple-light"
                        >
                          {section.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              </aside>
            ) : (
              <div className="hidden lg:block" aria-hidden />
            )}

            <article className="min-w-0 max-w-3xl">
              {loading && !isPublished ? (
                <div className="space-y-4" aria-hidden>
                  <div className="h-4 w-11/12 animate-pulse rounded bg-white/[0.06]" />
                  <div className="h-4 w-full animate-pulse rounded bg-white/[0.06]" />
                  <div className="h-4 w-4/5 animate-pulse rounded bg-white/[0.06]" />
                </div>
              ) : isPublished ? (
                <div
                  className={`prose prose-invert max-w-none ${proseClass}`}
                  // Admin-authored HTML that has passed publication review.
                  dangerouslySetInnerHTML={{ __html: page?.bodyHtml || '' }}
                />
              ) : (
                <div className={proseClass}>
                  {sections.map((section, index) => (
                    <section key={section.id} aria-labelledby={section.id}>
                      <h2 id={section.id}>
                        {String(index + 1).padStart(2, '0')}. {section.title}
                      </h2>
                      {section.paragraphs?.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                      {section.bullets?.length ? (
                        <ul>
                          {section.bullets.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : null}
                    </section>
                  ))}
                </div>
              )}

              <div className="mt-12 border-t border-white/[0.08] pt-5 text-[12.5px] leading-relaxed text-zinc-500">
                <p>
                  Questions about this policy can be sent to{' '}
                  <a
                    href="mailto:contact@massagerstudio.com"
                    className="text-brand-purple-light underline decoration-brand-purple/40 underline-offset-4"
                  >
                    contact@massagerstudio.com
                  </a>
                  .
                </p>
                <p className="mt-2">
                  See also the{' '}
                  <Link to="/terms-and-conditions" className="text-zinc-300 hover:text-white">
                    Terms &amp; Conditions
                  </Link>
                  ,{' '}
                  <Link to="/privacy-policy" className="text-zinc-300 hover:text-white">
                    Privacy Policy
                  </Link>{' '}
                  and{' '}
                  <Link to="/data-policy" className="text-zinc-300 hover:text-white">
                    Data Policy
                  </Link>
                  .
                </p>
              </div>
            </article>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
};
