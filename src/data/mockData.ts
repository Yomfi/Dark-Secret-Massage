/**
 * Static editorial copy only. Live services, providers, prices and availability
 * are loaded from the API in `src/lib/cmsCatalogue.ts`; nothing here is a
 * mutable registry that a previous page has to fill.
 */
export type { MassageService, MassageTherapist } from '../lib/catalogue';

export const HOW_IT_WORKS_STEPS = [
  {
    number: '01',
    title: 'Private Verification & Onboarding',
    description:
      'Providers undergo confidential identity checks and profile review before appearing publicly, protecting client privacy and marketplace safety.',
  },
  {
    number: '02',
    title: 'Browse Massage Professionals',
    description:
      'Search by city for therapeutic wellness massage with reviewed providers — in studio or at home.',
  },
  {
    number: '03',
    title: 'Book with Discretion & Care',
    description:
      'Reserve tranquil in-home and sanctuary wellness sessions with full safety assurances and private booking details.',
  },
];
