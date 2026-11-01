# Risheh — Phase-by-Phase Claude Prompts

Use these prompts **one phase at a time**. Always attach/provide `CLAUDE_MASTER_PROMPT.md`, `RISHEH_PROJECT_GUIDE.md`, and the current project repository. At the beginning of a new Claude account, also provide the continuity files listed in `docs/HANDOFF.md`.

Do not ask Claude to execute all phases in one request.

---

## Prompt 0 — Audit and bootstrap

Read `CLAUDE_MASTER_PROMPT.md` and `RISHEH_PROJECT_GUIDE.md` completely. Inspect the entire existing Risheh project/archive, including every HTML page, asset, font, script, config file, and `docs/stitch/` reference. Do not begin a broad rewrite.

Complete Phase 0 only:
- Inventory all source files, pages, assets, dependencies, links, and existing functionality.
- Map every original page to its intended final route.
- Document the original visual system and responsive behavior.
- Identify the existing stack and any backend/provider integrations.
- Recommend and justify the target architecture.
- Create the clean project scaffold and all required documentation files.
- Create `docs/skill/` and its truthful source/license/installation manifest for the seven requested skill repositories.
- Create/update `CLAUDE.md`, `.gitignore`, `.env.example`, `README.md`, `docs/PROGRESS.md`, and `docs/HANDOFF.md`.
- Do not copy legacy pages or Stitch exports into the production app.

Run the available bootstrap, lint, type-check, and build commands. Record exact results. Stop after Phase 0 and report the audit, architecture decision, created files, unresolved questions, and the exact next task. Do not start Phase 1 until Phase 0 acceptance criteria are met.

## Prompt 1 — Foundation and design system

Read the continuity documents and inspect the current repository state. Confirm that Phase 0 is complete. Implement Phase 1 only.

Build the framework foundation, strict typing, styling setup, design tokens extracted from the original pages, Persian font setup, RTL foundation, responsive layout primitives, shared header/footer/navigation, and reusable UI components needed by the audited routes. Add loading, error, empty, and not-found patterns.

Preserve the original design. Compare the new shared shell with the source at matching desktop and mobile viewport sizes. Do not invent a new visual identity. Keep the application runnable. Run lint, type checks, tests, and production build; record exact results. Update `PROGRESS.md`, `HANDOFF.md`, `CHANGELOG.md`, and relevant architecture/design docs. Stop and report Phase 1 completion and the next phase.

## Prompt 2 — Public storefront and discovery

Read continuity files and confirm Phase 1 status. Implement Phase 2 only, based on the audit and original visual references.

Complete the homepage, about page, categories, product discovery, search, filtering, sorting, product detail/gallery, blog, and contact pages that exist in the source scope. Ensure all links, filters, menus, and controls work. Add loading, empty, error, and responsive states. Preserve original content hierarchy, imagery, typography, colors, and RTL behavior.

Do not invent product claims, authenticity certificates, seller details, or business policies. Use clearly labeled seed data only if no real data source exists. Run relevant tests, lint, type checks, and production build. Update progress and handoff documents with exact files and next actions. Stop after Phase 2.

## Prompt 3 — Authentication and user account

Read continuity files and inspect the current implementation. Implement Phase 3 only.

Complete login, registration, sign-out, session behavior, protected account routes, profile basics, and the user dashboard according to the source audit. First inspect for an existing authentication integration. If none exists, recommend a provider and document setup requirements; use a clearly labeled local/demo adapter only when needed. Never implement insecure password storage or pretend demo authentication is production authentication.

Enforce protected routes and authorization on the server where applicable. Add validation, accessible feedback, loading, error, expired-session, and unauthorized states. Preserve the supplied UI. Test both authorized and unauthorized journeys. Update progress, handoff, security, and architecture docs. Stop after Phase 3.

## Prompt 4 — Seller artwork management

Read continuity files and inspect current routes/data model. Implement Phase 4 only.

Complete seller artwork listing, create, edit, draft/publish/review states where supported, image preview/upload flow, form validation, and ownership checks. Inspect existing backend/storage before selecting integrations. Validate file type, size, and content safely. Enforce seller ownership on the server; hiding buttons is not authorization.

Do not invent moderation or publishing policies. Document unknown rules and safe assumptions. Preserve the original seller/dashboard design. Test create/edit/list flows and attempts to access another seller's artwork. Update progress, handoff, data model, security, and changelog. Stop after Phase 4.

## Prompt 5 — Cart, checkout, payment, orders, and shipping

Read continuity files and inspect the current cart/order architecture. Implement Phase 5 only.

Complete cart add/remove/update, checkout form, address handling where supported, server-side order creation, payment adapter/result states, order history/detail, and shipping/tracking workflows. Recalculate product prices, stock, discounts, shipping, and totals on the server; never trust client-submitted totals. Prevent duplicate order creation where feasible.

Use a real payment provider only when the user has supplied/configured the necessary account and credentials. Verify payment server-side using the provider's documented mechanism. Never treat a client redirect or query parameter as proof of payment. If provider credentials are absent, build a clearly labeled simulated demo adapter and explain that no money is transferred. Do not fabricate shipment/tracking events.

