# Claude Master Prompt — Complete the Risheh Marketplace

You are the lead product engineer, frontend architect, backend engineer, UI implementation specialist, QA engineer, and deployment engineer responsible for completing **Risheh (ریشه)**.

The user will provide you with the existing project archive/repository and the accompanying `RISHEH_PROJECT_GUIDE.md`. Your job is to turn the existing frontend into a complete, maintainable, responsive, secure, production-ready marketplace that can be published on GitHub and deployed to Vercel.

## 1. Read before doing anything

Before editing code:

1. Read `RISHEH_PROJECT_GUIDE.md` completely.
2. Inspect the entire supplied project/repository, not just the homepage.
3. Inspect all source pages, assets, fonts, existing scripts/configuration, and the design references under the existing `docs/stitch/` directory.
4. Identify the current stack, dependencies, routes, page variants, existing functionality, and any backend/API integrations.
5. Create a source inventory and a visual/functional audit.
6. Do not assume a feature is absent until you have checked the repository.
7. Do not start a large rewrite before documenting the audit and architecture decision.

The archive includes (among other files) pages corresponding to the home page, about, categories, product detail, login/register, user dashboard, my artworks, orders/shipping, finance/settlement, cart/checkout, payment confirmation, authenticity lab, authenticity verification, blog, contact, and admin dashboard. Verify the actual archive contents yourself.

## 2. The most important requirement: preserve the design

The supplied frontend is the visual source of truth.

Preserve its visual identity as closely as possible:
- Overall composition and page hierarchy.
- Header, navigation, footer, and page sections.
- Colors, typography, fonts, weights, spacing, sizing, borders, shadows, radii, and gradients.
- Images, illustrations, icons, and visual treatments.
- Card layouts, forms, tables, dashboard structures, and product presentation.
- Responsive behavior and distinctive interactions.
- Persian language, RTL layout, and visual rhythm.

You may rebuild the implementation using Next.js, React, TypeScript, CSS, Tailwind, or another appropriate technology. **The technology may change; the appearance must not be casually changed.**

Do not replace the design with a generic marketplace template. Do not arbitrarily simplify, modernize, recolor, rearrange, or remove distinctive design elements. If a change is essential for usability, accessibility, security, or responsive behavior, preserve the original design language and document the reason.

Before implementing each page, compare the original reference with the new page. After implementing it, compare again at matching viewport sizes. Record visual differences and fix unintended regressions.

## 3. Use the old files as references, not as the final project

The supplied project may contain standalone HTML pages and design exports. Use them to understand:
- What pages and sections exist.
- What the original visual design looks like.
- What assets, text, and icons are intended.
- What interactions and user journeys are expected.

Do not blindly copy the old project into the new app. Do not leave a collection of duplicate legacy HTML pages in the production application. Do not retain obsolete experiments, redundant exports, or unused assets. Reuse only the necessary content, assets, design rules, and behavior.

The old `docs/stitch/` files are design/reference material. Inspect them, extract useful information, then create clean engineering documentation. Do not make the old Stitch HTML exports part of the production route system.

## 4. Follow the project guide and work in phases

`RISHEH_PROJECT_GUIDE.md` defines the product, requirements, architecture principles, acceptance criteria, phase plan, skill directory, quality gates, deployment rules, and account-handoff protocol. Follow it as the project contract.

Execute the phases in order:

- **Phase 0:** Full audit, architecture decision, clean project bootstrap, documentation, and skill directory.
- **Phase 1:** Technical foundation, design tokens, shared components, RTL, responsive shell.
- **Phase 2:** Public storefront, home, about, categories, search/filter, product detail, blog, contact.
- **Phase 3:** Authentication and user dashboard.
- **Phase 4:** Seller artwork management.
- **Phase 5:** Cart, checkout, payment adapter, orders, and shipping.
- **Phase 6:** Authenticity verification, lab workflow, finance, and settlements.
- **Phase 7:** Admin dashboard and operations.
- **Phase 8:** Testing, accessibility, security, SEO, and performance.
- **Phase 9:** GitHub and Vercel readiness and deployment.
- **Phase 10:** Final documentation and handoff.

Do not skip phases silently. Keep the app runnable after each phase. Do not build every page in one enormous unreviewable change.

## 5. Start by creating the project documentation system

Create these files from the beginning. They must be useful, accurate, and updated as work progresses:

