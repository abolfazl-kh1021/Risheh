# RISHEH — Complete Project Engineering & Delivery Guide

> **Purpose:** This document is the source of truth for completing Risheh from the supplied frontend archive into a maintainable, production-ready web application that can be versioned on GitHub and deployed to Vercel.
>
> **Language:** All project documentation, code comments where useful, commit messages, and developer-facing UI copy should be in English unless the product itself requires Persian. The customer-facing Risheh experience is Persian-first and RTL.

---

## 1. Mission and non-negotiable requirements

Build a complete, polished, responsive marketplace for discovering, buying, selling, and authenticating Iranian art and handicrafts.

The supplied archive is a **reference source**, not the final application structure. It contains existing frontend pages, assets, fonts, and Stitch/design reference files. Audit it carefully before implementation.

### Absolute requirements

1. **Preserve the existing visual identity.** The supplied pages are the visual baseline. Preserve their layout, composition, colors, typography, spacing, component styling, imagery, iconography, responsive behavior, and interaction patterns wherever they are intentional and usable.
2. **Do not preserve bad architecture merely to preserve appearance.** Rebuild with any appropriate modern stack. Prefer maintainability, accessibility, performance, security, and deployment reliability.
3. **Do not blindly copy the archive into the final application.** Extract and reuse only the meaningful design system, assets, content, page requirements, and working behavior. Do not leave duplicate legacy HTML pages, obsolete experiments, unused files, or the old `docs/stitch` implementation in the production source tree.
4. **Do not redesign without cause.** No arbitrary visual refresh, theme replacement, generic template substitution, or removal of distinctive elements. If a design change is necessary, document the reason and keep the result visually faithful.
5. **Implement real functionality, not decorative buttons.** Every visible action must work, navigate correctly, validate input, or clearly communicate that a capability is unavailable. Do not fake successful payments, identity verification, shipping, or financial transfers.
6. **Build in small, verifiable phases.** Do not attempt a risky one-shot rewrite. Keep the application runnable after every phase.
7. **Make the repository handoff-safe.** Another Claude account must be able to continue by reading a small, clearly named set of project documents without relying on the previous chat.
8. **Keep secrets out of Git.** Use environment variables, `.env.example`, and deployment documentation. Never commit credentials, API keys, private tokens, real customer data, or production secrets.
9. **Do not claim production readiness until checks pass.** Build, lint, type checks, tests, route checks, accessibility checks, and deployment configuration must be verified and recorded.

---

## 2. Product overview

### Product name

**Risheh** (ریشه)

### Product concept

A Persian-first online marketplace focused on Iranian art, handmade works, and traditional crafts. The product should help buyers discover and purchase authentic works, help creators and sellers manage their collections and orders, and provide a trustworthy authenticity-verification experience.

### Main audiences

- Visitors browsing artworks and crafts.
- Buyers and collectors.
- Artists, artisans, and sellers.
- Administrators and operations staff.
- Users checking an artwork's authenticity or tracking code.

### Core product areas

- Public storefront and editorial content.
- Categories, search, filtering, and product detail pages.
- Authentication and user account.
- Cart, checkout, payment result, and order history.
- Seller artwork management.
- Shipping and order management.
- Financial dashboard and settlement requests.
- Authenticity laboratory and public verification.
- Admin dashboard and moderation/operations.
- Contact and informational pages.

### Product truthfulness

The app may run in a clearly labeled demo/development mode when real providers are not configured. Demo mode must never be presented as a real bank payment, verified identity, completed shipment, or actual financial settlement. Clearly separate mock data from real data.

---

## 3. Source archive audit

The supplied archive is named `Risheh.rar`. The initial archive inventory indicates the following main pages:

- `index.html`
- `about.html`
- `categories.html`
- `product-details.html`
- `login-register.html`
- `user-dashboard.html`
- `my-artworks.html`
- `orders-shipping.html`
- `finance-settlement.html`
- `cart-checkout.html`
- `payment-confirm.html`
- `authenticity-lab.html`
- `authenticity-verify.html`
- `blog.html`
- `contact.html`
- `admin-dashboard.html`

