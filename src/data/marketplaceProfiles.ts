import type { ServiceCategoryId } from './serviceCategories';

/** DEMO marketplace profiles — fictional until real providers submit & approve. */

export type MarketplaceProfileType =
  | 'massage_provider'
  | 'wellness_provider'
  | 'matchmaking_profile'
  | 'social_profile'
  | 'dating_profile';

export type MarketplaceGender = 'women' | 'men';

export type ServiceSetting = 'studio' | 'in_home' | 'flexible';

export type MarketplaceAvailability = 'today' | 'this_week' | 'flexible';

export type ServiceOffering = {
  name: string;
  durationMinutes?: number;
  priceFrom?: number;
};

export type MarketplaceProfile = {
  id: string;
  slug: string;
  displayName: string;
  profileType: MarketplaceProfileType;
  gender: MarketplaceGender;
  citySlug: string;
  city: string;
  region: string;
  country: string;
  nationality?: string;
  shortBio: string;
  about: string;
  /** Tag chips shown on cards and profile headers */
  services: string[];
  /** Detailed offerings for massage/wellness providers */
  serviceOfferings?: ServiceOffering[];
  primaryCategory: ServiceCategoryId;
  startingPrice?: number;
  currency: string;
  availability: MarketplaceAvailability;
  availableDays?: string;
  serviceSetting: ServiceSetting[];
  serviceArea?: string;
  primaryImage: string;
  gallery: string[];
  phone?: string;
  whatsapp?: string;
  publicContactEnabled: boolean;
  verified: boolean;
  featured: boolean;
  languages?: string[];
  age?: number;
  height?: string;
  smoking?: string;
  occupation?: string;
  interests?: string[];
  /** @deprecated Archived matchmaking fields — not shown publicly */
  lookingFor?: string;
  relationshipIntention?: string;
  preferredConnection?: string;
  socialPreference?: string;
  isDemo: true;
  createdAt: string;
};

export const PROFILE_TYPE_LABELS: Record<MarketplaceProfileType, string> = {
  massage_provider: 'Massage',
  wellness_provider: 'Wellness',
  matchmaking_profile: 'Massage',
  social_profile: 'Massage',
  dating_profile: 'Massage',
};

const PUBLIC_PROFILE_TYPES: MarketplaceProfileType[] = ['massage_provider', 'wellness_provider'];

export function isPublicMassageProfile(profile: MarketplaceProfile): boolean {
  return PUBLIC_PROFILE_TYPES.includes(profile.profileType);
}

