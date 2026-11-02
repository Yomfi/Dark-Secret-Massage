import type { MassageTherapist } from './bookingAndMatchmaking';

/**
 * Public catalogue types. Data always arrives from the API: there is no
 * module-level registry that another page must populate first.
 */
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

export type { MassageTherapist };

export function getServiceById(
  services: MassageService[],
  serviceId: string
): MassageService | undefined {
  return services.find((service) => service.id === serviceId);
}
