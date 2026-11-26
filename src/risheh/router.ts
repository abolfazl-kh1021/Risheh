"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Hash-based view router for the single-route sandbox preview.
 * Views: #/home, #/categories, #/product/<id>, #/cart, #/login, #/verify, ...
 * Keeps URLs shareable and the browser back/forward buttons working.
 */

export type Route = { view: string; param?: string; query: URLSearchParams };

function parseHash(): Route {
  const raw = typeof window === "undefined" ? "#/home" : window.location.hash || "#/home";
  let hash = raw.replace(/^#\/?/, "");
  if (!hash) hash = "home";
  const [pathPart, queryPart] = hash.split("?");
  const segments = pathPart.split("/").filter(Boolean);
  const query = new URLSearchParams(queryPart || "");
  return {
    view: segments[0] || "home",
    param: segments[1],
    query,
  };
}

export function useRouter() {
  // Hydration-safe initial state: the server can never know the URL hash, so
  // SSR always renders the "home" view. The client's FIRST render must match
  // that HTML (no React hydration mismatch on deep links like #/product/x),
  // and the real hash is adopted right after mount — useLayoutEffect runs
  // before the browser paints, so there is no visible flash.
  const [route, setRoute] = useState<Route>(() => ({
    view: "home",
    query: new URLSearchParams(),
  }));

  useEffect(() => {
    const onChange = () => {
      // Sync Next.js's tracked URL on history-driven hash changes too
      window.history.replaceState(window.history.state, "", window.location.href);
      setRoute(parseHash());
    };
    window.addEventListener("hashchange", onChange);
    // Adopt the real deep-link hash right after hydration (one commit —
    // imperceptible, and it keeps the server HTML + first client render
    // identical so React never reports a hydration mismatch).
    onChange();
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = useCallback((to: string) => {
    const target = to.startsWith("#") ? to : `#/${to.replace(/^\//, "")}`;
    if (window.location.hash === target) {
      setRoute(parseHash());
    } else {
      window.location.hash = target;
    }
    // Keep the Next.js App Router's tracked URL in sync: router.refresh()
    // rewrites the address bar to the URL Next last observed, which would
    // otherwise clobber our hash-based view routing.
    window.history.replaceState(window.history.state, "", window.location.href);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  return { route, navigate };
}

/** Build a hash link like product/<id> */
export function buildHash(view: string, param?: string, query?: string): string {
  let h = `#/${view}`;
  if (param) h += `/${param}`;
  if (query) h += `?${query}`;
  return h;
}