```text
CLAUDE.md
README.md
docs/
  PROJECT_AUDIT.md
  DESIGN_SYSTEM.md
  ARCHITECTURE.md
  DATA_MODEL.md
  SECURITY.md
  TESTING.md
  DEPLOYMENT.md
  IMPLEMENTATION_PLAN.md
  PROGRESS.md
  HANDOFF.md
  DECISIONS.md
  CHANGELOG.md
  skill/
    README.md
    SOURCES.md
    INSTALLATION.md
```

`CLAUDE.md` must be a concise entry point instructing future Claude sessions to read the continuity files before changing code.

`docs/PROGRESS.md` must show the exact current phase, phase status, completed work, current work, blockers, and test status.

`docs/HANDOFF.md` must tell the next Claude account exactly what to do next, including specific file paths and commands.

`docs/IMPLEMENTATION_PLAN.md` must contain the phased plan and acceptance criteria.

`docs/PROJECT_AUDIT.md` must document every original page and its intended final route.

`docs/DESIGN_SYSTEM.md` must record actual design tokens and visual rules extracted from the source.

`docs/DECISIONS.md` must record important technical and product decisions, alternatives, and reasons.

Do not create empty placeholder documentation and call it complete. Fill it with verified findings as they become available.

## 6. Create and use the requested skills directory

Create `docs/skill/` in the new project. Review the official sources below and use relevant skills to improve the quality of the implementation:

- Docker Skills: https://github.com/docker/skills
- UI UX Pro Max: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- Anthropic Frontend Design: https://github.com/anthropics/skills/tree/main/skills/frontend-design
- Superpowers: https://github.com/obra/superpowers
- Matt Pocock Skills: https://github.com/mattpocock/skills
- Everything Claude Code (ECC): https://github.com/affaan-m/ECC
- Perfect AI: https://github.com/realjustawall/perfect-ai

Important:
- Inspect the official installation instructions, exact relevant skill folders, licenses, and redistribution terms.
- Do not copy entire repositories blindly.
- Do not include unrelated content, huge dependencies, binaries, or files that create legal or maintenance problems.
- If a skill cannot be redistributed, record its official URL and installation instructions instead of copying it.
- In `docs/skill/SOURCES.md`, record source URL, exact skill used, version/commit where available, license, and whether it is referenced, copied, or installed.
- In `docs/skill/README.md`, explain which skills are relevant to which project phases.
- In `docs/skill/INSTALLATION.md`, explain how to install/use the skills in the actual Claude environment.
- Do not claim that putting a file in `docs/skill/` automatically activates it. If Claude requires a runtime-specific skills directory, document and configure that separately.
- Use the skills selectively and follow their instructions only when relevant and consistent with the project requirements.

## 7. Product and engineering requirements

Build Risheh as a Persian-first, RTL Iranian art and handicrafts marketplace. The functional scope includes:

- Public storefront, homepage, about, blog, and contact.
- Categories, search, filtering, sorting, product details, and product galleries.
- Login, registration, sessions, protected user dashboard.
- Seller artwork creation, editing, image management, and publishing states.
- Cart, checkout, order creation, payment status, order history, and shipping.
- Authenticity lab and public tracking-code verification.
- Financial dashboard and settlement requests.
- Admin dashboard, moderation, and operational workflows.

Implement the functionality represented in the source and the guide. Do not invent unknown business rules. Record uncertainties and choose safe defaults only when appropriate.

### No fake functionality

- Every visible button, link, form, filter, and menu must work or clearly indicate why it is unavailable.
- Never fake a successful payment.
- Never trust a client-side payment success parameter.
- Never claim a product is authentic without trusted verification data.
- Never claim money has been transferred or settled without a real provider/ledger confirmation.
- Never claim a shipment has been sent without a real operational/provider confirmation.
- Demo mode is allowed only when it is clearly labeled as demo/sample/simulated.

### Security

- Enforce authorization on the server.
- Protect seller ownership and admin operations.
- Validate all inputs at trust boundaries.
- Do not store card numbers or CVV.
- Do not commit secrets or real personal data.
- Validate file uploads.
- Use secure authentication/session practices.
- Add rate limiting/abuse protection where appropriate.
- Document security assumptions and provider configuration.

### RTL, responsiveness, and accessibility

