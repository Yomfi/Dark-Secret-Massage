/**
 * Massager Studio brand tokens extracted from the official logo JPEG.
 * Source artwork: public/brand/massager-studio-logo-source.jpg (raster, not vector).
 *
 * EXTRACTED_GOLD  #B08B4B  (avg ink sample from gold accent stroke)
 * EXTRACTED_INK   #161616  (avg near-black from the symbol)
 */
export const BRAND = {
  name: 'Massager Studio',
  gold: '#B08B4B',
  goldLight: '#C9A56A',
  goldDark: '#8F6D35',
  ink: '#161616',
  surface: '#0B0B0C',
  surfaceElevated: '#121214',
  offwhite: '#F7F4EF',
  cream: '#FAF7F2',
  /** Paths under /public */
  logo: '/brand/massager-studio-logo.png',
  logoOnDark: '/brand/massager-studio-logo-on-dark.png',
} as const;

export type BrandLogoVariant = 'default' | 'onDark' | 'plate';
