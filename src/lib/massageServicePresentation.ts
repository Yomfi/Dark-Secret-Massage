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
    image: '/images/services/deep-tissue.jpg',
    imageAlt: 'Massage therapist working on a client’s upper back during a deep tissue session',
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
    image: '/images/services/swedish.jpg',
    imageAlt: 'Private treatment room with two prepared massage beds and warm window light',
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
    image: '/images/services/hot-stone.jpg',
    imageAlt: 'Close view of prepared massage beds with rolled towels in a warm treatment room',
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
    image: '/images/services/aromatherapy.jpg',
    imageAlt: 'Calm, warmly lit lounge with candlelight where aromatherapy sessions begin',
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
    image: '/images/services/sports-mobility.jpg',
    imageAlt: 'Close-up of a therapist applying focused pressure to shoulder muscles',
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
  image: '/images/services/swedish.jpg',
  imageAlt: 'Professional massage wellness treatment setting',
  whoItMaySuit: 'Adults seeking intentional, professional massage wellness.',
  whatToExpect: [
    'A private booking flow with clear session details',
    'Reviewed provider assignment after request',
    'Studio or in-home options where available',
  ],
  locationAvailability: 'Studio or in-home',
};

export function buildMassagePresentations(
  services: MassageService[]
): MassageServicePresentation[] {
  return services.map((service) => ({
    service,
    ...(PRESENTATION[service.id] || FALLBACK),
  }));
}

export function getMassagePresentations(): MassageServicePresentation[] {
  return buildMassagePresentations(MASSAGE_SERVICES);
}

export function getMassagePresentation(serviceId: string): MassageServicePresentation | undefined {
  const service = MASSAGE_SERVICES.find((s) => s.id === serviceId);
  if (!service) return undefined;
  return { service, ...(PRESENTATION[service.id] || FALLBACK) };
}

export function formatDurationOptions(minutes: number[]): string {
  return minutes.map((m) => `${m} min`).join(' · ');
}

/** Compact form for cards: "60 · 90 · 120 min". */
export function formatDurationSummary(minutes: number[]): string {
  return `${minutes.join(' · ')} min`;
}

export function bookMassageHref(serviceId?: string): string {
  return serviceId
    ? `/book-massage?service=${encodeURIComponent(serviceId)}`
    : '/book-massage';
}
