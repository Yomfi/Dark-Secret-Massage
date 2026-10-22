import type { MarketplaceAvailability, MarketplaceProfile } from '../data/marketplaceProfiles';
import { profileOffersService } from '../data/serviceCategories';

export type MarketplaceSort = 'recommended' | 'recent' | 'price_asc' | 'price_desc';

export type MarketplaceGenderFilter = 'all' | 'women' | 'men';
export type MarketplaceProviderTypeFilter = 'all' | 'individuals' | 'agencies';

export type MarketplaceFilters = {
  /** Specific massage service label (e.g. Swedish Massage) */
  service?: string | null;
  gender?: MarketplaceGenderFilter | null;
  providerType?: MarketplaceProviderTypeFilter | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  availability?: MarketplaceAvailability | 'any' | null;
  sort?: MarketplaceSort;
};

export function formatPrice(amount: number | undefined, currency: string): string | null {
  if (amount == null) return null;
  return `${currency} ${amount.toLocaleString()}`;
}

export function availabilityLabel(value: MarketplaceAvailability): string {
  switch (value) {
    case 'today':
      return 'Available today';
    case 'this_week':
      return 'This week';
    default:
      return 'Flexible';
  }
}

export function genderLabel(gender: MarketplaceProfile['gender'] | undefined | null): string {
  if (gender === 'men' || gender === 'male') return 'Men';
  if (gender === 'women' || gender === 'female') return 'Women';
  return '';
}

export function providerKindLabel(kind: MarketplaceProfile['providerKind'] | undefined): string {
  return kind === 'agency' ? 'Massage Agency' : 'Individual Massage Professional';
}

export function serviceSettingLabel(settings: MarketplaceProfile['serviceSetting']): string {
  const map: Record<string, string> = {
    studio: 'Studio',
    in_home: 'In-home',
    home_visit: 'Home Visit',
    hotel_visit: 'Hotel Visit',
    client_location: 'Client Location',
    flexible: 'Flexible',
  };
  return settings.map((s) => map[s] || s).join(' · ');
}

export function whatsappEnquiryUrl(phone: string, _displayName?: string): string {
  const digits = phone.replace(/\D/g, '');
  const text = encodeURIComponent(
    'Hello, I found your profile on Dark Secret and would like to enquire.',
  );
  return `https://wa.me/${digits}?text=${text}`;
}

export function filterAndSortProfiles(
  profiles: MarketplaceProfile[],
  filters: MarketplaceFilters,
): MarketplaceProfile[] {
  let result = [...profiles];

  if (filters.providerType && filters.providerType !== 'all') {
    const wantAgency = filters.providerType === 'agencies';
    result = result.filter((p) => (p.providerKind === 'agency') === wantAgency);
  }

  if (filters.gender && filters.gender !== 'all') {
    const wantFemale = filters.gender === 'women';
    result = result.filter((p) => {
      if (p.providerKind === 'agency') {
        const team = p.teamMembers || [];
        if (team.length === 0) return false;
        return team.some((m) =>
          wantFemale
            ? m.gender === 'women' || m.gender === 'female'
            : m.gender === 'men' || m.gender === 'male',
        );
      }
      const g = p.gender;
      return wantFemale
        ? g === 'women' || g === 'female'
        : g === 'men' || g === 'male';
    });
  }

  if (filters.service) {
    const selected = filters.service;
    result = result.filter((p) => profileOffersService(p.services, p.serviceOfferings, selected));
  }

  if (filters.minPrice != null && !Number.isNaN(filters.minPrice)) {
    result = result.filter((p) => p.startingPrice != null && p.startingPrice >= filters.minPrice!);
  }
  if (filters.maxPrice != null && !Number.isNaN(filters.maxPrice)) {
    result = result.filter((p) => p.startingPrice != null && p.startingPrice <= filters.maxPrice!);
  }

  if (filters.availability && filters.availability !== 'any') {
    result = result.filter((p) => p.availability === filters.availability);
  }

  const sort = filters.sort || 'recommended';
  result.sort((a, b) => {
    switch (sort) {
      case 'recent':
        return b.createdAt.localeCompare(a.createdAt);
      case 'price_asc':
        return (a.startingPrice ?? Number.POSITIVE_INFINITY) - (b.startingPrice ?? Number.POSITIVE_INFINITY);
      case 'price_desc':
        return (b.startingPrice ?? -1) - (a.startingPrice ?? -1);
      case 'recommended':
      default:
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        return a.displayName.localeCompare(b.displayName);
    }
  });

  return result;
}

export function parseExploreSearchParams(params: URLSearchParams): MarketplaceFilters {
  const min = params.get('min');
  const max = params.get('max');
  const genderRaw = params.get('gender');
  const gender: MarketplaceGenderFilter | null =
    genderRaw === 'women' || genderRaw === 'men' || genderRaw === 'all' ? genderRaw : null;

  const providerTypeRaw = params.get('type');
  const providerType: MarketplaceProviderTypeFilter | null =
    providerTypeRaw === 'individuals' ||
    providerTypeRaw === 'agencies' ||
    providerTypeRaw === 'all'
      ? providerTypeRaw
      : null;

  return {
    service: params.get('service'),
    gender,
    providerType,
    minPrice: min ? Number(min) : null,
    maxPrice: max ? Number(max) : null,
    availability: (params.get('availability') as MarketplaceAvailability | 'any' | null) || null,
    sort: (params.get('sort') as MarketplaceSort | null) || 'recommended',
  };
}

export function buildExploreSearchParams(filters: MarketplaceFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.service) p.set('service', String(filters.service));
  if (filters.gender && filters.gender !== 'all') p.set('gender', filters.gender);
  if (filters.providerType && filters.providerType !== 'all') p.set('type', filters.providerType);
  if (filters.minPrice != null && !Number.isNaN(filters.minPrice)) p.set('min', String(filters.minPrice));
  if (filters.maxPrice != null && !Number.isNaN(filters.maxPrice)) p.set('max', String(filters.maxPrice));
  if (filters.availability && filters.availability !== 'any') p.set('availability', filters.availability);
  if (filters.sort && filters.sort !== 'recommended') p.set('sort', filters.sort);
  return p;
}
