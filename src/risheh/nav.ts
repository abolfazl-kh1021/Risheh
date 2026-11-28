"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy hash-view name → real App Router URL.
 *
 * The views were migrated from the hash-router SPA 1:1; they still speak the
 * old view names (`categories/<slug>`, `product/<id>`, …). This single adapter
 * maps them to real routes — the views' design language and code stay intact.
 */

const PREFIX_MAP: Array<[RegExp, (param?: string) => string]> = [
  [/^home$/, () => "/"],
  [/^categories$/, () => "/products"],
  [/^categories\/(.+)$/, (p) => (p === "all" ? "/products" : `/c/${p}`)],
  [/^product\/(.+)$/, (p) => `/products/${p}`],
  [/^cart$/, () => "/cart"],
  [/^login$/, () => "/account/login"],
  [/^register$/, () => "/account/login?mode=register"],
  [/^dashboard$/, () => "/dashboard"],
  [/^artworks$/, () => "/dashboard/artworks"],
  [/^orders$/, () => "/orders"],
  [/^finance$/, () => "/dashboard/finance"],
  [/^lab$/, () => "/dashboard/lab"],
  [/^plans$/, () => "/plans"],
  [/^admin$/, () => "/admin"],
  [/^favorites$/, () => "/favorites"],
  [/^discounts$/, () => "/discounts"],
  [/^verify$/, () => "/verify"],
  [/^notifications$/, () => "/account/notifications"],
  [/^account$/, () => "/account"],
  [/^about$/, () => "/about"],
  [/^blog$/, () => "/blog"],
  [/^contact$/, () => "/contact"],
  [/^app$/, () => "/app"],
  [/^faq$/, () => "/faq"],
];

export function mapLegacyViewPath(to: string): string {
  const clean = to.replace(/^#\/?/, "");
  // Split a query string off (e.g. `categories/carpet?sort=cheap&q=...`).
  const qIdx = clean.indexOf("?");
  const path = qIdx >= 0 ? clean.slice(0, qIdx) : clean;
  const query = qIdx >= 0 ? clean.slice(qIdx) : "";
  for (const [re, build] of PREFIX_MAP) {
    const m = path.match(re);
    if (m) {
      const param = m[1];
      const url = build(param ? decodeURIComponent(param) : undefined);
      return `${url}${query}`;
    }
  }
  if (path.startsWith("/")) return `${path}${query}`;
  return `/${path}${query}`;
}

/** Shared navigate — pushes a REAL route (no hash routing anywhere). */
export function useAppNavigate() {
  const router = useRouter();
  return useCallback(
    (to: string) => {
      router.push(mapLegacyViewPath(to));
    },
    [router]
  );
}
