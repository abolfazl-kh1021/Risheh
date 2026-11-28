"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { ViewFallback } from "@/risheh/ViewFallback";
import { useShell } from "@/risheh/shell";
import type { AppData } from "@/lib/types";

/**
 * PageView — the per-route client bridge (Phase 4 migration).
 *
 * The old RishehApp hash-router is retired. Each real route's Server Component
 * loads exactly the data it needs and renders THIS bridge with the matching
 * `view` + `route`. Views keep their existing props (data/navigate/callbacks)
 * so the visual design is preserved 1:1; navigation pushes real URLs via the
 * shell context.
 */

export type RouteLike = { view: string; param?: string; query: URLSearchParams };

/** Server pages pass a PLAIN record (URLSearchParams does not survive the
 *  server→client boundary); normalize it here once per render. */
export function toRoute(view: string, param: string | undefined, query: Record<string, string> | undefined): RouteLike {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) sp.set(k, v);
  return { view, param, query: sp };
}

const ProductView = dynamic(() => import("@/risheh/views/ProductView").then((m) => m.ProductView), { loading: () => <ViewFallback /> });
const VerifyView = dynamic(() => import("@/risheh/views/VerifyView").then((m) => m.VerifyView), { loading: () => <ViewFallback /> });
const DashboardView = dynamic(() => import("@/risheh/views/DashboardView").then((m) => m.DashboardView), { loading: () => <ViewFallback /> });
const ArtworksView = dynamic(() => import("@/risheh/views/ArtworksView").then((m) => m.ArtworksView), { loading: () => <ViewFallback /> });
const FinanceView = dynamic(() => import("@/risheh/views/FinanceView").then((m) => m.FinanceView), { loading: () => <ViewFallback /> });
const LabView = dynamic(() => import("@/risheh/views/LabView").then((m) => m.LabView), { loading: () => <ViewFallback /> });
const AdminView = dynamic(() => import("@/risheh/views/AdminView").then((m) => m.AdminView), { loading: () => <ViewFallback /> });
const FavoritesView = dynamic(() => import("@/risheh/views/FavoritesView").then((m) => m.FavoritesView), { loading: () => <ViewFallback /> });
const DiscountsView = dynamic(() => import("@/risheh/views/DiscountsView").then((m) => m.DiscountsView), { loading: () => <ViewFallback /> });

import { HomeView } from "@/risheh/views/HomeView";
import { CategoriesView } from "@/risheh/views/CategoriesView";
import { LoginView } from "@/risheh/views/LoginView";
import { CartView } from "@/risheh/views/CartView";
import { AboutView } from "@/risheh/views/AboutView";
import { BlogView } from "@/risheh/views/BlogView";
import { ContactView } from "@/risheh/views/ContactView";
import { AppView } from "@/risheh/views/AppView";
import { NotFoundView } from "@/risheh/views/NotFoundView";

export function PageView({ view, data, route: routeRaw }: { view: string; data: AppData; route: { view: string; param?: string; query: Record<string, string> | URLSearchParams } }) {
  const { navigate, onAddToCart, onToggleFavorite, isFav, refresh } = useShell();
  const route = useMemo(() => {
    if (routeRaw.query instanceof URLSearchParams) return routeRaw as RouteLike;
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(routeRaw.query ?? {})) sp.set(k, v);
    return { view: routeRaw.view, param: routeRaw.param, query: sp };
  }, [routeRaw]);
  const shared = { data, navigate, onAddToCart, onToggleFavorite, isFav, refresh, route };

  switch (view) {
    case "home":
      return <HomeView {...shared} />;
    case "categories":
      return <CategoriesView {...shared} />;
    case "product":
      return <ProductView key={route.param ?? ""} {...shared} artworkId={route.param ?? ""} />;
    case "login":
      return <LoginView {...shared} />;
    case "cart":
      return <CartView {...shared} />;
    case "verify":
      return <VerifyView />;
    case "about":
      return <AboutView />;
    case "blog":
      return <BlogView {...shared} />;
    case "contact":
      return <ContactView />;
    case "app":
      return <AppView navigate={navigate} />;
    case "dashboard":
      return <DashboardView {...shared} />;
    case "artworks":
      return <ArtworksView {...shared} />;
    case "seller-orders":
      return <SellerOrdersViewLazy data={{ user: data.user }} sellerOrders={data.sellerOrders} />;
    case "finance":
      return <FinanceView {...shared} />;
    case "lab":
      return <LabView {...shared} />;
    case "admin":
      return <AdminView {...shared} />;
    case "favorites":
      return <FavoritesView {...shared} />;
    case "discounts":
      return <DiscountsView {...shared} />;
    default:
      return <NotFoundView navigate={navigate} kind="route" />;
  }
}

// Seller orders view (Phase 3 sub-orders + timeline).
const SellerOrdersViewLazy = dynamic(() => import("@/risheh/views/SellerOrdersView").then((m) => m.SellerOrdersView), {
  loading: () => <ViewFallback />,
});
