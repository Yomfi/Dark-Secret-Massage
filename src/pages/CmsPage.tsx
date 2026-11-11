import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Container, PageHeading, buttonClass } from '../components/ui';
import { fetchPublicContent } from '../lib/cmsCatalogue';
import { apiRequest } from '../lib/api';

type CmsPageDto = {
  slug: string;
  title: string;
  bodyHtml: string;
  seoTitle: string | null;
  seoDescription: string | null;
};

/**
 * Public renderer for pages published in the admin CMS. Drafts are never
 * returned by /api/public/content.php, so only published content can appear.
 */
export const CmsPage: React.FC = () => {
  const { slug = '' } = useParams();
  const [searchParams] = useSearchParams();
  const previewId = searchParams.get('preview');
  const [page, setPage] = useState<CmsPageDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const request = previewId
      ? apiRequest<{ preview: CmsPageDto }>(`/admin/content.php?preview=${encodeURIComponent(previewId)}`)
          .then((data) => data.preview)
      : fetchPublicContent().then((content) => {
          const pages = (content.pages as unknown as CmsPageDto[]) || [];
          return pages.find((item) => item.slug === slug) ?? null;
        });
    request
      .then((result) => {
        if (cancelled) return;
        setPage(result);
        setPreview(Boolean(previewId));
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError('This page could not be loaded.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [previewId, slug]);

  useEffect(() => {
    if (page) document.title = page.seoTitle || `${page.title} — Massager Studio`;
  }, [page]);

  return (
    <div className="min-h-screen bg-brand-surface text-zinc-200">
      <Container as="main" className="py-16 sm:py-24">
        {loading && <p className="text-zinc-400">Loading…</p>}

        {!loading && (error || !page) && (
          <>
            <PageHeading
              eyebrow="Massager Studio"
              title="This page is not published yet"
              description="Content appears here once it has been published from the studio CMS."
            />
            <Link to="/" className={buttonClass({ variant: 'secondary' }) + ' mt-8'}>
              Back to home
            </Link>
          </>
        )}

        {!loading && page && (
          <article className="mx-auto max-w-3xl">
            {preview ? (
              <p className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-[13px] text-amber-100">
                Staff preview — this content is not public until published.
              </p>
            ) : null}
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{page.title}</h1>
            <div
              className="prose prose-invert mt-8 max-w-none text-base leading-relaxed text-zinc-300"
              // Admin-authored HTML that has passed publication review.
              dangerouslySetInnerHTML={{ __html: page.bodyHtml }}
            />
          </article>
        )}
      </Container>
    </div>
  );
};
