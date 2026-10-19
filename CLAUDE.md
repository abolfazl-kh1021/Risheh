# Risheh (ریشه): Agent Instructions

Read `docs/PROJECT_BRIEF.md` for the full brief. This file is the short version.

## Stack
Next.js App Router, TypeScript, Tailwind 4, shadcn/ui, PostgreSQL, Prisma, next-intl (URL-based /fa and /en), next-themes, Auth.js, Zod

## Working Rules
- Work ONLY on the step I request, then stop and wait.
- Before any large change, summarize your plan and wait for approval.
- Do not change architecture or the stack without a valid reason.
- Keep commits small, using conventional prefixes: feat / fix / docs / chore.
- No decorative buttons or dead links. Every interaction must work.
- Never expose API keys or secrets in client code.
- AI features and payments must have a clearly labeled demo mode.
  Never present fabricated output as real AI analysis or a real payment.
- Use properly licensed placeholder images (Unsplash/Pexels), relevant to each product.
- `_reference/R2` is a visual reference only. Never copy its backend, auth, i18n runtime, AI layer, seed data or image URLs.

## Product
Bilingual marketplace (Persian RTL / English LTR) for artworks and
handcrafted products, with light and dark themes.

## Design Identity
- Light: warm cream/ivory backgrounds, deep forest green primary,
  terracotta accents, muted gold details
- Dark: charcoal or very dark green, its own palette (not inverted)
- Fonts: Vazirmatn or Estedad (Persian), Manrope or Inter (English),
  plus one display font for headlines
- Editorial layouts, generous whitespace, subtle Persian motifs
- Avoid generic e-commerce templates and heavy effects

## Quality
- All text in translation files, never hardcoded
- Accessible (keyboard, alt text, contrast), responsive, SEO metadata
- Respect prefers-reduced-motion

## Engineering Rules
- Security and data integrity come before speed.
- Never trust the client: validate on the server, calculate prices on the server.
- Do not over-engineer. Every technology added must have a clear reason.
- The project must be understandable and defensible in a technical interview.
- Document assumptions and important decisions.