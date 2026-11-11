import type { ServiceCategoryId } from './serviceCategories';

/**
 * Marketplace listing types plus a small runtime cache.
 *
 * Listings are sourced from `/api/public/providers.php`, which returns active,
 * admin-published profiles that have not been removed. Both Verified and
 * Unverified profiles are listed; `verified` controls the badge and
 * `bookable` controls paid booking eligibility. There is intentionally no demo
 * data and no fallback fixtures: an empty directory renders a real empty state.
 */

export type MarketplaceProfileType = 'massage_provider' | 'wellness_provider';

export type MarketplaceGender = 'women' | 'men' | 'female' | 'male';

export type MarketplaceProviderKind = 'individual' | 'agency';

export type ServiceSetting =
  | 'studio'
  | 'in_home'
  | 'home_visit'
  | 'hotel_visit'
  | 'client_location'
  | 'flexible'
  | string;

export type AgencyTeamMember = {
  id: string;
  displayName: string;
  gender: MarketplaceGender;
  bio?: string;
  profileImage?: string;
  services?: string[];
  yearsExperience?: number;
  availability?: string;
  status?: 'active' | 'inactive';
};

export type MarketplaceAvailability = 'today' | 'this_week' | 'flexible';

export type ServiceOffering = {
  id?: string;
  name: string;
  durationMinutes?: number;
  priceFrom?: number;
};

export type MarketplaceProfile = {
  id: string;
  slug: string;
  displayName: string;
  profileType: MarketplaceProfileType;
  providerKind: MarketplaceProviderKind;
  gender?: MarketplaceGender | null;
  citySlug: string;
  city: string;
  district?: string | null;
  area?: string | null;
  region: string;
  country: string;
  distanceKm?: number | null;
  distancePrecision?: 'coordinates' | 'service_area' | 'city' | 'region' | 'none';
  matchedArea?: string | null;
  offersHomeVisit?: boolean;
  offersStudio?: boolean;
  serviceAreas?: Array<{ region: string; district?: string; city: string; area?: string }>;
  serviceRegions?: string[];
  shortBio: string;
  about: string;
  services: string[];
  serviceOfferings?: ServiceOffering[];
  primaryCategory: ServiceCategoryId;
  startingPrice?: number | null;
  currency: string;
  availability: MarketplaceAvailability;
  availableDays?: string | null;
  serviceSetting: ServiceSetting[];
  serviceArea?: string | null;
  primaryImage?: string;
  age?: number;
  gallery: string[];
  phone?: string;
  whatsapp?: string;
  publicContactEnabled: boolean;
  verified: boolean;
  bookable?: boolean;
  featured: boolean;
  languages?: string[];
  teamMembers?: AgencyTeamMember[];
  workingHours?: string | null;
  yearsExperience?: number | null;
  isDemo: false;
  createdAt?: string | null;
};

export const PROFILE_TYPE_LABELS: Record<MarketplaceProfileType, string> = {
  massage_provider: 'Massage',
  wellness_provider: 'Wellness',
};

export function isPublicMassageProfile(profile: MarketplaceProfile): boolean {
  return profile.profileType === 'massage_provider' || profile.profileType === 'wellness_provider';
}

/** Runtime cache filled from the public providers endpoint. */
let cache: MarketplaceProfile[] = [];

export function setMarketplaceProfiles(profiles: MarketplaceProfile[]): void {
  cache = profiles;
}

export function getMarketplaceProfiles(): MarketplaceProfile[] {
  return cache;
}

/** Kept for compatibility: never populated with demo data. */
export const MARKETPLACE_PROFILES: MarketplaceProfile[] = [];

export function findMarketplaceProfile(slug: string): MarketplaceProfile | undefined {
  const profile = cache.find((p) => p.slug === slug);
  if (!profile || !isPublicMassageProfile(profile)) return undefined;
  return profile;
}

export function profilesForCity(citySlug: string): MarketplaceProfile[] {
  const slug = citySlug.toLowerCase();
  return cache.filter(
    (p) =>
      isPublicMassageProfile(p) &&
      (p.citySlug === slug || p.city.toLowerCase().replace(/\s+/g, '-') === slug),
  );
}

export function siblingProfiles(citySlug: string, currentSlug: string, filterService?: string | null): MarketplaceProfile[] {
  let list = profilesForCity(citySlug).filter((p) => p.slug !== currentSlug);
  if (filterService) {
    list = list.filter((p) => p.primaryCategory === filterService);
  }
  return list;
}

