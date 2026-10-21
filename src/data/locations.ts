/** Extensible location taxonomy: Country → Region → City/Area */

export type MarketplaceCountry = {
  code: string;
  name: string;
  slug: string;
};

export type MarketplaceRegion = {
  id: string;
  countryCode: string;
  name: string;
  slug: string;
};

export type MarketplaceCity = {
  id: string;
  slug: string;
  name: string;
  regionId: string;
  countryCode: string;
  aliases?: string[];
};

export const MARKETPLACE_COUNTRIES: MarketplaceCountry[] = [
  { code: 'GH', name: 'Ghana', slug: 'ghana' },
];

export const MARKETPLACE_REGIONS: MarketplaceRegion[] = [
  { id: 'gh-ga', countryCode: 'GH', name: 'Greater Accra', slug: 'greater-accra' },
  { id: 'gh-as', countryCode: 'GH', name: 'Ashanti', slug: 'ashanti' },
  { id: 'gh-wr', countryCode: 'GH', name: 'Western', slug: 'western' },
  { id: 'gh-cr', countryCode: 'GH', name: 'Central', slug: 'central' },
  { id: 'gh-er', countryCode: 'GH', name: 'Eastern', slug: 'eastern' },
  { id: 'gh-nr', countryCode: 'GH', name: 'Northern', slug: 'northern' },
  { id: 'gh-vr', countryCode: 'GH', name: 'Volta', slug: 'volta' },
  { id: 'gh-br', countryCode: 'GH', name: 'Bono', slug: 'bono' },
];

export const MARKETPLACE_CITIES: MarketplaceCity[] = [
  { id: 'accra', slug: 'accra', name: 'Accra', regionId: 'gh-ga', countryCode: 'GH' },
  { id: 'tema', slug: 'tema', name: 'Tema', regionId: 'gh-ga', countryCode: 'GH' },
  { id: 'east-legon', slug: 'east-legon', name: 'East Legon', regionId: 'gh-ga', countryCode: 'GH', aliases: ['East Legon Accra'] },
  { id: 'osu', slug: 'osu', name: 'Osu', regionId: 'gh-ga', countryCode: 'GH' },
  { id: 'airport-residential', slug: 'airport-residential', name: 'Airport Residential', regionId: 'gh-ga', countryCode: 'GH' },
  { id: 'spintex', slug: 'spintex', name: 'Spintex', regionId: 'gh-ga', countryCode: 'GH' },
  { id: 'madina', slug: 'madina', name: 'Madina', regionId: 'gh-ga', countryCode: 'GH' },
  { id: 'adenta', slug: 'adenta', name: 'Adenta', regionId: 'gh-ga', countryCode: 'GH' },
  { id: 'kasoa', slug: 'kasoa', name: 'Kasoa', regionId: 'gh-cr', countryCode: 'GH' },
  { id: 'kumasi', slug: 'kumasi', name: 'Kumasi', regionId: 'gh-as', countryCode: 'GH' },
  { id: 'takoradi', slug: 'takoradi', name: 'Takoradi', regionId: 'gh-wr', countryCode: 'GH' },
  { id: 'cape-coast', slug: 'cape-coast', name: 'Cape Coast', regionId: 'gh-cr', countryCode: 'GH' },
  { id: 'koforidua', slug: 'koforidua', name: 'Koforidua', regionId: 'gh-er', countryCode: 'GH' },
  { id: 'tamale', slug: 'tamale', name: 'Tamale', regionId: 'gh-nr', countryCode: 'GH' },
  { id: 'ho', slug: 'ho', name: 'Ho', regionId: 'gh-vr', countryCode: 'GH' },
  { id: 'sunyani', slug: 'sunyani', name: 'Sunyani', regionId: 'gh-br', countryCode: 'GH' },
];

export function findCityBySlug(slug: string): MarketplaceCity | undefined {
  const key = slug.trim().toLowerCase();
  return MARKETPLACE_CITIES.find((c) => c.slug === key);
}

export function searchCities(query: string, limit = 8): MarketplaceCity[] {
  const q = query.trim().toLowerCase();
  if (!q) return MARKETPLACE_CITIES.slice(0, limit);
  return MARKETPLACE_CITIES.filter((c) => {
    const hay = [c.name, c.slug, ...(c.aliases || [])].join(' ').toLowerCase();
    return hay.includes(q);
  }).slice(0, limit);
}

export function cityExplorePath(slug: string): string {
  return `/explore/${slug}`;
}
