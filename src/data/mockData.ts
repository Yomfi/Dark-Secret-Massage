import { MatchmakingProfile, MassageTherapist } from '../lib/bookingAndMatchmaking';

export interface MassageService {
  id: string;
  name: string;
  tagline: string;
  description: string;
  durationMinutes: number[];
  basePriceGHS: number;
  benefits: string[];
  /** Published CMS media/category, when the studio supplied them. */
  image?: string | null;
  category?: string | null;
}

/**
 * Live catalogue. These arrays start empty and are filled from the CMS
 * (`/api/public/content.php` and `/api/public/providers.php`) so the public site
 * never renders invented services, therapists, prices or ratings.
 */
export let MASSAGE_SERVICES: MassageService[] = [];
export let CERTIFIED_THERAPISTS: MassageTherapist[] = [];
export let MATCHMAKING_PROFILES: MatchmakingProfile[] = [];

export function setMassageServices(services: MassageService[]): void {
  MASSAGE_SERVICES = services;
}

export function setCertifiedTherapists(therapists: MassageTherapist[]): void {
  CERTIFIED_THERAPISTS = therapists;
}

export function setMatchmakingProfiles(profiles: MatchmakingProfile[]): void {
  MATCHMAKING_PROFILES = profiles;
}

export const HOW_IT_WORKS_STEPS = [
  {
    number: '01',
    title: 'Private Verification & Onboarding',
    description: 'Providers undergo confidential identity checks and profile review before appearing publicly, protecting client privacy and marketplace safety.',
  },
  {
    number: '02',
    title: 'Browse Massage Professionals',
    description: 'Search by city for therapeutic wellness massage with reviewed providers — in studio or at home.',
  },
  {
    number: '03',
    title: 'Book with Discretion & Care',
    description: 'Reserve tranquil in-home and sanctuary wellness sessions with full safety assurances and private booking details.',
  },
];
