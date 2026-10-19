# Risheh — Design System

Source: `_reference/R2/src/app/globals.css` (visual reference only — tokens transcribed here, no backend/auth/i18n/AI/seed/image-URL reuse).
Mockups: `docs/design/` (`01–56` plus `dark/`, `english/`, `mobile/` variants).

Tailwind 4 theme tokens map 1:1 to the CSS variables below (`--color-*`, `--radius-*`).

## 1. Color tokens

### Light (`:root`)

| Token | Value | Usage |
|-------|-------|-------|
| `background` | `#f6f2e9` | Page bg (warm ivory) |
| `foreground` | `#2b251b` | Body text |
| `card` / `popover` | `#fdfbf5` | Surfaces |
| `card-foreground` / `popover-foreground` | `#2b251b` | Text on surfaces |
| `primary` | `#1e4636` | Brand green (buttons, active states) |
| `primary-foreground` | `#f3efe3` | Text on primary |
| `secondary` | `#eae2d0` | Secondary surfaces |
| `secondary-foreground` | `#453b2b` | Text on secondary |
| `muted` | `#efe9da` | Muted bg |
| `muted-foreground` | `#75694f` | Muted text |
| `accent` | `#b4552d` | Terracotta accent |
| `accent-foreground` | `#fdf3e7` | Text on accent |
| `destructive` | `#a63d2f` | Errors |
| `border` | `#e0d7c2` | Borders |
| `input` | `#ddd3bd` | Input borders |
| `ring` | `#1e4636` | Focus ring |
| `gold` | `#a8842f` | Muted gold details |
| `clay` | `#b4552d` | Alias of accent |
| `cream` | `#f3efe3` | Warm highlight |
| `pine` | `#16352a` | Deep green shade |
| `success` | `#3e6b4f` | Success states |
| `chart-1…5` | `#1e4636` `#b4552d` `#b08d3e` `#71805e` `#8a5a3b` | Dashboard charts |
| `sidebar` / `sidebar-accent` | `#fdfbf5` / `#efe9da` | Sidebar surfaces |

### Dark (`.dark` — independent palette, not inverted)

| Token | Value | Usage |
|-------|-------|-------|
| `background` | `#121713` | Page bg (deep-green charcoal) |
| `foreground` | `#ece5d3` | Body text |
| `card` / `popover` | `#1a221c` | Surfaces |
| `card-foreground` / `popover-foreground` | `#ece5d3` | Text on surfaces |
| `primary` | `#93b89f` | Brand green (lightened for contrast) |
| `primary-foreground` | `#10201a` | Text on primary |
| `secondary` | `#242e26` | Secondary surfaces |
| `secondary-foreground` | `#ece5d3` | Text on secondary |
| `muted` | `#212a23` | Muted bg |
| `muted-foreground` | `#a89f8a` | Muted text |
| `accent` | `#d0794f` | Terracotta accent (lightened) |
| `accent-foreground` | `#241309` | Text on accent |
| `destructive` | `#e06b57` | Errors |
| `border` | `#2b372e` | Borders |
| `input` | `#33413a` | Input borders |
| `ring` | `#93b89f` | Focus ring |
| `gold` | `#d4b36a` | Muted gold details |
| `clay` | `#d0794f` | Alias of accent |
| `cream` | `#ece5d3` | Warm highlight |
| `pine` | `#18231c` | Deep green shade |
| `success` | `#7fb09a` | Success states |
| `chart-1…5` | `#93b89f` `#d0794f` `#d4b36a` `#71805e` `#a97b5b` | Dashboard charts |
| `sidebar` / `sidebar-accent` | `#1a221c` / `#242e26` | Sidebar surfaces |

Additional base rules: `::selection` tints with accent at 25%; `body` uses `font-feature-settings: "ss01"` and `optimizeLegibility`.

## 2. Typography

Self-host via `next/font`. One display font for headlines (per locale).

| Locale | Body | Headlines (`.font-display`) | Alt display (`.font-display-2`) |
|--------|------|-----------------------------|---------------------------------|
| `fa` (Persian) | Vazirmatn (`Tahoma`, `Segoe UI` fallback) | **Amiri** (serif, weight 700) | Vazirmatn ExtraBold (weight 800) |
| `en` (English) | Manrope (`Segoe UI` fallback) | **Fraunces** (serif, weight 600, `-0.02em` tracking) | Same as display |

- Persian body: `letter-spacing: 0`.
- Recipe: `html[lang]` scoping (`html[lang="fa"] body`, `html[lang="en"] body`, `.font-display`, `.font-display-2`).

## 3. Radius and spacing

- `--radius: 0.75rem`; `sm = radius - 4px`, `md = radius - 2px`, `lg = 0.75rem`, `xl = radius + 4px`, `2xl = radius + 12px`.
- `container-page`: `max-width: 80rem`, centered (`margin-inline: auto`), `padding-inline: 1rem` → `1.5rem` (`sm`) → `2rem` (`lg`).
- Effects: `shadow-soft`, `shadow-lift` (warm `shadow-color`); `arch-frame` (arch top for artwork imagery); `motif-lattice` (girih lattice), `motif-weave`; `scrollbar-thin`, `no-scrollbar`.
- Reduced motion: `prefers-reduced-motion` disables smooth scroll and collapses animations/transitions.

## 4. Rules (must follow)

1. **No italics on Persian text** — Persian has no italic form; use weight/size/color for emphasis.
2. **No negative letter-spacing on Persian text** — keep `letter-spacing: 0` for `fa` (including `.font-display-2`; the `-0.01em` in R2 is not carried over). Negative tracking is English-display only.
3. **Logical CSS properties only** — use `ms-*`, `pe-*`, `ps-*`, `me-*`, `text-start`/`text-end`, `start-*`/`end-*`, `margin-inline`, `padding-inline`, `inset-inline-*`. Never physical `ml-/mr-/pl-/pr-/left-/right-/text-left/text-right`.
