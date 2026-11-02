import { useEffect, useState } from 'react';
import { apiRequest } from './api';
import {
  setCertifiedTherapists,
  setMassageServices,
  type MassageService,
} from '../data/mockData';
import type { MassageTherapist } from './bookingAndMatchmaking';

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

export type PublicContent = {
  settings: Record<string, string>;
  pages: Array<Record<string, unknown>>;
  faqs: Array<Record<string, unknown>>;
  services: CmsService[];
};

function firstSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/^[^.!?]+[.!?]/);
  return (match ? match[0] : trimmed).slice(0, 140);
}

/** CMS row → presentation model used by the existing public components. */
export function mapCmsService(row: CmsService): MassageService {
  return {
    id: row.id,
    name: row.name,
    tagline: firstSentence(row.category ? `${row.category}. ${row.description}` : row.description),
    description: row.description,
    // A CMS service has one published duration; the wizard no longer invents
    // 60/90/120 minute variants.
    durationMinutes: [row.durationMinutes],
    basePriceGHS: row.price,
    benefits: [],
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

export async function fetchPublicContent(): Promise<PublicContent> {
  return apiRequest<PublicContent>('/public/content.php');
}

export async function fetchPublicProviders(): Promise<CmsProvider[]> {
  const data = await apiRequest<{ providers: CmsProvider[] }>('/public/providers.php');
  return Array.isArray(data.providers) ? data.providers : [];
}

/**
 * Loads the published catalogue once per page and keeps the shared registries
 * in sync so booking components render real records (or a clear empty state).
 */
export function usePublicCatalogue() {
  const [services, setServices] = useState<CmsService[]>([]);
  const [providers, setProviders] = useState<CmsProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const content = await fetchPublicContent();
        if (cancelled) return;
        const list = Array.isArray(content.services) ? content.services : [];
        setServices(list);
        setMassageServices(list.map(mapCmsService));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load services.');
      } finally {
        if (!cancelled) setLoading(false);
      }

      try {
        const list = await fetchPublicProviders();
        if (cancelled) return;
        setProviders(list);
        setCertifiedTherapists(list.map(mapCmsProvider));
      } catch {
        if (!cancelled) {
          setProviders([]);
          setCertifiedTherapists([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { services, providers, loading, error };
}
