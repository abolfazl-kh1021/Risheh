# DESIGN_SYSTEM.md — "Persian Luxury Heritage" (preserved)

The supplied archive is the visual baseline. Tokens below were extracted verbatim
from the source pages (`about.html` tailwind config, `index.html` brand config,
`assets/fonts/*.css`, `docs/stitch/DESIGN-*.md`) and are registered in
`src/app/globals.css` as Tailwind 4 theme tokens. **Do not invent new colors or
typography.**

## 1. Palettes (two variants — both preserved)

### A. M3 tonal palette (15/16 source pages — default for all views except home)

| Token | Hex | Usage |
| --- | --- | --- |
| `primary` | `#002624` | deep Persian teal — headings, primary buttons |
| `on-primary` | `#ffffff` | text on primary |
| `primary-container` | `#0f3d3a` | top bars, admin header, hero bands |
| `on-primary-container` | `#7ca8a3` | text on primary container |
| `secondary` | `#186969` | interactive states, active tabs, links |
| `secondary-container` | `#a4ecec` / on: `#1f6d6d` | tinted badges |
| `tertiary` | `#301d00` | (container `#4c3100`) |
| `on-tertiary-container` | `#cd953d` | **antique gold** — accents, dividers, gold text |
| `tertiary-fixed` / `-dim` | `#ffddb1` / `#f8bc5f` | gold chips, highlights |
| `error` | `#ba1a1a` (container `#ffdad6`, on-container `#93000a`) | errors, scarcity |
| `background` / `surface` | `#fff8f0` | warm ivory canvas |
| `surface-container-low/…/highest` | `#fbf3e6` `#f5ede0` `#efe7da` `#e9e2d5` | card layers |
| `on-surface` / `on-surface-variant` | `#1e1b14` / `#404847` | body text / secondary text |
| `outline` / `outline-variant` | `#717977` / `#c0c8c6` | borders |
| `inverse-surface` / `inverse-on-surface` | `#343028` / `#f8f0e3` | overlays |
| fixed tones | `primary-fixed #beebe6`, `secondary-fixed #a7efef`, `tertiary-fixed #ffddb1` | badges/washes |

### B. Brand palette (`index.html` home page only)

`brand-teal #0E3B36`, `brand-darkTeal #092B27`, `brand-gold #D89E3D`,
`brand-lightGold #E7B863`, `brand-paleBg #FDF6ED`, `brand-cardBg #FFFDF9`,
`brand-darkText #2B2118`, `brand-muted #7A6B5D`, `brand-borderTone #EBDDC9`.

### Semantic accents (from design spec, used sparingly)

`--color-saffron: #f2a93b` (rating stars), `--color-pomegranate: #e5362b`
(scarcity/«تک‌نسخه» badges).

## 2. Typography — Vazirmatn (self-hosted)

Registered in `globals.css` (`@font-face`, variable weight 100–900, 3 unicode-range
files). Type scale (registered as Tailwind text tokens, e.g. `text-headline-lg`):

| Token | Size / line-height | Weight |
| --- | --- | --- |
| headline-xl | 44 / 60 (mobile 30 / 42) | 800 |
| headline-lg | 32 / 46 | 700 |
| headline-md | 22 / 34 | 700 |
| headline-sm | 18 / 28 | 600 |
| body-lg | 17 / 30 | 400 |
| body-md | 15 / 26 | 400 |
| body-sm | 13 / 22 | 400 |
| label-lg / md / sm | 15/24, 13/20, 11/16 | 600 / 500 / 500 |

## 3. Spacing & radii

- Spacing tokens: `space-xs 0.25 / sm 0.5 / md 1 / lg 1.5 / xl 2.5rem`,
  `gutter 1.5rem`, `margin 3rem` (mobile gutter `1rem`). Container: `max-w-7xl`.
- Radii: Tailwind defaults match the source config (sm .25, md .375, lg .5,
  xl .75rem); cards use `rounded-2xl`/`rounded-3xl`, pills `rounded-full`.
- Elevation (from design spec, implemented as utilities): `.elevation-1` (product
  cards), `.elevation-2` (hover/dropdowns), `.elevation-3` (modals) — warm ambient
  shadows, no harsh drops.

## 4. Signature utilities (verbatim from source CSS)

- `.craft-shadow` — home card glow + hover lift
- `.persian-gold-gradient` — 135° gold gradient (add-to-cart CTA)
- `.persian-pattern-bg` / `.persian-pattern-subtle` — dotted Persian textures
- `.ornament-line` / `.ornament-diamond` — gold ✦ diamond dividers
- `.material-symbols-outlined` — ligature icon font (`MSymbol` component wraps it;
  `filled` variant enabled)
- `.persian-arch` — Khosravani arch mask (available for hero imagery)

## 5. RTL & Persian rules (from design spec)

- `<html lang="fa" dir="rtl">` — full RTL layout, not just alignment.
- **Numerals:** Persian glyphs (`۰۱۲۳۴۵۶۷۸۹`) via `faNum()`/`faPrice()` —
  `Intl.NumberFormat('fa-IR')`; codes that users type are normalized via
  `toEnDigits()` before matching.
- **Dates:** Persian solar calendar via `Intl.DateTimeFormat('fa-IR')`
  (`faDate`, `faDateTime`).
- Currency: Toman (تومان), prices stored as integers.
- Body line-height ≥ 1.6 for Persian ascenders/descenders.
- Mixed-script text (codes like `RSH-9834`, emails, IBANs) uses `dir="ltr"`
  islands inside RTL layouts.

## 6. Component rules (faithful to source)

- **Buttons:** primary = `bg-primary text-on-primary` (hover `bg-secondary`);
  gold CTA = `.persian-gold-gradient text-tertiary-container`; heritage =
  white bg + gold border; destructive = `bg-error-container/60 text-on-error-container`.
- **Product card:** image top (4:3 or 4:5), favorite pill top-left (RTL safe zone),
  category chip + rating, verified artisan line, price with تومان, add-to-cart +
  شناسنامه buttons.
- **Status pills:** documented color mapping in `StatusPill`.
- **Inputs:** `bg-surface-container-low`, `border-outline-variant/40`,
  focus ring `ring-primary`, right-aligned text (LTR islands for codes/phones).
- **Header:** dark teal utility bar (`#0a332f`) + ivory main bar (`#fbf5eb`),
  search pill, nav with active `border-b-2 border-on-tertiary-container`.
- **Footer:** `bg-primary-container`, 4 columns + newsletter + ✦ motto row.

## 7. Fidelity checklist used per view

1. Section order and hierarchy matches the source page.
2. Colors/fonts pulled from the token tables above (no new colors).
3. Icon set = Material Symbols ligatures with the same glyph names as source.
4. Persian copy taken verbatim from extracted references (`risheh-source/refs/*.txt`).
5. Responsive behavior: mobile drawer, stacked grids, no desktop scaling artifacts.