Preserve the source design and test success, failure, cancellation, pending, retry, invalid cart, and duplicate submission states. Update progress, handoff, security, data model, and deployment docs. Stop after Phase 5.

## Prompt 6 — Authenticity and financial operations

Read continuity files and inspect existing authenticity/finance references and data structures. Implement Phase 6 only.

Complete the authenticity laboratory workflow, public tracking/reference-code verification, verification states, financial dashboard, transaction display, and settlement request flow supported by the source. Verification must rely on trusted records or an authorized service. A missing code is not proof of counterfeit. Financial balances must come from a trustworthy data source or be clearly marked as demo/sample data. Never claim a real settlement or transfer without confirmation.

Enforce permissions and audit important changes. Preserve the original visual design. Test verified, pending, invalid, not-found, and error cases, plus unauthorized access. Update progress, handoff, data model, security, and changelog. Stop after Phase 6.

## Prompt 7 — Admin and operations

Read continuity files and inspect roles, permissions, and current admin UI. Implement Phase 7 only.

Complete admin dashboard and the supported user, artwork, order, authenticity, moderation, and operational workflows. Enforce admin permissions on the server for every privileged action. Add confirmation for destructive actions, input validation, audit logging, and useful empty/error states. Do not trust client-side role values. Do not create operational capabilities or business policies that are not supported by the source or approved requirements.

Preserve the original admin dashboard design. Test non-admin denial, admin access, validation, destructive-action confirmation, and audit records. Update progress, handoff, security, testing, and changelog. Stop after Phase 7.

## Prompt 8 — Quality, security, SEO, and performance

Read continuity files and inspect the entire implemented application. Implement Phase 8 only; do not redesign pages unnecessarily.

Run and improve:
- Unit and integration tests.
- Critical Playwright/end-to-end journeys.
- Responsive regression checks at mobile, tablet, laptop, and desktop sizes.
- Persian RTL and mixed-script checks.
- Keyboard and screen-reader accessibility basics.
- Security review of auth, authorization, uploads, public endpoints, admin, payment, and secrets.
- SEO metadata, canonical URLs, sitemap, robots, Open Graph, and structured data only where accurate.
- Image, font, bundle, and loading performance.
- Console errors, broken routes, missing assets, and unused dependencies.

Fix issues found and record anything that cannot be verified. Do not mark tests as passed unless they were actually run. Update `docs/TESTING.md`, `docs/SECURITY.md`, `docs/PROGRESS.md`, `docs/HANDOFF.md`, and `docs/CHANGELOG.md`. Stop after Phase 8 with a prioritized remaining-issues list.

## Prompt 9 — GitHub and Vercel deployment

Read continuity files and `docs/DEPLOYMENT.md`. Implement Phase 9 only.

Prepare a clean GitHub repository and Vercel deployment:
- Verify project scripts, lockfile, build command, output settings, root directory, and `.gitignore`.
- Ensure no secrets, `.env` files, private user data, generated output, or local-only dependencies are committed.
- Verify `.env.example` and document every required/optional variable.
- Document database, auth, storage, payment, email, and callback URL configuration where applicable.
- Ensure production persistence does not rely on local filesystem writes.
- Verify a clean install and production build.
- If authorized tools/access are available, perform GitHub/Vercel actions only with the user's approval where needed; verify the result before claiming success.
- Otherwise provide exact, beginner-friendly Git commands and Vercel dashboard steps.

Test deployed routes, fonts, assets, RTL, and critical flows if a deployment exists. Never invent a repository URL or deployment URL. Update `docs/DEPLOYMENT.md`, progress, handoff, and changelog. Stop after Phase 9.

## Prompt 10 — Final audit and handoff

Read all continuity documents and inspect the final repository. Complete Phase 10 only.

Verify the Definition of Done in `RISHEH_PROJECT_GUIDE.md`. Check every original source page against its final route or documented exclusion. Review visual fidelity, functionality, security, tests, build, SEO, responsiveness, RTL, skills manifest, GitHub readiness, and Vercel readiness.

Update README, `CLAUDE.md`, `docs/PROGRESS.md`, `docs/HANDOFF.md`, `docs/CHANGELOG.md`, and all affected technical documents. Clearly classify each feature as production-connected, demo-only, partially implemented, or not implemented. List exact remaining manual steps, environment variables, provider accounts, and known issues.

Do not claim deployment or production readiness if any critical acceptance criteria are unverified. Provide a concise final report with verified evidence and exact next steps.

---

## Reusable instruction for any interrupted phase or new Claude account

I am continuing the existing Risheh project in a new Claude session. Do not restart the project.

First read `CLAUDE.md`, `docs/PROGRESS.md`, `docs/HANDOFF.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/PROJECT_AUDIT.md`, `docs/DESIGN_SYSTEM.md`, `docs/ARCHITECTURE.md`, and `docs/DECISIONS.md`. Then inspect the actual repository state and the files named in the handoff.

Tell me:
1. The current phase and its status.
2. What is already completed (verify against the code).
3. What is incomplete or blocked.
4. Which exact files you need to inspect.
5. The single next task you recommend.

Continue only from the recorded state. Do not redo completed work, change the design, or change architecture without a documented reason. After completing the next coherent unit of work, run relevant checks and update `PROGRESS.md` and `HANDOFF.md`.