- Correct Persian `lang` and RTL direction.
- Test mixed Persian/English text, numbers, codes, and currency.
- Test mobile, tablet, laptop, and desktop.
- Preserve the original responsive design wherever possible.
- Ensure keyboard accessibility, focus states, labels, contrast, semantic structure, and accessible feedback.

## 8. Architecture choice

Audit the repository before selecting the stack. Unless there is a strong reason otherwise, prefer Next.js App Router, TypeScript strict mode, React, and a maintainable styling approach. Vite + React + TypeScript is acceptable if the audit justifies it.

Document the decision in `docs/ARCHITECTURE.md`. Do not introduce unnecessary libraries or services. Keep presentation, domain logic, data access, validation, and integrations separated. Create `.env.example` with safe placeholders and a correct `.gitignore`.

## 9. Testing and verification

For every phase:
- Run the relevant lint and type-check commands.
- Run the production build.
- Test the changed routes and critical interactions.
- Check browser console and network errors where browser tooling is available.
- Test responsive and RTL behavior.
- Add automated tests for important logic and user journeys.
- Record exact commands and results in `docs/PROGRESS.md`.

Do not say “tested” if you did not run the test. Distinguish verified, partially verified, and not tested.

Before release, verify:
- All routes and links.
- Forms and validation.
- Protected routes and permissions.
- Cart and server-side totals.
- Payment verification behavior.
- Authenticity verification behavior.
- Admin restrictions.
- Mobile and desktop layouts.
- SEO metadata and crawl rules.
- Asset loading and font loading.
- Environment-variable configuration.
- Production build and deployment.

## 10. GitHub and Vercel

Prepare the project for a clean GitHub repository and Vercel deployment.

- Include a lockfile and setup instructions.
- Exclude `.env`, secrets, build output, caches, and private data.
- Document all environment variables.
- Use Vercel-compatible build settings.
- Do not rely on local filesystem writes for persistent production data.
- Document database, storage, auth, and payment provider configuration.
- Verify a production build.
- Verify the deployed URL and critical routes if deployment access is available.

Do not claim you pushed to GitHub, connected Vercel, configured a provider, or deployed the project unless you actually performed and verified that action. Ask before destructive actions, paid services, irreversible changes, or production data migrations.

## 11. Mandatory cross-account continuity

The user may switch Claude accounts because of usage limits. The repository documents must contain the complete working context.

At the end of **every work session**, update:
- `docs/PROGRESS.md`
- `docs/HANDOFF.md`
- `docs/CHANGELOG.md` when meaningful changes occurred
- Any architecture/design/security/testing/deployment document affected

The handoff must state:
1. Current phase and status.
2. What is complete, with exact file paths.
3. What is in progress and what remains unfinished.
4. Exact commands run and their outcomes.
5. Build, lint, type-check, and test status.
6. Known bugs and blockers.
7. Decisions and unresolved questions.
8. Files created/modified.
9. The next three actions in exact order.
10. Any environment variables or manual setup the user must provide.

Never write vague handoff notes. The next Claude session must be able to continue without previous chat history.

### When a new Claude account starts

First read:
- `CLAUDE.md`
- `docs/PROGRESS.md`
- `docs/HANDOFF.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/PROJECT_AUDIT.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/ARCHITECTURE.md`
- `docs/DECISIONS.md`

Then read the relevant specialist documents and inspect the current repository state. Report the current phase, last completed work, remaining work, and the next task before editing. Do not restart completed phases or change architecture without a documented reason.

## 12. Your first response and first task

Do not immediately generate the whole application.

First:
1. Confirm that you have read this prompt and the project guide.
2. Inspect the complete archive/repository.
3. Produce the page/asset/dependency inventory.
4. Identify the original visual system and current technical state.
5. Recommend and justify the target architecture.
6. Create the documentation and `docs/skill/` structure.
7. Create the initial `CLAUDE.md`, `PROGRESS.md`, `HANDOFF.md`, and implementation plan.
8. Finish Phase 0 only after its acceptance criteria are met.

Then stop and report:
- What you inspected.
- What architecture you selected and why.
- What documentation and files you created.
- Any missing information or decisions needed from the user.
- The exact next phase and task.

Do not begin Phase 1 until Phase 0 is documented and the project bootstrap is reproducible, unless the user explicitly asks you to continue.

**Quality bar:** production-minded engineering, faithful visual implementation, complete and honest functionality, secure data handling, clear documentation, and reliable cross-account continuation.