It also contains `assets/` with images and fonts, a `docs/stitch/` directory containing design/reference HTML and design notes, and project helper files.

**Important:** Treat this inventory as a starting point, not as a complete specification. Inspect every file in the actual archive. The exact contents, interactions, links, assets, responsive behavior, and dependencies must be verified directly.

### Required audit procedure

1. List every file and directory.
2. Identify the actual source pages versus duplicate design exports and experiments.
3. Inspect all pages at desktop and mobile widths.
4. Record each page's layout, sections, reusable components, colors, typography, assets, and interactions.
5. Identify broken links, nonfunctional controls, placeholder content, duplicated markup, inconsistent page variants, and missing states.
6. Inspect all assets. Create an asset inventory with filename, dimensions, format, intended use, and whether it is actually used.
7. Inspect fonts and icon sources. Preserve the intended Persian font and icon treatment when licensing and technical constraints permit.
8. Inspect `README.md`, `.gitignore`, startup scripts, and any existing project configuration.
9. Produce `docs/PROJECT_AUDIT.md` and `docs/DESIGN_SYSTEM.md` before major implementation.
10. Record uncertainties rather than inventing answers.

### Legacy files policy

- Existing HTML and Stitch exports are reference material only.
- Do not put duplicate legacy page implementations into the final app.
- Do not delete or overwrite the supplied source archive outside the working project.
- Keep only assets that are used or deliberately retained for documented future use.
- The final `docs/` directory must contain useful engineering documentation, not a dump of the old design exports.
- If a reference screenshot or original file is essential for visual comparison, retain it in a clearly named `docs/reference/` directory only when useful and reasonably sized.

---

## 4. Recommended technical architecture

Claude must first audit the source and then select a coherent stack. Do not mix frameworks or introduce dependencies without a reason.

### Preferred default

Unless the audit reveals a compelling reason otherwise, use:

- **Next.js** with App Router.
- **TypeScript** with strict mode.
- **React**.
- **Tailwind CSS** or a well-structured CSS Modules/design-token approach. Preserve the original appearance; do not migrate styling mechanically if it harms fidelity.
- A reusable component system with clear domain boundaries.
- A schema validation library such as Zod where useful.
- A test stack suitable for the chosen framework (unit/component tests and Playwright for critical end-to-end journeys).
- Vercel-compatible build and deployment configuration.

A Vite + React + TypeScript architecture is acceptable if it is demonstrably more suitable for the existing application. Explain the decision in `docs/ARCHITECTURE.md`.

### Architecture principles

- Separate presentation, domain logic, data access, validation, and integrations.
- Prefer server components/server-side logic where appropriate; use client components only for interactive behavior.
- Avoid giant components and giant files.
- Avoid duplicated page markup.
- Use typed domain models and predictable error handling.
- Keep reusable UI components independent of business-specific data fetching.
- Centralize routes, permissions, configuration, and validation rules.
- Use semantic HTML and accessible interaction patterns.
- Do not add a state-management library unless actual complexity justifies it.
- Do not add a database or paid service without documenting the need, setup, cost implications, and fallback.

### Suggested structure

Adapt this to the selected stack; do not force it if the framework requires a different convention.

