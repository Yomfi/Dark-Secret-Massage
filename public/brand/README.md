# Massager Studio brand assets

Derived from the approved official logo JPEG (raster — not a vector original).

| File | Purpose |
|------|---------|
| `massager-studio-logo-source.jpg` | Source artwork |
| `massager-studio-logo.png` | Transparent mark (white keyed out; black + gold preserved) |
| `massager-studio-logo-on-dark.png` | Reversed mark for dark surfaces when a light plate is impractical |
| `favicon-16.png` / `favicon-32.png` / `favicon-48.png` | Favicons — tightly framed symbol on warm off-white |
| `apple-touch-icon.png` / `icon-512.png` | Touch / PWA icons from the same symbol |

**Do not** invent lettermarks (e.g. “MS” text icons). Always regenerate from the source JPEG.

## Extracted colours

| Role | Hex |
|------|-----|
| Gold | `#B08B4B` |
| Gold light | `#C9A56A` |
| Gold dark | `#8F6D35` |
| Near-black / ink | `#161616` |
| Off-white | `#F7F4EF` |
| Cream | `#FAF7F2` |
| Surface | `#0B0B0C` |

Tokens live in `src/lib/brand.ts` and `@theme` in `src/index.css`.
