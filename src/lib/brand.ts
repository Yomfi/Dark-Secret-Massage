/**
 * Massager Studio brand tokens — restored Purple & Black identity.
 *
 * Palette recovered from the branding that preceded the gold update
 * (commit 9842c25^): purple-600 primary, purple-500 hover, purple-700 links,
 * purple-950 deep accents, near-black #060608 surfaces and #e4e4e9 text.
 */
export const BRAND = {
  name: 'Massager Studio',
  purple: '#9333ea',
  purpleLight: '#a855f7',
  purpleDark: '#6d28d9',
  purpleDeep: '#3b0764',
  lavender: '#f3e8ff',
  lavenderSoft: '#faf5ff',
  ink: '#161616',
  surface: '#060608',
  surfaceElevated: '#0c0c12',
  offwhite: '#f5f2fa',
  /** Paths under /public — derived from massager-studio-logo-source.jpg */
  logo: '/brand/massager-studio-logo.png',
  logoOnDark: '/brand/massager-studio-logo-on-dark.png',
  favicon: '/favicon.svg',
  favicon32: '/favicon-32.png',
  appleTouchIcon: '/apple-touch-icon.png',
} as const;

export type BrandLogoVariant = 'default' | 'onDark' | 'plate';
