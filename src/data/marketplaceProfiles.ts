import type { ServiceCategoryId } from './serviceCategories';

/** DEMO marketplace profiles — fictional data until real providers submit. */

export type MarketplaceProfileType =
  | 'massage_provider'
  | 'wellness_provider'
  | 'matchmaking_profile'
  | 'social_profile'
  | 'dating_profile';

export type ServiceSetting = 'studio' | 'in_home' | 'flexible';

export type MarketplaceAvailability = 'today' | 'this_week' | 'flexible';

export type MarketplaceProfile = {
  id: string;
  slug: string;
  displayName: string;
  profileType: MarketplaceProfileType;
  citySlug: string;
  city: string;
  region: string;
  country: string;
  shortBio: string;
  about: string;
  services: string[];
  primaryCategory: ServiceCategoryId;
  startingPrice?: number;
  currency: string;
  availability: MarketplaceAvailability;
  serviceSetting: ServiceSetting[];
  primaryImage: string;
  gallery: string[];
  phone?: string;
  whatsapp?: string;
  publicContactEnabled: boolean;
  /** Real verification only — demo profiles stay false unless marked. */
  verified: boolean;
  featured: boolean;
  languages?: string[];
  isDemo: true;
  createdAt: string;
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
    shortBio:
      'Warm, friendly and professional wellness provider offering private relaxation sessions across Accra.',
    about:
      'I create calm, private sessions for people who want to unwind after Accra’s pace. Expect a welcoming atmosphere, clear boundaries and tailored pressure — from gentle relaxation to deeper tissue work.',
    services: ['Massage', 'Relaxation', 'In-home'],
    primaryCategory: 'massage',
    startingPrice: 380,
    currency: 'GHS',
    availability: 'today',
    serviceSetting: ['studio', 'in_home'],
    primaryImage: '/profiles/demo-ama-k.jpg',
    gallery: [
      '/profiles/demo-ama-k.jpg',
      '/profiles/demo-lifestyle-lounge.jpg',
      '/profiles/demo-lifestyle-city.jpg',
    ],
    phone: '+233200000101',
    whatsapp: '+233200000101',
    publicContactEnabled: true,
    verified: false,
    featured: true,
    languages: ['English', 'Twi'],
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
    shortBio:
      'Stylish wellness host offering aromatherapy and spa-inspired sessions in East Legon.',
    about:
      'My sessions lean spa and restorative — soft lighting, aromatherapy and unhurried care. Ideal if you want a polished private wellness reset without the corporate clinic feel.',
    services: ['Wellness', 'Spa', 'Aromatherapy'],
    primaryCategory: 'spa',
    startingPrice: 450,
    currency: 'GHS',
    availability: 'this_week',
    serviceSetting: ['studio'],
    primaryImage: '/profiles/demo-akosua-m.jpg',
    gallery: [
      '/profiles/demo-akosua-m.jpg',
      '/profiles/demo-lifestyle-lounge.jpg',
      '/private_lounge.jpg',
    ],
    whatsapp: '+233200000102',
    publicContactEnabled: true,
    verified: false,
    featured: true,
    languages: ['English'],
    isDemo: true,
    createdAt: '2026-09-20',
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
    shortBio: 'Easy-going and stylish — open to genuine friendship and social connection in Kumasi.',
    about:
      'I enjoy good conversation, culture nights and meeting people who value sincerity. Friendship first, no pressure — just real connection around Kumasi.',
    services: ['Friendship', 'Social Connection'],
    primaryCategory: 'friendship',
    currency: 'GHS',
    availability: 'this_week',
    serviceSetting: ['flexible'],
    primaryImage: '/profiles/demo-nana-a.jpg',
    gallery: ['/profiles/demo-nana-a.jpg', '/profiles/demo-lifestyle-city.jpg'],
    publicContactEnabled: false,
    verified: false,
    featured: false,
    languages: ['English', 'Twi'],
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
    shortBio:
      'Confident wellness provider offering couples and individual relaxation sessions in Kumasi.',
    about:
      'Whether you book alone or as a pair, sessions are paced, private and focused on genuine rest. Clear timing, professional care and a calm studio setting.',
    services: ['Massage', 'Couples Massage', 'Relaxation'],
    primaryCategory: 'couples-massage',
    startingPrice: 520,
    currency: 'GHS',
    availability: 'this_week',
    serviceSetting: ['studio', 'flexible'],
    primaryImage: '/profiles/demo-esi-b.jpg',
    gallery: [
      '/profiles/demo-esi-b.jpg',
      '/profiles/demo-lifestyle-lounge.jpg',
      '/spa_treatment_room.jpg',
    ],
    whatsapp: '+233200000104',
    publicContactEnabled: true,
    verified: false,
    featured: true,
    languages: ['English', 'Twi'],
    isDemo: true,
    createdAt: '2026-09-28',
  },
  {
    id: 'demo-abena-d',
    slug: 'abena-d',
    displayName: 'Abena D.',
    profileType: 'matchmaking_profile',
    citySlug: 'accra',
    city: 'Accra',
    region: 'Greater Accra',
    country: 'Ghana',
    shortBio:
      'Intentional about marriage, faith and building a stable future with the right partner.',
    about:
      'I value honesty, shared faith and a partnership built for family. Prefer thoughtful conversation and clear intentions over rushed introductions.',
    services: ['Matchmaking', 'Marriage-focused', 'Serious Relationship'],
    primaryCategory: 'matchmaking',
    currency: 'GHS',
    availability: 'flexible',
    serviceSetting: ['flexible'],
    primaryImage: '/profiles/demo-abena-d.jpg',
    gallery: ['/profiles/demo-abena-d.jpg', '/candlelit_dinner.jpg', '/profiles/demo-lifestyle-city.jpg'],
    publicContactEnabled: false,
    verified: false,
    featured: true,
    languages: ['English', 'Twi'],
    isDemo: true,
    createdAt: '2026-10-05',
  },
  {
    id: 'demo-mimi-a',
    slug: 'mimi-a',
    displayName: 'Mimi A.',
    profileType: 'dating_profile',
    citySlug: 'accra',
    city: 'Accra',
    region: 'Greater Accra',
    country: 'Ghana',
    shortBio: 'Fun, fashionable and open to meeting genuine people for dating and connection.',
    about:
      'I love Accra evenings, good music and easy chemistry. Looking for respectful dating energy — someone stylish, kind and clear about what they want.',
    services: ['Dating', 'Social Connection', 'Friendship'],
    primaryCategory: 'friendship',
    currency: 'GHS',
    availability: 'flexible',
    serviceSetting: ['flexible'],
    primaryImage: '/profiles/demo-mimi-a.jpg',
    gallery: [
      '/profiles/demo-mimi-a.jpg',
      '/profiles/demo-lifestyle-lounge.jpg',
      '/profiles/demo-lifestyle-city.jpg',
    ],
    publicContactEnabled: false,
    verified: false,
    featured: true,
    languages: ['English'],
    isDemo: true,
    createdAt: '2026-10-08',
  },
  {
    id: 'demo-serwaa-k',
    slug: 'serwaa-k',
    displayName: 'Serwaa K.',
    profileType: 'wellness_provider',
    citySlug: 'tema',
    city: 'Tema',
    region: 'Greater Accra',
    country: 'Ghana',
    shortBio: 'In-home wellness and relaxation sessions for professionals across Tema and Spintex.',
    about:
      'I bring a polished private setup to your home or lodging — ideal after travel or long shifts when you want comfort without leaving your space.',
    services: ['Home Massage', 'Relaxation', 'Wellness'],
    primaryCategory: 'home-massage',
    startingPrice: 400,
    currency: 'GHS',
    availability: 'flexible',
    serviceSetting: ['in_home'],
    primaryImage: '/profiles/demo-serwaa-k.jpg',
    gallery: ['/profiles/demo-serwaa-k.jpg', '/profiles/demo-lifestyle-lounge.jpg'],
    phone: '+233200000103',
    whatsapp: '+233200000103',
    publicContactEnabled: true,
    verified: false,
    featured: false,
    languages: ['English', 'Ga'],
    isDemo: true,
    createdAt: '2026-10-01',
  },
  {
    id: 'demo-naa-s',
    slug: 'naa-s',
    displayName: 'Naa S.',
    profileType: 'dating_profile',
    citySlug: 'accra',
    city: 'East Legon',
    region: 'Greater Accra',
    country: 'Ghana',
    shortBio: 'Easy-going, stylish and open to meeting genuine people around Accra.',
    about:
      'Based in East Legon and always up for coffee, culture or a low-key evening out. Looking for friendship that can grow into something real — respectful dating energy welcome.',
    services: ['Friendship', 'Social Connection', 'Dating'],
    primaryCategory: 'friendship',
    currency: 'GHS',
    availability: 'flexible',
    serviceSetting: ['flexible'],
    primaryImage: '/profiles/demo-naa-s.jpg',
    gallery: [
      '/profiles/demo-naa-s.jpg',
      '/profiles/demo-lifestyle-city.jpg',
      '/profiles/demo-lifestyle-lounge.jpg',
    ],
    publicContactEnabled: false,
    verified: false,
    featured: true,
    languages: ['English', 'Ga'],
    isDemo: true,
    createdAt: '2026-10-10',
  },
  {
    id: 'demo-yaa-e',
    slug: 'yaa-e',
    displayName: 'Yaa E.',
    profileType: 'massage_provider',
    citySlug: 'tema',
    city: 'Tema',
    region: 'Greater Accra',
    country: 'Ghana',
    shortBio: 'Sports and recovery-focused massage for athletes and desk workers in Tema.',
    about:
      'Focused recovery work for tension from training or long desk hours. Clear boundaries, clear timing and professional care.',
    services: ['Massage', 'Sports Massage', 'Deep Tissue'],
    primaryCategory: 'massage',
    startingPrice: 370,
    currency: 'GHS',
    availability: 'today',
    serviceSetting: ['studio', 'in_home'],
    primaryImage: '/profiles/demo-yaa-e.jpg',
    gallery: ['/profiles/demo-yaa-e.jpg', '/profiles/demo-lifestyle-city.jpg'],
    phone: '+233200000105',
    whatsapp: '+233200000105',
    publicContactEnabled: true,
    verified: false,
    featured: false,
    languages: ['English'],
    isDemo: true,
    createdAt: '2026-10-02',
  },
];

export function findMarketplaceProfile(slug: string): MarketplaceProfile | undefined {
  return MARKETPLACE_PROFILES.find((p) => p.slug === slug);
}

export function profilesForCity(citySlug: string): MarketplaceProfile[] {
  return MARKETPLACE_PROFILES.filter((p) => p.citySlug === citySlug.toLowerCase());
}
