import { MASSAGE_SERVICES, type MassageService } from '../data/mockData';

/** Display-only presentation for /massage — does not invent medical claims. */
export interface MassageServicePresentation {
  service: MassageService;
  image: string;
  imageAlt: string;
  whoItMaySuit: string;
  whatToExpect: string[];
  locationAvailability: string;
}

const PRESENTATION: Record<
  string,
  Omit<MassageServicePresentation, 'service'>
> = {
  'deep-tissue': {
    image: '/massage_therapy_booking_hero.jpg',
    imageAlt: 'Professional deep tissue massage therapy session',
    whoItMaySuit:
      'People who prefer slower, focused bodywork for areas that feel tightly held.',
    whatToExpect: [
      'A calm intake of your preferences and pressure level',
      'Focused work on selected muscle groups',
      'Time to settle afterward before you leave',
    ],
    locationAvailability: 'Studio or in-home',
  },
  'swedish-holistic': {
    image: '/spa_treatment_room.jpg',
    imageAlt: 'Calm wellness treatment room prepared for Swedish massage',
    whoItMaySuit:
      'Anyone seeking a gentle, continuous full-body session for rest and unwind.',
    whatToExpect: [
      'Smooth, flowing techniques at a comfortable pace',
      'Optional botanical oils if you prefer them',
      'A quiet, restorative atmosphere',
    ],
    locationAvailability: 'Studio or in-home',
  },
  'hot-stone': {
    image: '/spa_treatment_room.jpg',
    imageAlt: 'Professional wellness treatment space for restorative massage',
    whoItMaySuit:
      'Guests who enjoy longer, deeply warming sessions with a slower rhythm.',
    whatToExpect: [
      'Warm stones used alongside hands-on techniques',
      'Extended session timing for a fuller unwind',
      'Supportive draping and private care throughout',
    ],
    locationAvailability: 'Studio preferred; in-home where available',
  },
  'aromatherapy-stress': {
    image: '/massage_therapy_booking_hero.jpg',
    imageAlt: 'Professional aromatherapy massage wellness session',
    whoItMaySuit:
      'Those who want a softer session with optional botanical scent support.',
    whatToExpect: [
      'Gentle pressure with mindful pacing',
      'Optional essential-oil blend discussion before starting',
      'A quiet close to help you transition out of the session',
    ],
    locationAvailability: 'Studio or in-home',
  },
  'sports-mobility': {
    image: '/massage_therapy_booking_hero.jpg',
    imageAlt: 'Professional mobility-focused massage therapy',
    whoItMaySuit:
      'Active professionals and athletes who want movement-oriented bodywork.',
    whatToExpect: [
      'Targeted techniques for stiff or overworked areas',
      'Optional assisted stretching where appropriate',
      'Clear communication on pressure and comfort',
    ],
    locationAvailability: 'Studio or in-home',
  },
};

const FALLBACK: Omit<MassageServicePresentation, 'service'> = {
  image: '/spa_treatment_room.jpg',
  imageAlt: 'Professional massage wellness treatment setting',
  whoItMaySuit: 'Adults seeking intentional, professional massage wellness.',
  whatToExpect: [
    'A private booking flow with clear session details',
    'Reviewed provider assignment after request',
    'Studio or in-home options where available',
  ],
  locationAvailability: 'Studio or in-home',
};

export function getMassagePresentations(): MassageServicePresentation[] {
  return MASSAGE_SERVICES.map((service) => ({
    service,
    ...(PRESENTATION[service.id] || FALLBACK),
  }));
}

export function getMassagePresentation(serviceId: string): MassageServicePresentation | undefined {
  const service = MASSAGE_SERVICES.find((s) => s.id === serviceId);
  if (!service) return undefined;
  return { service, ...(PRESENTATION[service.id] || FALLBACK) };
}

export function formatDurationOptions(minutes: number[]): string {
  return minutes.map((m) => `${m} min`).join(' · ');
}

export function bookMassageHref(serviceId?: string): string {
  return serviceId
    ? `/book-massage?service=${encodeURIComponent(serviceId)}`
    : '/book-massage';
}