/** Map the public providers API payload into the display model. */
export function mapApiProvider(raw: Record<string, unknown>): MarketplaceProfile {
  const services = Array.isArray(raw.services) ? (raw.services as string[]) : [];
  const offerings = Array.isArray(raw.serviceOfferings)
    ? (raw.serviceOfferings as Array<Record<string, unknown>>)
    : [];
  const primaryImage = raw.primaryImage ? String(raw.primaryImage) : undefined;
  const coverImage = raw.coverImage ? String(raw.coverImage) : undefined;
  const rawGallery = Array.isArray(raw.gallery) ? (raw.gallery as string[]) : [];
  const gallery = Array.from(
    new Set([primaryImage, coverImage, ...rawGallery].filter((src): src is string => Boolean(src))),
  );
  const settings = Array.isArray(raw.serviceSetting) ? (raw.serviceSetting as string[]) : [];
  const team = Array.isArray(raw.teamMembers)
    ? (raw.teamMembers as Array<Record<string, unknown>>).map((member) => ({
        id: String(member.id ?? ''),
        displayName: String(member.display_name ?? member.displayName ?? 'Team member'),
        gender: String(member.gender ?? 'women') as MarketplaceGender,
        bio: member.bio ? String(member.bio) : undefined,
        profileImage: member.profile_image
          ? String(member.profile_image)
          : member.profileImage
            ? String(member.profileImage)
            : undefined,
        services: Array.isArray(member.services_json)
          ? (member.services_json as string[])
          : Array.isArray(member.services)
            ? (member.services as string[])
            : [],
        status: (member.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
      }))
    : [];

  return {
    id: String(raw.id ?? ''),
    slug: String(raw.slug ?? ''),
    displayName: String(raw.displayName ?? 'Massage professional'),
    profileType: 'massage_provider',
    providerKind: raw.providerKind === 'agency' ? 'agency' : 'individual',
    gender: (raw.gender as MarketplaceGender | null) ?? null,
    citySlug: String(raw.citySlug ?? 'accra'),
    city: String(raw.city ?? ''),
    district: raw.district ? String(raw.district) : null,
    area: raw.area ? String(raw.area) : null,
    region: String(raw.region ?? ''),
    country: String(raw.country ?? 'Ghana'),
    distanceKm: raw.distanceKm != null ? Number(raw.distanceKm) : null,
    distancePrecision: (raw.distancePrecision as MarketplaceProfile['distancePrecision']) ?? 'none',
    matchedArea: raw.matchedArea ? String(raw.matchedArea) : null,
    offersHomeVisit: Boolean(raw.offersHomeVisit),
    offersStudio: raw.offersStudio !== false,
    serviceAreas: Array.isArray(raw.serviceAreas)
      ? (raw.serviceAreas as Array<Record<string, unknown>>).map((area) => ({
          region: String(area.region ?? ''),
          district: area.district ? String(area.district) : undefined,
          city: String(area.city ?? ''),
          area: area.area ? String(area.area) : undefined,
        }))
      : [],
    serviceRegions: Array.isArray(raw.serviceRegions) ? (raw.serviceRegions as string[]) : [],
    shortBio: String(raw.shortBio ?? ''),
    about: String(raw.about ?? ''),
    services,
    serviceOfferings: offerings.map((o) => ({
      id: o.id ? String(o.id) : undefined,
      name: String(o.name ?? ''),
      durationMinutes: o.durationMinutes ? Number(o.durationMinutes) : undefined,
      priceFrom: o.priceFrom ? Number(o.priceFrom) : undefined,
    })),
    primaryCategory: 'massage',
    startingPrice: raw.startingPrice != null ? Number(raw.startingPrice) : null,
    currency: String(raw.currency ?? 'GHS'),
    availability: (raw.availability as MarketplaceAvailability) ?? 'flexible',
    availableDays: raw.availableDays ? String(raw.availableDays) : null,
    serviceSetting: settings.length > 0 ? settings : ['studio'],
    serviceArea: raw.serviceArea ? String(raw.serviceArea) : null,
    primaryImage,
    gallery,
    publicContactEnabled: Boolean(raw.publicContactEnabled),
    verified: Boolean(raw.verified),
    bookable: Boolean(raw.bookable),
    featured: false,
    languages: Array.isArray(raw.languages) ? (raw.languages as string[]) : [],
    teamMembers: team,
    workingHours: raw.workingHours ? String(raw.workingHours) : null,
    yearsExperience: raw.yearsExperience != null ? Number(raw.yearsExperience) : null,
    isDemo: false,
    createdAt: raw.createdAt ? String(raw.createdAt) : null,
  };
}

export type DiscoveryTarget = {
  source: 'saved' | 'manual' | 'none';
  region: string | null;
  district: string | null;
  city: string | null;
  area: string | null;
  hasCoordinates: boolean;
  radiusKm: number | null;
};

/** Location-aware search used by Explore. Coordinates are POSTed, never put in a URL. */
export async function searchMarketplaceProviders(
  body: Record<string, unknown>,
): Promise<{ providers: MarketplaceProfile[]; target: DiscoveryTarget; distanceNote?: string }> {
  const res = await fetch('/api/public/discovery.php', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.success) {
    throw new Error(payload?.error?.message || 'Unable to load providers.');
  }
  const providers = Array.isArray(payload.data?.providers) ? payload.data.providers : [];
  const mapped = providers.map((p: Record<string, unknown>) => mapApiProvider(p));
  setMarketplaceProfiles(mapped);
  return {
    providers: mapped,
    target: payload.data?.target ?? {
      source: 'none',
      region: null,
      district: null,
      city: null,
      area: null,
      hasCoordinates: false,
      radiusKm: null,
    },
    distanceNote: payload.data?.distanceNote,
  };
}

/** Fetch public listings and hydrate the cache. */
export async function fetchMarketplaceProfiles(): Promise<MarketplaceProfile[]> {
  const res = await fetch('/api/public/providers.php', { credentials: 'omit' });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.success) {
    throw new Error(payload?.error?.message || 'Unable to load providers.');
  }
  const providers = Array.isArray(payload.data?.providers) ? payload.data.providers : [];
  const mapped = providers.map((p: Record<string, unknown>) => mapApiProvider(p));
  setMarketplaceProfiles(mapped);
  return mapped;
}