```text
risheh/
├── app/                         # Routes, layouts, loading/error/not-found states
├── components/
│   ├── ui/                      # Reusable primitives
│   ├── layout/                  # Header, footer, navigation, shell
│   ├── storefront/              # Public marketplace components
│   ├── product/                 # Product detail and product cards
│   ├── account/                 # Account/dashboard components
│   ├── seller/                  # Seller workflows
│   ├── checkout/                # Cart and checkout
│   ├── authenticity/            # Authenticity workflows
│   └── admin/                   # Admin-only components
├── features/                    # Domain features and use cases
├── lib/                         # Shared utilities, configuration, helpers
├── services/                    # External service adapters
├── data/                        # Seed/demo data only, if appropriate
├── types/                       # Shared domain types
├── public/
│   └── assets/                  # Curated production assets
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── skill/
│   ├── PROJECT_AUDIT.md
│   ├── DESIGN_SYSTEM.md
│   ├── ARCHITECTURE.md
│   ├── DATA_MODEL.md
│   ├── SECURITY.md
│   ├── TESTING.md
│   ├── DEPLOYMENT.md
│   ├── IMPLEMENTATION_PLAN.md
│   ├── PROGRESS.md
│   ├── HANDOFF.md
│   ├── DECISIONS.md
│   └── CHANGELOG.md
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## 5. Visual fidelity and design system

Visual preservation is a release requirement, not a vague preference.

### Establish a visual baseline

Before rebuilding a page:

- Capture or inspect the original desktop and mobile rendering.
- Record viewport size and relevant state.
- Identify the exact page sections and hierarchy.
- Identify fonts, font weights, colors, spacing, borders, shadows, radii, imagery, and icon sizes.
- Record hover, focus, active, disabled, loading, empty, error, and success states.
- Note RTL behavior and alignment.

### Design tokens

Create centralized tokens for:

- Brand and semantic colors.
- Background and surface colors.
- Text and muted text.
- Borders and separators.
- Typography families, sizes, weights, and line heights.
- Spacing scale.
- Border radii.
- Shadows.
- Container widths and breakpoints.
- Z-index layers.
- Motion duration and easing.

Tokens must be derived from the supplied design, not invented from a generic template.

### RTL and Persian

- Set the appropriate document language and direction (`fa` and `rtl`) for Persian-facing pages.
- Ensure layout direction is correct, not merely text alignment.
- Test mixed Persian/English strings, numbers, dates, currency, product codes, and URLs.
- Use appropriate Persian numerals or Latin numerals consistently with the original design and product requirements.
- Use a consistent currency and formatting strategy. Do not silently assume a currency where the product specification is unclear.
- Ensure forms, tables, menus, breadcrumbs, icons, carousels, and directional controls behave correctly in RTL.
- Keep English technical documentation LTR.

### Responsive behavior

At minimum validate:

- Small mobile: 320–375 px.
- Common mobile: 390–430 px.
- Tablet: 768 px.
- Laptop: 1024–1280 px.
- Desktop: 1440 px and wider.

Do not simply scale down desktop layouts. Define sensible mobile navigation, stacking, card grids, tables, dialogs, and form behavior while preserving the design language.

### Accessibility

- Keyboard-accessible navigation and controls.
- Visible focus states.
- Correct labels and accessible names.
- Sufficient contrast.
- Semantic headings and landmarks.
- Useful alternative text for meaningful images.
- No keyboard traps.
- Reduced-motion support.
- Accessible validation and status messages.
- Dialog focus management.

---

## 6. Functional scope and acceptance criteria

Implement all relevant pages found in the source audit. The following is the expected functional scope. If a feature is absent from the source or its business rules are unknown, document the uncertainty and implement only a safe, coherent baseline.

### 6.1 Public storefront

- Landing page with the original hero, navigation, featured collections, categories, editorial sections, and footer.
- About, contact, and blog pages.
- Search and category discovery.
- Responsive navigation and mobile menu.
- Clear loading, empty, and error states.
- Internal links must resolve.

### 6.2 Categories and product discovery

- Category listing and navigation.
- Product cards with image, title, price where applicable, and meaningful metadata.
- Search, filtering, and sorting controls that actually affect results.
- Pagination or a documented load-more strategy.
- Empty results and reset-filter behavior.
- Query parameters should preserve shareable search/filter state where appropriate.

### 6.3 Product detail

- Product gallery with usable image selection.
- Product information, description, seller/creator information, category, price, availability, and authenticity details when present in the source.
- Add-to-cart behavior with feedback.
- Quantity and stock validation if quantity is applicable.
- Related products if supported by the source data.
- Clear unavailable/out-of-stock behavior.
- Never fabricate certification, provenance, or seller claims.

### 6.4 Authentication and account

- Registration, sign-in, sign-out, and session behavior.
- Client and server-side validation as appropriate.
- Password handling must never be implemented insecurely.
- Protected account routes.
- Useful unauthorized, expired-session, and error states.
- If no real authentication provider is configured, provide a clearly marked local/demo adapter, not a fake production login.
- Document the selected provider and required environment variables.

### 6.5 User dashboard

- Account overview.
- Profile details and editable fields where supported.
- Order summary and navigation to order details.
- Artwork and seller links where applicable.
- Empty states for new users.

### 6.6 Seller artwork management

- Artwork list and detail/edit flow.
- Create, edit, draft, publish, and archive states where supported.
- Image upload validation and preview.
- Required-field validation.
- Price and category validation.
- Ownership checks on every protected operation.
- Clear review/moderation status if applicable.
- Do not allow one seller to edit another seller's work.

### 6.7 Cart and checkout

- Add, remove, and update cart items.
- Persist cart appropriately for the chosen architecture.
- Validate product availability and prices on the server before creating an order.
- Show order summary, shipping information, and totals.
- Do not trust client-submitted prices or totals.
- Provide clear validation and recoverable errors.
- Prevent duplicate order submission where feasible.

### 6.8 Payment result

- Payment integration must use a real provider only after credentials and provider requirements are supplied.
- Never store card numbers, CVV, or sensitive payment credentials.
- Verify payment status server-side using the provider's supported verification mechanism.
- Handle success, failure, cancellation, pending, and retry states.
- A URL query parameter or client-side flag must never be sufficient proof of payment.
- In demo mode, label the flow clearly as simulated and do not imply that money moved.

### 6.9 Orders and shipping

- Order list and order detail.
- Status timeline with clear labels.
- Shipping address and tracking information when available.
- Seller/admin permissions for status changes.
- Validate status transitions.
- Do not invent tracking numbers or claim a shipment was dispatched without provider/operational confirmation.

### 6.10 Financial dashboard and settlements

- Display only values derived from the configured data source.
- Explain pending, available, and settled balances.
- Validate settlement requests and permissions.
- Keep a transaction/audit trail if real financial functionality is implemented.
- Never simulate a real transfer or promise settlement.
- In demo mode, label all amounts and actions as sample data.

### 6.11 Authenticity laboratory and verification

- Public verification form for a tracking/reference code.
- Validate input and show clear not-found, invalid, pending, and verified states.
- A verified result must come from trusted stored data or an authorized verification service.
- Do not mark arbitrary user-entered codes as authentic.
- Admin/lab workflow must be permission-protected.
- Record who changed verification status and when, if backed by a real data store.
- Clearly distinguish “not found” from “proven counterfeit.”

### 6.12 Admin dashboard

- Admin-only access enforced on the server, not only by hiding navigation.
- Overview metrics based on real data or clearly labeled demo data.
- User, artwork, order, authenticity, and moderation workflows where supported.
- Destructive actions require confirmation.
- Validate every privileged operation.
- Log important administrative changes.
- Never rely on client-side role values as authorization.

### 6.13 Blog and contact

- Blog listing and article detail if content exists.
- Contact form with validation, success/error feedback, and spam protection appropriate to the chosen backend.
- Do not claim a message was sent if no delivery provider is configured.
- Add metadata and share previews where appropriate.

---

## 7. Data, backend, and integration strategy

First determine whether the archive contains an existing backend, API, database, or provider configuration. Do not assume none exists without checking.

If no backend exists:

1. Propose a minimal data architecture that supports the product.
2. Choose a database/auth/storage provider only after documenting trade-offs.
3. Prefer adapters so the UI is not tightly coupled to a single vendor.
4. Use migrations or a reproducible schema process.
5. Add seed/demo data that is obviously non-production.
6. Document local setup and production environment variables.
7. Keep the app usable in local development without exposing secrets.

### Candidate entities

Adjust after the source audit:

- User
- UserProfile
- Role / Permission
- Artist or SellerProfile
- Artwork / Product
- Category
- ProductImage
- Cart / CartItem
- Order / OrderItem
- Address
- Shipment / TrackingEvent
- PaymentAttempt / PaymentRecord
- SettlementRequest / LedgerEntry
- AuthenticityRecord / VerificationEvent
- BlogPost
- ContactMessage
- AuditLog

### Data integrity

- Use stable IDs.
- Define relationships and deletion behavior.
- Validate data at trust boundaries.
- Use server-side authorization.
- Avoid storing duplicate derived values unless necessary.
- Document monetary precision and currency.
- Add indexes for common queries where applicable.
- Never commit real personal data in seed files.

---

## 8. Security, privacy, and reliability

Create `docs/SECURITY.md` and address at least:

- Authentication and authorization boundaries.
- Role-based access rules.
- Server-side validation.
- Secure session/cookie configuration.
- Password hashing/provider responsibilities.
- CSRF protection where relevant.
- XSS prevention and safe rendering.
- SQL/NoSQL injection prevention through safe data access.
- File upload type, size, and content validation.
- Rate limiting for sensitive/public endpoints.
- Abuse protection for login, contact, and verification forms.
- Secrets and environment-variable handling.
- Dependency updates and vulnerability review.
- Logging without passwords, tokens, payment data, or unnecessary personal data.
- Backup and recovery expectations if persistent data is used.
- Data retention/deletion considerations.
- Admin audit logging.

Do not claim compliance with a legal or security standard without an actual review.

---

## 9. SEO, performance, and production quality

### SEO

- Unique page titles and descriptions.
- Canonical URLs where appropriate.
- Open Graph metadata.
- Sitemap and robots rules.
- Structured data only when accurate.
- Descriptive image alt text.
- Clean URLs.
- Correct indexing behavior for private account/admin pages (normally noindex).
- Persian metadata and RTL rendering for public Persian pages.

### Performance

- Optimize and appropriately size images.
- Use modern image delivery where supported.
- Avoid shipping unnecessary client JavaScript.
- Lazy-load below-the-fold imagery when appropriate.
- Avoid layout shifts.
- Use caching deliberately.
- Minimize unused dependencies.
- Check Core Web Vitals where practical.

### Production behavior

- No console errors.
- No broken routes or missing assets.
- No exposed secrets.
- No fake payment or authenticity success.
- Useful 404, loading, and error states.
- Correct Vercel build configuration.
- Production environment variables documented.
- No dependence on a local development server or local filesystem for persistent production data.

---

## 10. Required skills directory

Create this directory in the new project:

```text
docs/skill/
```

It must be a real, useful skill reference area, not an empty folder or a claim that skills were installed.

### Skill sources requested by the project owner

1. Docker Skills — https://github.com/docker/skills
2. UI UX Pro Max — https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
3. Anthropic Frontend Design — https://github.com/anthropics/skills/tree/main/skills/frontend-design
4. Superpowers — https://github.com/obra/superpowers
5. Matt Pocock Skills — https://github.com/mattpocock/skills
6. Everything Claude Code (ECC) — https://github.com/affaan-m/ECC
7. Perfect AI — https://github.com/realjustawall/perfect-ai

### Skill handling rules

- Inspect the official repositories and their current installation/use instructions.
- Confirm each skill's license and redistribution terms before copying its files into the project.
- Do not blindly copy entire repositories, huge dependency trees, binaries, or unrelated content.
- Do not claim a skill is active merely because its URL is listed.
- Keep a manifest at `docs/skill/README.md` listing source URL, exact skill/folder used, version or commit if available, license, installation/use instructions, and whether it is copied, referenced, or installed elsewhere.
- If a source is not suitable for redistribution, keep a reference and installation instructions rather than copying its contents.
- Put only the relevant, permitted skill files under `docs/skill/`.
- If the agent platform requires skills in a runtime-specific location (for example, a Claude skills directory), document that location and how `docs/skill/` maps to it. Do not pretend `docs/skill/` automatically activates skills.
- Use skills selectively: frontend-design for visual quality, UI UX Pro Max for design-system review, Superpowers for disciplined implementation/testing workflows, Docker skills only if containerization is useful, and other skills only where relevant.
- Check skill instructions for conflicts with this project guide and security requirements. This project guide and user requirements take priority.

### Required skill index structure

```text
docs/skill/
├── README.md
├── SOURCES.md
├── INSTALLATION.md
└── <permitted-relevant-skill-folders>/
```

---

## 11. Phased implementation plan

Claude must execute these phases in order. Do not silently skip a phase. If a phase is not applicable, document why.

### Phase 0 — Intake, audit, and project bootstrap

**Goal:** Understand the archive and create the project operating system before building.

Tasks:
- Inspect the complete archive.
- Record all pages, assets, dependencies, and design references.
- Identify current framework and whether any backend exists.
- Select architecture and justify it.
- Create the clean project structure.
- Create all required documentation files listed in this guide.
- Create `docs/skill/` and its manifest/installation guide.
- Create `.gitignore`, `.env.example`, and a useful README.
- Set up lint, formatting, type-check, and build scripts.
- Create the initial progress and handoff files.

Deliverables:
- `docs/PROJECT_AUDIT.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/ARCHITECTURE.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/PROGRESS.md`
- `docs/HANDOFF.md`
- `docs/DECISIONS.md`
- `docs/skill/README.md`
- `docs/skill/SOURCES.md`
- `docs/skill/INSTALLATION.md`
- Runnable project scaffold.

Acceptance:
- Every supplied page has been accounted for.
- No major implementation begins before the audit and visual baseline exist.
- `npm install` and the initial development/build commands are documented and reproducible.

### Phase 1 — Foundation and design system

**Goal:** Build the reusable application foundation without losing the visual identity.

Tasks:
- Configure framework, TypeScript, styling, linting, formatting, and aliases.
- Add fonts, curated assets, and design tokens.
- Implement global layout, RTL support, responsive containers, header, footer, navigation, buttons, inputs, cards, dialogs, badges, tables, and feedback components as required by the source.
- Add loading, error, empty, and not-found patterns.
- Establish route conventions and shared metadata.

Acceptance:
- The application runs.
- Shared components are reusable and typed.
- RTL and responsive foundations work.
- Visual comparison against the original reference has been performed.

### Phase 2 — Public storefront and discovery

**Goal:** Complete public-facing browsing.

Implement:
- Home
- About
- Categories
- Product listing/search/filter/sort
- Product detail
- Blog
- Contact

Acceptance:
- All public routes work.
- Links and filters behave correctly.
- Responsive and visual checks are recorded.
- No dead buttons or placeholder navigation remain.

### Phase 3 — Authentication and user account

Implement:
- Login/register
- Session handling
- Protected account area
- User dashboard
- Profile basics
- Appropriate empty/error/unauthorized states

Acceptance:
- Protected routes are enforced on the server.
- Validation works.
- Demo mode is clearly labeled if real auth is not configured.

### Phase 4 — Seller workflows

Implement:
- My artworks
- Create/edit artwork
- Image management
- Draft/publish/review states as supported
- Seller ownership and permission checks

Acceptance:
- CRUD operations work against the selected data adapter.
- Unauthorized edits are rejected server-side.
- Upload validation is implemented or clearly documented as pending provider configuration.

### Phase 5 — Cart, checkout, payment, orders, and shipping

Implement:
- Cart
- Checkout
- Order creation
- Payment adapter and result states
- Order history/details
- Shipping/tracking workflows

Acceptance:
- Server verifies prices and availability.
- Duplicate submissions are handled.
- Payment is not considered successful without provider verification.
- Demo payment is unmistakably simulated.

### Phase 6 — Authenticity and financial operations

Implement:
- Authenticity lab
- Public authenticity verification
- Verification event history
- Financial dashboard
- Settlement request workflow

Acceptance:
- Verification is based on trusted data.
- Financial data is not fabricated.
- Privileged actions are protected and auditable.
- Demo states are labeled.

### Phase 7 — Admin and operations

Implement:
- Admin dashboard
- User/artwork/order management as supported
- Moderation
- Authenticity review
- Operational status changes
- Audit logs

Acceptance:
- Server-side admin authorization.
- Confirmation for destructive actions.
- Every operation validates input and permission.

### Phase 8 — Quality, security, SEO, and performance

Tasks:
- Unit and integration tests.
- Critical end-to-end tests.
- Responsive regression checks.
- Accessibility review.
- Security review.
- SEO metadata, sitemap, robots, and social metadata.
- Image and bundle optimization.
- Dependency review.
- Error/loading/empty state review.
- Remove unused assets and dependencies.

Acceptance:
- All available quality checks pass.
- Known limitations are recorded.
- No critical broken route, security issue, or fake success flow remains.

### Phase 9 — GitHub and Vercel deployment

Tasks:
- Verify `.gitignore` and secret handling.
- Ensure `.env.example` contains names and safe placeholders only.
- Document Git initialization and GitHub push.
- Configure Vercel project/build settings.
- Configure production environment variables.
- Verify deployment build and deployed routes.
- Verify assets, fonts, RTL, and responsive behavior on the live deployment.
- Document domain setup and rollback/redeploy process.

Acceptance:
- Clean clone can install and build.
- GitHub repository contains source and documentation, not secrets or generated junk.
- Vercel deployment succeeds.
- Production smoke tests pass.
- `docs/DEPLOYMENT.md` is accurate.

### Phase 10 — Final handoff

Tasks:
- Update all documentation.
- Update progress, handoff, changelog, known issues, and next steps.
- Provide a concise final report.
- List all environment variables and which are required/optional.
- List any provider accounts or manual configuration still needed.
- Confirm what is real, what is demo, and what remains incomplete.

Acceptance:
- A new developer or Claude account can continue without access to previous chat history.
- No task is marked complete unless it has been verified.

---

## 12. Cross-account continuity protocol (critical)

This project may be continued in a different Claude account because of usage limits. The project repository must be the memory.

### Files that must always be maintained

- `CLAUDE.md` — concise top-level instructions for any Claude session.
- `docs/PROGRESS.md` — current phase, completed tasks, in-progress work, blockers, test status.
- `docs/HANDOFF.md` — exact instructions for the next session.
- `docs/IMPLEMENTATION_PLAN.md` — phase definitions and acceptance criteria.
- `docs/DECISIONS.md` — architectural/product decisions and reasons.
- `docs/CHANGELOG.md` — meaningful changes by phase.
- `docs/PROJECT_AUDIT.md` — source archive findings.
- `docs/DESIGN_SYSTEM.md` — visual rules and fidelity notes.
- `docs/ARCHITECTURE.md` — technical structure and conventions.

### End-of-session update requirements

Before stopping, Claude must update:

1. Current phase and phase status.
2. Completed tasks with paths/files.
3. In-progress tasks and exact unfinished details.
4. Commands run and their results.
5. Tests/build/lint/type-check status.
6. Known bugs and blockers.
7. Decisions made and unresolved questions.
8. Files changed or created.
9. Next three concrete actions in execution order.
10. Any new environment variables or manual setup requirements.

Do not write vague notes such as “continue frontend.” Name exact files, routes, components, errors, and next actions.

### Starting a new Claude account

The user should provide the new account with:

**Always send:**
1. `CLAUDE.md`
2. `docs/PROGRESS.md`
3. `docs/HANDOFF.md`
4. `docs/IMPLEMENTATION_PLAN.md`
5. `docs/PROJECT_AUDIT.md`
6. `docs/DESIGN_SYSTEM.md`
7. `docs/ARCHITECTURE.md`

**Also send when relevant:**
- `docs/DECISIONS.md` — always recommended; required when architecture or product decisions are active.
- `docs/SECURITY.md` — before auth, payment, uploads, admin, or deployment work.
- `docs/DATA_MODEL.md` — before database or domain-data work.
- `docs/TESTING.md` — before quality/testing work.
- `docs/DEPLOYMENT.md` — before GitHub/Vercel work.
- `docs/skill/README.md`, `SOURCES.md`, and `INSTALLATION.md` — when the new account needs skill setup or use.
- The exact source files relevant to the next task, not the entire project archive by default.

If Claude has access to the connected Git repository or the user provides the complete project folder, it should read the repository directly. Do not ask the user to upload every source file individually when the repository is already available.

### New-session opening instruction

The first action in every new session must be to read the continuity files and inspect the current repository state. Claude must report:
- What phase the project is in.
- What was last completed.
- What remains.
- Which files it needs to inspect for the next task.
- The single next implementation task.

Do not restart the project, regenerate completed phases, replace the design, or change architecture without a documented reason and explicit approval.

---

## 13. GitHub and Vercel operating rules

### Git

- Use meaningful commits grouped by phase or coherent feature.
- Never commit `.env`, secrets, build outputs, caches, local databases, or private uploads.
- Keep `.gitignore` appropriate to the selected stack.
- Add a useful root README with setup, scripts, stack, and deployment notes.
- Ensure lockfile is committed.
- Do not force-push or rewrite shared history without explicit approval.

### Vercel

- Confirm the selected framework is supported.
- Set the correct root directory and build settings.
- Configure environment variables separately for Development, Preview, and Production as needed.
- Ensure database/storage/auth providers allow the deployed domains.
- Do not depend on local filesystem writes for persistent data.
- Test preview deployments before production when possible.
- Verify production URL after deployment.
- Keep secrets in Vercel project settings, never in source code.
- If a provider requires callback URLs, document exact locations for the user to configure.

### User approval boundaries

Claude may prepare code and documentation. It must not claim to have created a GitHub repository, pushed code, connected Vercel, configured external accounts, or deployed the site unless those actions were actually performed and verified. Ask for approval before destructive actions, paid services, irreversible changes, or production data migrations.

---

## 14. Definition of done

The project is complete only when all applicable items are verified:

- [ ] Every source page has a documented final route or documented reason for exclusion.
- [ ] Original visual identity is preserved and checked at desktop/mobile sizes.
- [ ] Persian RTL behavior is correct.
- [ ] All navigation and visible controls work.
- [ ] Forms validate and show accessible feedback.
- [ ] Authentication and protected routes are implemented safely or explicitly marked demo-only.
- [ ] Seller ownership and admin permissions are enforced server-side.
- [ ] Cart and order totals are validated server-side.
- [ ] Payment success is provider-verified or clearly simulated.
- [ ] Authenticity results are backed by trusted records or clearly demo-only.
- [ ] Financial figures and settlement states are trustworthy or clearly demo-only.
- [ ] No critical console errors or broken assets.
- [ ] Tests, lint, type checks, and production build pass.
- [ ] Accessibility and responsive checks are recorded.
- [ ] SEO metadata and crawl rules are configured.
- [ ] Secrets are absent from the repository.
- [ ] `.env.example` and setup instructions are complete.
- [ ] `docs/skill/` has a truthful source/license/use manifest.
- [ ] GitHub setup is documented and verified.
- [ ] Vercel deployment is documented and verified.
- [ ] `PROGRESS.md`, `HANDOFF.md`, `CHANGELOG.md`, and README are current.
- [ ] A new Claude account can continue from the repository documents alone.

---

## 15. Final instruction to Claude

Treat this document as the project contract. Work carefully, inspect before changing, preserve the visual design, implement real behavior, test every phase, document decisions, and maintain cross-account continuity.

**Never sacrifice visual fidelity for convenience. Never sacrifice security or data integrity for a superficial demo. Never mark unverified work as complete.**
