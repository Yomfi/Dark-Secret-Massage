import type { ServiceCategoryId } from './serviceCategories';

/** DEMO marketplace profiles — replace with MySQL-backed data later. */

export type MarketplaceProfileType = 'massage_provider' | 'matchmaking_profile' | 'social_profile';

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
    shortBio: 'Professional massage therapist offering relaxation and deep-tissue sessions in Accra.',
    about:
      'I specialise in restorative bodywork for busy professionals. Sessions are calm, private and tailored to how your body feels that day — from gentle Swedish to focused deep tissue.',
    services: ['Swedish Massage', 'Deep Tissue Massage', 'Relaxation Massage'],
    primaryCategory: 'massage',
    startingPrice: 350,
    currency: 'GHS',
    availability: 'today',
    serviceSetting: ['studio', 'in_home'],
    primaryImage: '/profiles/profile_ama.jpg',
    gallery: ['/profiles/profile_ama.jpg', '/spa_treatment_room.jpg', '/private_lounge.jpg'],
    phone: '+233241000101',
    whatsapp: '+233241000101',
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
    profileType: 'massage_provider',
    citySlug: 'accra',
    city: 'Accra',
    region: 'Greater Accra',
    country: 'Ghana',
    shortBio: 'Spa-focused wellness sessions with aromatherapy and calm studio care in East Legon.',
    about:
      'My practice centres on quiet spa rituals — aromatherapy, measured pressure and a space designed for recovery after long work weeks.',
    services: ['Aromatherapy', 'Spa Session', 'Relaxation Massage'],
    primaryCategory: 'spa',
    startingPrice: 420,
    currency: 'GHS',
    availability: 'this_week',
    serviceSetting: ['studio'],
    primaryImage: '/profiles/profile_akosua.jpg',
    gallery: ['/profiles/profile_akosua.jpg', '/massage_therapy_booking_hero.jpg', '/spa_treatment_room.jpg'],
    whatsapp: '+233241000102',
    publicContactEnabled: true,
    verified: false,
    featured: true,
    languages: ['English'],
    isDemo: true,
    createdAt: '2026-09-20',
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
    shortBio: 'In-home massage for professionals across Tema and Spintex corridors.',
    about:
      'I bring a full professional setup to your home or lodging. Ideal if you prefer privacy after travel or long shifts without leaving your space.',
    services: ['In-home Massage', 'Deep Tissue Massage', 'Sports Massage'],
    primaryCategory: 'home-massage',
    startingPrice: 380,
    currency: 'GHS',
    availability: 'flexible',
    serviceSetting: ['in_home'],
    primaryImage: '/profiles/profile_yaa.jpg',
    gallery: ['/profiles/profile_yaa.jpg', '/private_lounge.jpg'],
    phone: '+233241000103',
    whatsapp: '+233241000103',
    publicContactEnabled: true,
    verified: false,
    featured: false,
    languages: ['English', 'Ga'],
    isDemo: true,
    createdAt: '2026-10-01',
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
    shortBio: 'Couples and individual wellness massage in a calm Kumasi studio.',
    about:
      'Whether you book alone or as a pair, sessions are paced, professional and focused on genuine rest — not rush.',
    services: ['Couples Massage', 'Swedish Massage', 'Relaxation Massage'],
    primaryCategory: 'couples-massage',
    startingPrice: 500,
    currency: 'GHS',
    availability: 'this_week',
    serviceSetting: ['studio', 'flexible'],
    primaryImage: '/profiles/profile_esi.jpg',
    gallery: ['/profiles/profile_esi.jpg', '/ghanaian_couple_picnic.jpg', '/spa_treatment_room.jpg'],
    whatsapp: '+233241000104',
    publicContactEnabled: true,
    verified: false,
    featured: true,
    languages: ['English', 'Twi'],
    isDemo: true,
    createdAt: '2026-09-28',
  },
  {
    id: 'demo-adwoa-n',
    slug: 'adwoa-n',
    displayName: 'Adwoa N.',
    profileType: 'matchmaking_profile',
    citySlug: 'accra',
    city: 'Accra',
    region: 'Greater Accra',
    country: 'Ghana',
    shortBio: 'Looking to meet someone intentional about marriage, faith and building a stable future.',
    about:
      'I value honesty, shared faith and a partnership built for family. Prefer thoughtful conversation over rushed introductions.',
    services: ['Marriage-focused', 'Serious Relationship'],
    primaryCategory: 'matchmaking',
    currency: 'GHS',
    availability: 'flexible',
    serviceSetting: ['flexible'],
    primaryImage: '/profiles/profile_adwoa.jpg',
    gallery: ['/profiles/profile_adwoa.jpg', '/ghanaian_white_wedding.jpg', '/candlelit_dinner.jpg'],
    publicContactEnabled: false,
    verified: false,
    featured: true,
    languages: ['English', 'Twi'],
    isDemo: true,
    createdAt: '2026-10-05',
  },
  {
    id: 'demo-abena-s',
    slug: 'abena-s',
    displayName: 'Abena S.',
    profileType: 'matchmaking_profile',
    citySlug: 'kumasi',
    city: 'Kumasi',
    region: 'Ashanti',
    country: 'Ghana',
    shortBio: 'Marriage-minded professional seeking a grounded partner with shared values.',
    about:
      'I am intentional about marriage and family. Looking for someone kind, ambitious and clear about building a lasting home.',
    services: ['Marriage-focused'],
    primaryCategory: 'matchmaking',
    currency: 'GHS',
    availability: 'this_week',
    serviceSetting: ['flexible'],
    primaryImage: '/profiles/profile_abena.jpg',
    gallery: ['/profiles/profile_abena.jpg', '/ghanaian_couple_story.jpg'],
    publicContactEnabled: false,
    verified: false,
    featured: false,
    languages: ['English', 'Twi'],
    isDemo: true,
    createdAt: '2026-09-18',
  },
  {
    id: 'demo-kwame-d',
    slug: 'kwame-d',
    displayName: 'Kwame D.',
    profileType: 'social_profile',
    citySlug: 'accra',
    city: 'Accra',
    region: 'Greater Accra',
    country: 'Ghana',
    shortBio: 'Open to meeting new people for genuine friendship and social connection.',
    about:
      'New to Accra’s social circles after relocating for work. Enjoy coffee conversations, culture and low-pressure friendship.',
    services: ['Friendship', 'Social Connection'],
    primaryCategory: 'friendship',
    currency: 'GHS',
    availability: 'flexible',
    serviceSetting: ['flexible'],
    primaryImage: '/hero-ghanaian-couple.jpg',
    gallery: ['/hero-ghanaian-couple.jpg', '/candlelit_dinner.jpg'],
    publicContactEnabled: false,
    verified: false,
    featured: false,
    languages: ['English'],
    isDemo: true,
    createdAt: '2026-10-08',
  },
  {
    id: 'demo-efua-t',
    slug: 'efua-t',
    displayName: 'Efua T.',
    profileType: 'massage_provider',
    citySlug: 'tema',
    city: 'Tema',
    region: 'Greater Accra',
    country: 'Ghana',
    shortBio: 'Sports and recovery massage for athletes and desk workers in Tema.',
    about:
      'Focused recovery work for tension from training or long desk hours. Clear boundaries, clear timing, professional care.',
    services: ['Sports Massage', 'Deep Tissue Massage'],
    primaryCategory: 'massage',
    startingPrice: 360,
    currency: 'GHS',
    availability: 'today',
    serviceSetting: ['studio', 'in_home'],
    primaryImage: '/massage_therapy_booking_hero.jpg',
    gallery: ['/massage_therapy_booking_hero.jpg', '/spa_treatment_room.jpg'],
    phone: '+233241000105',
    whatsapp: '+233241000105',
    publicContactEnabled: true,
    verified: false,
    featured: false,
    languages: ['English'],
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
    shortBio: 'Seeking genuine friendship and community connection in Kumasi.',
    about:
      'I enjoy book clubs, quiet evenings and meeting people who value sincerity. Friendship first — no rush.',
    services: ['Friendship'],
    primaryCategory: 'friendship',
    currency: 'GHS',
    availability: 'this_week',
    serviceSetting: ['flexible'],
    primaryImage: '/ghanaian_couple_picnic.jpg',
    gallery: ['/ghanaian_couple_picnic.jpg'],
    publicContactEnabled: false,
    verified: false,
    featured: false,
    languages: ['English', 'Twi'],
    isDemo: true,
    createdAt: '2026-09-25',
  },
];

export function findMarketplaceProfile(slug: string): MarketplaceProfile | undefined {
  return MARKETPLACE_PROFILES.find((p) => p.slug === slug);
}

export function profilesForCity(citySlug: string): MarketplaceProfile[] {
  return MARKETPLACE_PROFILES.filter((p) => p.citySlug === citySlug);
}
