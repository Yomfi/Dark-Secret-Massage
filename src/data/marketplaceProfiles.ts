import type { ServiceCategoryId } from './serviceCategories';

/** DEMO marketplace profiles — fictional until real providers submit & approve. */

export type MarketplaceProfileType =
  | 'massage_provider'
  | 'wellness_provider'
  | 'matchmaking_profile'
  | 'social_profile'
  | 'dating_profile';

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
  lookingFor?: string;
  relationshipIntention?: string;
  preferredConnection?: string;
  socialPreference?: string;
  isDemo: true;
  createdAt: string;
};

export const PROFILE_TYPE_LABELS: Record<MarketplaceProfileType, string> = {
  massage_provider: 'Massage Provider',
  wellness_provider: 'Wellness Provider',
  matchmaking_profile: 'Matchmaking',
  social_profile: 'Friendship',
  dating_profile: 'Dating / Connection',
};

export const MARKETPLACE_PROFILES: MarketplaceProfile[] = [
  {
    id: 'demo-ama-k',
    slug: 'ama-k',
    displayName: 'Ama K.',
    profileType: 'massage_provider',
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
    services: ['Massage', 'Relaxation', 'Home Visit'],
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
    verified: false,
    featured: true,
    languages: ['English', 'Twi'],
    occupation: 'Wellness practitioner',
    interests: ['Wellness', 'Travel', 'Afrobeats'],
    isDemo: true,
    createdAt: '2026-09-12',
  },
  {
    id: 'demo-akosua-m',
    slug: 'akosua-m',
    displayName: 'Akosua M.',
    profileType: 'wellness_provider',
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
    services: ['Wellness', 'Spa', 'Aromatherapy'],
    serviceOfferings: [
      { name: 'Aromatherapy Session', durationMinutes: 60, priceFrom: 450 },
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
      '/private_lounge.jpg',
    ],
    phone: '+233200000102',
    whatsapp: '+233200000102',
    publicContactEnabled: true,
    verified: false,
    featured: true,
    languages: ['English'],
    height: '5\'6"',
    smoking: 'Non-smoker',
    occupation: 'Spa & wellness host',
    interests: ['Skincare', 'Jazz', 'Design'],
    isDemo: true,
    createdAt: '2026-09-20',
  },
  {
    id: 'demo-abena-s',
    slug: 'abena-s',
    displayName: 'Abena S.',
    profileType: 'matchmaking_profile',
    citySlug: 'accra',
    city: 'Accra',
    region: 'Greater Accra',
    country: 'Ghana',
    nationality: 'Ghanaian',
    age: 31,
    shortBio:
      'Intentional about marriage, faith and building a stable future with the right partner.',
    about:
      'I value honesty, shared faith and a partnership built for family. Prefer thoughtful conversation and clear intentions over rushed introductions. Looking for someone grounded, kind and ready for a serious path.',
    services: ['Marriage', 'Serious Relationship', 'Matchmaking'],
    primaryCategory: 'matchmaking',
    currency: 'GHS',
    availability: 'flexible',
    serviceSetting: ['flexible'],
    serviceArea: 'Accra & diaspora introductions',
    primaryImage: '/profiles/demo-abena-d.jpg',
    gallery: [
      '/profiles/demo-abena-d.jpg',
      '/profiles/demo-gallery-cafe.jpg',
      '/profiles/demo-lifestyle-city.jpg',
      '/candlelit_dinner.jpg',
    ],
    publicContactEnabled: false,
    verified: false,
    featured: true,
    languages: ['English', 'Twi'],
    occupation: 'Finance professional',
    lookingFor: 'Marriage-minded partner',
    relationshipIntention: 'Marriage',
    preferredConnection: 'Serious introductions',
    interests: ['Faith', 'Family', 'Travel'],
    smoking: 'Non-smoker',
    isDemo: true,
    createdAt: '2026-10-05',
  },
  {
    id: 'demo-mimi-k',
    slug: 'mimi-k',
    displayName: 'Mimi K.',
    profileType: 'dating_profile',
    citySlug: 'accra',
    city: 'Accra',
    region: 'Greater Accra',
    country: 'Ghana',
    nationality: 'Ghanaian',
    age: 26,
    shortBio: 'Fun, fashionable and open to meeting genuine people for dating and connection.',
    about:
      'I love Accra evenings, good music and easy chemistry. Looking for respectful dating energy — someone stylish, kind and clear about what they want. Friendship that can grow into something real is welcome too.',
    services: ['Dating', 'Social Connection', 'Friendship'],
    primaryCategory: 'friendship',
    currency: 'GHS',
    availability: 'flexible',
    serviceSetting: ['flexible'],
    serviceArea: 'Accra · Osu · East Legon',
    primaryImage: '/profiles/demo-mimi-a.jpg',
    gallery: [
      '/profiles/demo-mimi-a.jpg',
      '/profiles/demo-gallery-rooftop.jpg',
      '/profiles/demo-lifestyle-lounge.jpg',
      '/profiles/demo-lifestyle-city.jpg',
    ],
    phone: '+233200000110',
    whatsapp: '+233200000110',
    publicContactEnabled: true,
    verified: false,
    featured: true,
    languages: ['English'],
    occupation: 'Creative / media',
    lookingFor: 'Dating & genuine connection',
    relationshipIntention: 'Dating / Connection',
    preferredConnection: 'In-person · Low pressure',
    socialPreference: 'Evenings & weekends',
    interests: ['Fashion', 'Nightlife', 'Photography'],
    height: '5\'5"',
    smoking: 'Occasionally',
    isDemo: true,
    createdAt: '2026-10-08',
  },
  {
    id: 'demo-naa-d',
    slug: 'naa-d',
    displayName: 'Naa D.',
    profileType: 'dating_profile',
    citySlug: 'accra',
    city: 'East Legon',
    region: 'Greater Accra',
    country: 'Ghana',
    nationality: 'Ghanaian',
    age: 27,
    shortBio: 'Easy-going, stylish and open to meeting genuine people around Accra.',
    about:
      'Based in East Legon and always up for coffee, culture or a low-key evening out. Looking for friendship that can grow into something real — respectful dating energy welcome.',
    services: ['Friendship', 'Social Connection', 'Dating'],
    primaryCategory: 'friendship',
    currency: 'GHS',
    availability: 'flexible',
    serviceSetting: ['flexible'],
    serviceArea: 'East Legon · Accra',
    primaryImage: '/profiles/demo-naa-s.jpg',
    gallery: [
      '/profiles/demo-naa-s.jpg',
      '/profiles/demo-gallery-cafe.jpg',
      '/profiles/demo-lifestyle-city.jpg',
      '/profiles/demo-lifestyle-lounge.jpg',
    ],
    publicContactEnabled: false,
    verified: false,
    featured: true,
    languages: ['English', 'Ga'],
    occupation: 'Hospitality',
    lookingFor: 'Friendship & dating',
    relationshipIntention: 'Open / Dating',
    preferredConnection: 'Coffee · Culture nights',
    socialPreference: 'Flexible schedule',
    interests: ['Food', 'Art', 'Travel'],
    isDemo: true,
    createdAt: '2026-10-10',
  },
  {
    id: 'demo-serwaa-a',
    slug: 'serwaa-a',
    displayName: 'Serwaa A.',
    profileType: 'wellness_provider',
    citySlug: 'tema',
    city: 'Tema',
    region: 'Greater Accra',
    country: 'Ghana',
    nationality: 'Ghanaian',
    age: 30,
    shortBio: 'In-home wellness and relaxation sessions for professionals across Tema and Spintex.',
    about:
      'I bring a polished private setup to your home or lodging — ideal after travel or long shifts when you want comfort without leaving your space. Clear arrival window, professional care, discreet service.',
    services: ['Home Massage', 'Relaxation', 'Wellness'],
    serviceOfferings: [
      { name: 'In-home Massage', durationMinutes: 75, priceFrom: 400 },
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
    citySlug: 'tema',
    city: 'Tema',
    region: 'Greater Accra',
    country: 'Ghana',
    nationality: 'Ghanaian',
    age: 28,
    shortBio: 'Sports and recovery-focused massage for athletes and desk workers in Tema.',
    about:
      'Focused recovery work for tension from training or long desk hours. Clear boundaries, clear timing and professional care in studio or at your location.',
    services: ['Massage', 'Sports Massage', 'Deep Tissue'],
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
    id: 'demo-nana-a',
    slug: 'nana-a',
    displayName: 'Nana A.',
    profileType: 'social_profile',
    citySlug: 'kumasi',
    city: 'Kumasi',
    region: 'Ashanti',
    country: 'Ghana',
    nationality: 'Ghanaian',
    age: 27,
    shortBio: 'Easy-going and stylish — open to genuine friendship and social connection in Kumasi.',
    about:
      'I enjoy good conversation, culture nights and meeting people who value sincerity. Friendship first, no pressure — just real connection around Kumasi.',
    services: ['Friendship', 'Social Connection'],
    primaryCategory: 'friendship',
    currency: 'GHS',
    availability: 'this_week',
    serviceSetting: ['flexible'],
    serviceArea: 'Kumasi · Ahodwo · Airport Roundabout area',
    primaryImage: '/profiles/demo-nana-a.jpg',
    gallery: [
      '/profiles/demo-nana-a.jpg',
      '/profiles/demo-lifestyle-city.jpg',
      '/profiles/demo-gallery-cafe.jpg',
    ],
    whatsapp: '+233200000120',
    publicContactEnabled: true,
    verified: false,
    featured: false,
    languages: ['English', 'Twi'],
    occupation: 'Education',
    lookingFor: 'Genuine friendship',
    relationshipIntention: 'Friendship',
    preferredConnection: 'Social · Low pressure',
    socialPreference: 'Weekends preferred',
    interests: ['Books', 'Culture', 'Coffee'],
    smoking: 'Non-smoker',
    isDemo: true,
    createdAt: '2026-09-25',
  },
  {
    id: 'demo-esi-b',
    slug: 'esi-b',
    displayName: 'Esi B.',
    profileType: 'massage_provider',
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
    services: ['Massage', 'Couples Massage', 'Relaxation'],
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
  return MARKETPLACE_PROFILES.find((p) => p.slug === slug);
}

export function profilesForCity(citySlug: string): MarketplaceProfile[] {
  return MARKETPLACE_PROFILES.filter((p) => p.citySlug === citySlug.toLowerCase());
}

/** Preserve explore filter context for previous/next browsing when provided. */
export function siblingProfiles(
  profile: MarketplaceProfile,
  citySlug: string,
  filterService?: string | null,
): MarketplaceProfile[] {
  let list = MARKETPLACE_PROFILES.filter((p) => p.citySlug === citySlug);
  if (filterService) {
    list = list.filter((p) => p.primaryCategory === filterService);
  }
  return list;
}
