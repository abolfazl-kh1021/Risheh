import { NextResponse, type NextRequest } from "next/server";

/**
 * Route protection (Phase 4) — coarse role guards + legacy hash-link redirects.
 *
 * NOTE: middleware is a UX layer ONLY. Every server action and data loader
 * still re-checks role/ownership server-side (getCurrentUser) — hiding or
 * redirecting is never the authorization boundary (docs/SECURITY.md §2).
 */

const GUARDS: Array<{ re: RegExp; roles: Array<"BUYER" | "ARTISAN" | "ADMIN"> }> = [
  { re: /^\/admin/, roles: ["ADMIN"] },
  { re: /^\/dashboard\/(artworks|orders|finance|lab|plans)/, roles: ["ARTISAN", "ADMIN"] },
  { re: /^\/dashboard/, roles: ["BUYER", "ARTISAN", "ADMIN"] },
  { re: /^\/account(?!\/login)/, roles: ["BUYER", "ARTISAN", "ADMIN"] },
];

/** Legacy `#/view/param` deep links → real routes (kept from the SPA era). */
function legacyHashRedirect(pathname: string): string | null {
  // Next strips the fragment client-side, but bookmarked URLs like /#/product/x
  // arrive with the hash intact in some clients — handled client-side via the
  // legacy-redirect script below. Path-based legacy aliases:
  const map: Array<[RegExp, string]> = [
    [/^\/home$/, "/"],
    [/^\/categories\/(.+)$/, "/c/$1"],
    [/^\/product\/(.+)$/, "/products/$1"],
    [/^\/artworks$/, "/dashboard/artworks"],
    [/^\/finance$/, "/dashboard/finance"],
    [/^\/lab$/, "/dashboard/lab"],
  ];
  for (const [re, to] of map) {
    if (re.test(pathname)) return pathname.replace(re, to);
  }
  return null;
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Legacy path aliases → 301 to the real route.
  const alias = legacyHashRedirect(pathname);
  if (alias) {
    const url = req.nextUrl.clone();
    url.pathname = alias;
    return NextResponse.redirect(url, 301);
  }

  // Role guards (cookie presence only — the page/action re-validates properly).
  const guard = GUARDS.find((g) => g.re.test(pathname));
  const hasSession = req.cookies.get("risheh_session")?.value;
  if (guard && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/account/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  // Security headers are also set in next.config.ts; middleware adds them for
  // all navigations including dynamic routes not matched by config matchers.
  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|assets|api/health|favicon.ico|sw.js|manifest.webmanifest).*)"],
};
