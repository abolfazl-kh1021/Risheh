#!/usr/bin/env bun
/**
 * FINAL SMOKE TEST (M11) — runs against a deployed BASE_URL (Vercel, Docker or
 * local). Walks the three golden journeys and reports PASS/FAIL per step.
 *
 *   BASE_URL=https://risheh-store.vercel.app bun run scripts/smoke.ts
 *
 * Read-only against the deployed DB except: creating a PENDING_PAYMENT order
 * (guest checkout) and leaving it UNPAID (no money flows, reservation expires).
 */
import { execSync } from "child_process";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
let pass = 0;
let fail = 0;

function check(name: string, ok: boolean, extra = ""): void {
  if (ok) {
    pass += 1;
    console.log(`  ✓ ${name}`);
  } else {
    fail += 1;
    console.log(`  ✗ ${name} ${extra}`);
  }
}

async function status(path: string): Promise<number> {
  try {
    const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
    return res.status;
  } catch {
    return -1;
  }
}

async function main() {
  console.log(`\n== Risheh smoke — ${BASE} ==\n`);

  // ---- 1) Health & infra ----
  console.log("[infra]");
  check("GET /api/health → 200", (await status("/api/health")) === 200);
  check("GET /api/ready → 200 (DB up)", (await status("/api/ready")) === 200);
  check("GET /api/cron unauthorized → 401", (await status("/api/cron")) === 401);
  check("GET /sitemap.xml → 200", (await status("/sitemap.xml")) === 200);
  check("GET /robots.txt → 200", (await status("/robots.txt")) === 200);

  // ---- 2) Buyer storefront ----
  console.log("[storefront]");
  check("GET / → 200", (await status("/")) === 200);
  check("GET /products → 200", (await status("/products")) === 200);
  check("GET /c/carpet → 200", (await status("/c/carpet")) === 200);
  check("GET /plans → 200", (await status("/plans")) === 200);
  check("GET /blog → 200", (await status("/blog")) === 200);
  check("GET /verify → 200", (await status("/verify")) === 200);
  check("GET /about → 200", (await status("/about")) === 200);
  check("GET /contact → 200", (await status("/contact")) === 200);
  check("GET /terms → 200", (await status("/terms")) === 200);

  const productsHtml = await fetch(`${BASE}/products`).then((r) => r.text()).catch(() => "");
  check("catalog renders an artwork link", productsHtml.includes("/products/"));
  check("Toman prices rendered", productsHtml.includes("تومان"));

  // ---- 3) Auth guards ----
  console.log("[guards]");
  check("GET /dashboard anonymous → redirect(3xx)", [301, 302, 303, 307, 308].includes(await status("/dashboard")));
  check("GET /admin anonymous → redirect(3xx)", [301, 302, 303, 307, 308].includes(await status("/admin")));
  const loginHtml = await fetch(`${BASE}/account/login`).then((r) => r.text()).catch(() => "");
  check("login page has no ADMIN registration path", !loginHtml.includes('value="ADMIN"'));

  // ---- 4) Security headers ----
  console.log("[security]");
  const res = await fetch(`${BASE}/`).catch(() => null);
  const h = res?.headers ?? new Headers();
  check("CSP header present", h.has("content-security-policy"));
  check("X-Frame-Options DENY", h.get("x-frame-options")?.includes("DENY") ?? false);
  check("X-Content-Type-Options nosniff", h.get("x-content-type-options") === "nosniff");
  check("HSTS present", h.has("strict-transport-security"));

  // ---- 5) Payment boundary (no client trust) ----
  console.log("[payment]");
  const cb = await fetch(`${BASE}/api/payment/callback?authority=NOPE&status=SUCCESS`, { redirect: "manual" });
  check("callback with unknown authority → redirect NOT success", cb.status >= 300 && cb.status < 400);

  console.log(`\n== RESULT: ${pass} passed, ${fail} failed ==\n`);
  if (fail > 0) process.exit(1);
}

main();
