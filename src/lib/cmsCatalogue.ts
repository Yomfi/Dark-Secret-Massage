import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from './api';
import type { MassageService, MassageTherapist } from './catalogue';

export type CmsService = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  currency: string;
  image: string | null;
  category: string | null;
  active: boolean;
  sortOrder: number;
};

export type CmsProvider = {
  id: string;
  slug: string;
  displayName: string;
  providerKind: 'individual' | 'agency';
  city: string;
  region: string;
  shortBio: string;
  serviceOfferings: { id: string; name: string; durationMinutes: number; priceFrom: number }[];
  startingPrice: number | null;
  currency: string;
  primaryImage: string | null;
  serviceSetting: string[];
  yearsExperience: number | null;
};

export type PublicFaq = { id: string; question: string; answer: string };

export type PublicPage = {
  slug: string;
  title: string;
  bodyHtml: string;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImage: string | null;
};

export type PublicContent = {
  settings: Record<string, string>;
  pages: PublicPage[];
  faqs: PublicFaq[];
  services: CmsService[];
};

function firstSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/^[^.!?]+[.!?]/);
  return (match ? match[0] : trimmed).slice(0, 140);
}

/** CMS row → presentation model used by the public components. */
export function mapCmsService(row: CmsService): MassageService {
  return {
    id: row.id,
    name: row.name,
    tagline: firstSentence(row.category ? `${row.category}. ${row.description}` : row.description),
    description: row.description,
    // A CMS service has one published duration; the wizard never invents
    // 60/90/120 minute variants.
    durationMinutes: [row.durationMinutes],
    basePriceGHS: row.price,
    benefits: [],
    image: row.image ?? null,
    category: row.category ?? null,
  };
}

export function mapCmsProvider(row: CmsProvider): MassageTherapist {
  const location = [row.city, row.region].filter(Boolean).join(', ');
  const settings = Array.isArray(row.serviceSetting) ? row.serviceSetting : [];
  return {
    id: row.id,
    name: row.displayName,
    title: row.providerKind === 'agency' ? 'Massage agency' : 'Massage provider',
    licenseNumber: '',
    experienceYears: row.yearsExperience ?? 0,
    location,
    specialties: row.serviceOfferings.map((offering) => offering.name).slice(0, 3),
    // No invented ratings: real reviews are not published yet.
    rating: 0,
    reviewCount: 0,
    hourlyRateGHS: row.startingPrice ?? 0,
    bio: row.shortBio,
    verified: true,
    studioAvailable: settings.length === 0 || settings.includes('studio'),
    homeVisitAvailable: settings.includes('home'),
  };
}

/** Short-lived cache so navigation and refresh share one request without
 *  depending on another page having loaded first. */
let contentCache: { at: number; promise: Promise<PublicContent> } | null = null;
const CACHE_MS = 10_000;

export async function fetchPublicContent(force = false): Promise<PublicContent> {
  const now = Date.now();
  if (!force && contentCache && now - contentCache.at < CACHE_MS) {
    return contentCache.promise;
  }
  const promise = apiRequest<PublicContent>('/public/content.php');
  contentCache = { at: now, promise };
  try {
    return await promise;
  } catch (error) {
    contentCache = null;
    throw error;
  }
}

export async function fetchPublicProviders(force = false): Promise<CmsProvider[]> {
  const data = await apiRequest<{ providers: CmsProvider[] }>(
    `/public/providers.php${force ? '?refresh=1' : ''}`
  );
  return Array.isArray(data.providers) ? data.providers : [];
}

function normaliseContent(raw: PublicContent): PublicContent {
  return {
    settings: raw?.settings && typeof raw.settings === 'object' ? raw.settings : {},
    pages: Array.isArray(raw?.pages) ? raw.pages : [],
    faqs: Array.isArray(raw?.faqs) ? raw.faqs : [],
    services: Array.isArray(raw?.services) ? raw.services : [],
  };
}

/** Published catalogue with explicit loading/error/empty states. */
export function usePublicCatalogue() {
  const [content, setContent] = useState<PublicContent | null>(null);
  const [providers, setProviders] = useState<CmsProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      const [contentResult, providerResult] = await Promise.allSettled([
        fetchPublicContent(attempt > 0),
        fetchPublicProviders(attempt > 0),
      ]);

      if (cancelled) return;

      if (contentResult.status === 'fulfilled') {
        setContent(normaliseContent(contentResult.value));
        setError(null);
      } else {
        setContent(null);
        setError(
          contentResult.reason instanceof Error && contentResult.reason.message
            ? contentResult.reason.message
            : 'We could not load the treatment menu.'
        );
      }

      if (providerResult.status === 'fulfilled') {
        setProviders(providerResult.value);
      } else {
        setProviders([]);
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  const services = content?.services ?? [];

  return {
    content,
    settings: content?.settings ?? {},
    faqs: content?.faqs ?? [],
    pages: content?.pages ?? [],
    services,
    massageServices: services.map(mapCmsService),
    providers,
    therapists: providers.map(mapCmsProvider),
    loading,
    error,
    reload,
  };
}

/** Site-wide CMS settings/pages/FAQs (contact, social, SEO, published pages). */
export function usePublicSite() {
  const [content, setContent] = useState<PublicContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPublicContent()
      .then((result) => {
        if (cancelled) return;
        setContent(normaliseContent(result));
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError('Site settings could not be loaded.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    settings: content?.settings ?? {},
    pages: content?.pages ?? [],
    faqs: content?.faqs ?? [],
    loading,
    error,
  };
}