export const MARKETPLACE_PROFILES: MarketplaceProfile[] = [
  {
    id: 'demo-ama-k',
    slug: 'ama-k',
    displayName: 'Ama K.',
    profileType: 'massage_provider',
    gender: 'women',
    citySlug: 'accra',
    city: 'Accra',
    region: 'Greater Accra',
    country: 'Ghana',
    nationality: 'Ghanaian',
    age: 28,
    shortBio:
      'Warm, friendly and professional wellness provider offering private relaxation sessions across Accra.',
    about:
      'I create calm, private sessions for people who want to unwind after Accra’s pace. Expect a welcoming atmosphere, clear professional boundaries and tailored pressure — from gentle Swedish relaxation to focused deep tissue. Studio appointments and discreet home visits available across central Accra.',
    services: ['Swedish Massage', 'Deep Tissue Massage', 'Relaxation Massage', 'Home Massage'],
    serviceOfferings: [
      { name: 'Swedish Massage', durationMinutes: 60, priceFrom: 350 },
      { name: 'Deep Tissue Massage', durationMinutes: 75, priceFrom: 420 },
      { name: 'Relaxation Massage', durationMinutes: 60, priceFrom: 350 },
      { name: 'Home Massage', durationMinutes: 90, priceFrom: 480 },
    ],
    primaryCategory: 'massage',
    startingPrice: 350,
    currency: 'GHS',
    availability: 'today',
    availableDays: 'Mon–Sat · Flexible evenings',
    serviceSetting: ['studio', 'in_home'],
    serviceArea: 'Accra · Airport Residential · Cantonments · Osu',
    primaryImage: '/profiles/demo-ama-k.jpg',
    gallery: [
      '/profiles/demo-ama-k.jpg',
      '/profiles/demo-lifestyle-lounge.jpg',
      '/profiles/demo-gallery-rooftop.jpg',
      '/profiles/demo-lifestyle-city.jpg',
    ],
    phone: '+233200000101',
    whatsapp: '+233200000101',
    publicContactEnabled: true,
    verified: true,
    featured: true,
    languages: ['English', 'Twi'],
    occupation: 'Massage therapist',
    interests: ['Wellness', 'Travel', 'Afrobeats'],
    isDemo: true,
    createdAt: '2026-09-12',
  },
  {
    id: 'demo-akosua-m',
    slug: 'akosua-m',
    displayName: 'Akosua M.',
    profileType: 'wellness_provider',
    gender: 'women',
    citySlug: 'accra',
    city: 'East Legon',
    region: 'Greater Accra',
    country: 'Ghana',
    nationality: 'Ghanaian',
    age: 29,
    shortBio:
      'Stylish wellness host offering aromatherapy and spa-inspired sessions in East Legon.',
    about:
      'My sessions lean spa and restorative — soft lighting, aromatherapy and unhurried care. Ideal if you want a polished private wellness reset. Clear timing, private studio setting in East Legon, and optional add-on spa rituals.',
    services: ['Aromatherapy', 'Spa Session', 'Relaxation Massage'],
    serviceOfferings: [
      { name: 'Aromatherapy', durationMinutes: 60, priceFrom: 450 },
      { name: 'Spa Session', durationMinutes: 90, priceFrom: 550 },
      { name: 'Relaxation Massage', durationMinutes: 60, priceFrom: 420 },
    ],
    primaryCategory: 'spa',
    startingPrice: 450,
    currency: 'GHS',
    availability: 'this_week',
    availableDays: 'Tue–Sun · Daytime & early evening',
    serviceSetting: ['studio'],
    serviceArea: 'East Legon · Accra',
    primaryImage: '/profiles/demo-akosua-m.jpg',
    gallery: [
      '/profiles/demo-akosua-m.jpg',
      '/profiles/demo-lifestyle-lounge.jpg',
      '/profiles/demo-gallery-cafe.jpg',
      '/spa_treatment_room.jpg',
    ],
    phone: '+233200000102',
    whatsapp: '+233200000102',
    publicContactEnabled: true,
    verified: false,
    featured: true,
    languages: ['English'],
    occupation: 'Spa & wellness host',
    interests: ['Skincare', 'Jazz', 'Design'],
    isDemo: true,
    createdAt: '2026-09-20',
  },
  {
    id: 'demo-kwame-m',
    slug: 'kwame-m',
    displayName: 'Kwame M.',
    profileType: 'massage_provider',
    gender: 'men',
    citySlug: 'accra',
    city: 'Accra',
    region: 'Greater Accra',
    country: 'Ghana',
    nationality: 'Ghanaian',
    age: 32,
    shortBio:
      'Professional male massage therapist offering deep tissue and sports recovery across Accra.',
    about:
      'Focused, professional sessions with clear boundaries. I specialise in deep tissue and sports recovery for clients who want strong, effective work after training or long desk days. Studio and selected home visits in Accra.',
    services: ['Deep Tissue Massage', 'Sports Massage', 'Swedish Massage'],
    serviceOfferings: [
      { name: 'Deep Tissue Massage', durationMinutes: 75, priceFrom: 400 },
      { name: 'Sports Massage', durationMinutes: 60, priceFrom: 380 },
      { name: 'Swedish Massage', durationMinutes: 60, priceFrom: 360 },
    ],
    primaryCategory: 'massage',
    startingPrice: 360,
    currency: 'GHS',
    availability: 'today',
    availableDays: 'Mon–Sat',
    serviceSetting: ['studio', 'in_home'],
    serviceArea: 'Accra · Ridge · Cantonments · Labone',
    primaryImage: '/profiles/demo-kwame-m.jpg',
    gallery: [
      '/profiles/demo-kwame-m.jpg',
      '/spa_treatment_room.jpg',
      '/profiles/demo-lifestyle-lounge.jpg',
    ],
    phone: '+233200000201',
    whatsapp: '+233200000201',
    publicContactEnabled: true,
    verified: true,
    featured: true,
    languages: ['English', 'Twi'],
    occupation: 'Massage therapist',
    interests: ['Fitness', 'Wellness'],
    isDemo: true,
    createdAt: '2026-10-05',
  },
  {
    id: 'demo-kofi-a',
    slug: 'kofi-a',
    displayName: 'Kofi A.',
    profileType: 'massage_provider',
    gender: 'men',
    citySlug: 'accra',
    city: 'East Legon',
    region: 'Greater Accra',
    country: 'Ghana',
    nationality: 'Ghanaian',
    age: 30,
    shortBio: 'Calm, professional relaxation and Swedish massage for clients in East Legon.',
    about:
      'Gentle-to-firm Swedish and relaxation massage in a private studio setting. Clear booking windows, professional hygiene standards and a quiet space to reset.',
    services: ['Swedish Massage', 'Relaxation Massage', 'Aromatherapy'],
    serviceOfferings: [
      { name: 'Swedish Massage', durationMinutes: 60, priceFrom: 370 },
      { name: 'Relaxation Massage', durationMinutes: 75, priceFrom: 390 },
      { name: 'Aromatherapy', durationMinutes: 60, priceFrom: 410 },
    ],
    primaryCategory: 'massage',
    startingPrice: 370,
    currency: 'GHS',
    availability: 'this_week',
    availableDays: 'Tue–Sun',
    serviceSetting: ['studio'],
    serviceArea: 'East Legon · Accra',
    primaryImage: '/profiles/demo-kofi-m.jpg',
    gallery: [
      '/profiles/demo-kofi-m.jpg',
      '/profiles/demo-gallery-cafe.jpg',
      '/spa_treatment_room.jpg',
    ],
    phone: '+233200000202',
    whatsapp: '+233200000202',
    publicContactEnabled: true,
    verified: false,
    featured: true,
    languages: ['English'],
    occupation: 'Massage therapist',
    isDemo: true,
    createdAt: '2026-10-08',
  },
  {
    id: 'demo-yaw-b',
    slug: 'yaw-b',
    displayName: 'Yaw B.',
    profileType: 'wellness_provider',
    gender: 'men',
    citySlug: 'accra',
    city: 'Accra',
    region: 'Greater Accra',
    country: 'Ghana',
    nationality: 'Ghanaian',
    age: 34,
    shortBio: 'In-home and studio massage for professionals who want discreet, reliable care.',
    about:
      'I offer home massage and studio sessions with a focus on punctuality and professional care. Ideal for executives and travellers who want effective recovery without fuss.',
    services: ['Home Massage', 'Deep Tissue Massage', 'Relaxation Massage'],
    serviceOfferings: [
      { name: 'Home Massage', durationMinutes: 90, priceFrom: 500 },
      { name: 'Deep Tissue Massage', durationMinutes: 75, priceFrom: 430 },
      { name: 'Relaxation Massage', durationMinutes: 60, priceFrom: 380 },
    ],
    primaryCategory: 'home-massage',
    startingPrice: 380,
    currency: 'GHS',
    availability: 'flexible',
    availableDays: 'Daily · By appointment',
    serviceSetting: ['studio', 'in_home'],
    serviceArea: 'Accra · Airport · Osu · Cantonments',
    primaryImage: '/profiles/demo-yaw-m.jpg',
    gallery: [
      '/profiles/demo-yaw-m.jpg',
      '/profiles/demo-lifestyle-lounge.jpg',
      '/profiles/demo-lifestyle-city.jpg',
    ],
    phone: '+233200000203',
    whatsapp: '+233200000203',
    publicContactEnabled: true,
    verified: false,
    featured: false,
    languages: ['English', 'Ga'],
    occupation: 'Mobile massage therapist',
    isDemo: true,
    createdAt: '2026-10-10',
  },
  {
    id: 'demo-serwaa-a',
    slug: 'serwaa-a',
    displayName: 'Serwaa A.',
    profileType: 'wellness_provider',
    gender: 'women',
    citySlug: 'tema',
    city: 'Tema',
    region: 'Greater Accra',
    country: 'Ghana',
    nationality: 'Ghanaian',
    age: 30,
    shortBio: 'In-home wellness and relaxation sessions for professionals across Tema and Spintex.',
    about:
      'I bring a polished private setup to your home or lodging — ideal after travel or long shifts when you want comfort without leaving your space. Clear arrival window, professional care, discreet service.',
    services: ['Home Massage', 'Relaxation Massage', 'Deep Tissue Massage'],
    serviceOfferings: [
      { name: 'Home Massage', durationMinutes: 75, priceFrom: 400 },
      { name: 'Relaxation Massage', durationMinutes: 60, priceFrom: 380 },
      { name: 'Deep Tissue Massage', durationMinutes: 75, priceFrom: 450 },
    ],
    primaryCategory: 'home-massage',
    startingPrice: 400,
    currency: 'GHS',
    availability: 'flexible',
    availableDays: 'Daily · By appointment',
    serviceSetting: ['in_home'],
    serviceArea: 'Tema · Spintex · Community 25',
    primaryImage: '/profiles/demo-serwaa-k.jpg',
    gallery: [
      '/profiles/demo-serwaa-k.jpg',
      '/profiles/demo-lifestyle-lounge.jpg',
      '/profiles/demo-gallery-cafe.jpg',
    ],
    phone: '+233200000103',
    whatsapp: '+233200000103',
    publicContactEnabled: true,
    verified: false,
    featured: false,
    languages: ['English', 'Ga'],
    occupation: 'Mobile wellness provider',
    interests: ['Fitness', 'Wellness', 'Music'],
    isDemo: true,
    createdAt: '2026-10-01',
  },
  {
    id: 'demo-esi-k',
    slug: 'esi-k',
    displayName: 'Esi K.',
    profileType: 'massage_provider',
    gender: 'women',
    citySlug: 'tema',
    city: 'Tema',
    region: 'Greater Accra',
    country: 'Ghana',
    nationality: 'Ghanaian',
    age: 28,
    shortBio: 'Sports and recovery-focused massage for athletes and desk workers in Tema.',
    about:
      'Focused recovery work for tension from training or long desk hours. Clear boundaries, clear timing and professional care in studio or at your location.',
    services: ['Sports Massage', 'Deep Tissue Massage', 'Relaxation Massage'],
    serviceOfferings: [
      { name: 'Sports Massage', durationMinutes: 60, priceFrom: 370 },
      { name: 'Deep Tissue Massage', durationMinutes: 75, priceFrom: 420 },
      { name: 'Relaxation Massage', durationMinutes: 60, priceFrom: 350 },
    ],
    primaryCategory: 'massage',
    startingPrice: 370,
    currency: 'GHS',
    availability: 'today',
    availableDays: 'Mon–Fri · Weekends on request',
    serviceSetting: ['studio', 'in_home'],
    serviceArea: 'Tema · Community 1–12',
    primaryImage: '/profiles/demo-yaa-e.jpg',
    gallery: [
      '/profiles/demo-yaa-e.jpg',
      '/profiles/demo-lifestyle-city.jpg',
      '/profiles/demo-gallery-rooftop.jpg',
    ],
    phone: '+233200000105',
    whatsapp: '+233200000105',
    publicContactEnabled: true,
    verified: false,
    featured: false,
    languages: ['English'],
    occupation: 'Sports massage therapist',
    interests: ['Fitness', 'Nutrition'],
    isDemo: true,
    createdAt: '2026-10-02',
  },
  {
    id: 'demo-esi-b',
    slug: 'esi-b',
    displayName: 'Esi B.',
    profileType: 'massage_provider',
    gender: 'women',
    citySlug: 'kumasi',
    city: 'Kumasi',
    region: 'Ashanti',
    country: 'Ghana',
    nationality: 'Ghanaian',
    age: 29,
    shortBio:
      'Confident wellness provider offering couples and individual relaxation sessions in Kumasi.',
    about:
      'Whether you book alone or as a pair, sessions are paced, private and focused on genuine rest. Clear timing, professional care and a calm studio setting in Kumasi.',
    services: ['Couples Massage', 'Swedish Massage', 'Relaxation Massage'],
    serviceOfferings: [
      { name: 'Couples Massage', durationMinutes: 90, priceFrom: 520 },
      { name: 'Swedish Massage', durationMinutes: 60, priceFrom: 380 },
      { name: 'Relaxation Massage', durationMinutes: 75, priceFrom: 400 },
    ],
    primaryCategory: 'couples-massage',
    startingPrice: 520,
    currency: 'GHS',
    availability: 'this_week',
    availableDays: 'Wed–Sun',
    serviceSetting: ['studio', 'flexible'],
    serviceArea: 'Kumasi central & selected hotels',
    primaryImage: '/profiles/demo-esi-b.jpg',
    gallery: [
      '/profiles/demo-esi-b.jpg',
      '/profiles/demo-lifestyle-lounge.jpg',
      '/profiles/demo-gallery-rooftop.jpg',
      '/spa_treatment_room.jpg',
    ],
    phone: '+233200000104',
    whatsapp: '+233200000104',
    publicContactEnabled: true,
    verified: false,
    featured: true,
    languages: ['English', 'Twi'],
    occupation: 'Massage & wellness',
    interests: ['Wellness', 'Music', 'Travel'],
    isDemo: true,
    createdAt: '2026-09-28',
  },
];

export function findMarketplaceProfile(slug: string): MarketplaceProfile | undefined {
  const profile = MARKETPLACE_PROFILES.find((p) => p.slug === slug);
  if (!profile || !isPublicMassageProfile(profile)) return undefined;
  return profile;
}

export function profilesForCity(citySlug: string): MarketplaceProfile[] {
  return MARKETPLACE_PROFILES.filter(
    (p) => p.citySlug === citySlug.toLowerCase() && isPublicMassageProfile(p),
  );
}

export function siblingProfiles(
  citySlug: string,
  currentSlug: string,
  filterService?: string | null,
): MarketplaceProfile[] {
  let list = MARKETPLACE_PROFILES.filter(
    (p) => p.citySlug === citySlug && isPublicMassageProfile(p) && p.slug !== currentSlug,
  );
  if (filterService) {
    list = list.filter((p) => p.primaryCategory === filterService);
  }
  return list;
}
