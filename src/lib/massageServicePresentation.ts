import type { MassageService } from '../data/mockData';

/**
 * Display-only presentation for /massage. Every word and image comes from the
 * published CMS record; nothing is invented per service id. Services with a thin
 * description simply render fewer lines rather than filler copy.
 */
export interface MassageServicePresentation {
  service: MassageService;
  image: string;
  imageAlt: string;
  whoItMaySuit: string;
  whatToExpect: string[];
  locationAvailability: string;
}

const FALLBACK_IMAGE = '/massage_therapy_booking_hero.jpg';

function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function buildMassagePresentation(service: MassageService): MassageServicePresentation {
  const lines = sentences(service.description);
  return {
    service,
    image: service.image || FALLBACK_IMAGE,
    imageAlt: service.name,
    whoItMaySuit: lines[0] ?? '',
    whatToExpect: lines.slice(0, 3),
    locationAvailability: service.category || '',
  };
}

export function buildMassagePresentations(
  services: MassageService[]
): MassageServicePresentation[] {
  return services.map(buildMassagePresentation);
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
