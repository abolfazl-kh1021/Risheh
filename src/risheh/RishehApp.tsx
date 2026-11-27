"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useToast } from "@/hooks/use-toast";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { PwaProvider } from "@/components/pwa/PwaProvider";
import { useRouter as useHashRouter } from "@/risheh/router";
import { addToCartAction, toggleFavoriteAction } from "@/lib/actions/cart";
import { logoutAction } from "@/lib/actions/auth";
import type { AppData, ArtworkDTO } from "@/lib/types";
import { withCanonicalCategories } from "@/lib/categories";
import { ViewFallback } from "@/risheh/ViewFallback";

import { HomeView } from "@/risheh/views/HomeView";
import { CategoriesView } from "@/risheh/views/CategoriesView";
import { LoginView } from "@/risheh/views/LoginView";
import { CartView } from "@/risheh/views/CartView";
import { AboutView } from "@/risheh/views/AboutView";
import { BlogView } from "@/risheh/views/BlogView";
import { ContactView } from "@/risheh/views/ContactView";
import { AppView } from "@/risheh/views/AppView";
import { NotFoundView } from "@/risheh/views/NotFoundView";

// Heavy / rarely-visited views are code-split: their JS ships on demand,
// keeping the initial bundle focused on the storefront shell (PERFORMANCE.md §5).
const ProductView = dynamic(
  () => import("@/risheh/views/ProductView").then((m) => m.ProductView),
  { loading: () => <ViewFallback /> }
);
const PaymentView = dynamic(
  () => import("@/risheh/views/PaymentView").then((m) => m.PaymentView),
  { loading: () => <ViewFallback /> }
);
const VerifyView = dynamic(
  () => import("@/risheh/views/VerifyView").then((m) => m.VerifyView),
  { loading: () => <ViewFallback /> }
);
const DashboardView = dynamic(
  () => import("@/risheh/views/DashboardView").then((m) => m.DashboardView),
  { loading: () => <ViewFallback /> }
);
const ArtworksView = dynamic(
  () => import("@/risheh/views/ArtworksView").then((m) => m.ArtworksView),
  { loading: () => <ViewFallback /> }
);
const OrdersView = dynamic(
  () => import("@/risheh/views/OrdersView").then((m) => m.OrdersView),
  { loading: () => <ViewFallback /> }
);
const FinanceView = dynamic(
  () => import("@/risheh/views/FinanceView").then((m) => m.FinanceView),
  { loading: () => <ViewFallback /> }
);
const LabView = dynamic(
  () => import("@/risheh/views/LabView").then((m) => m.LabView),
  { loading: () => <ViewFallback /> }
);
const AdminView = dynamic(
  () => import("@/risheh/views/AdminView").then((m) => m.AdminView),
  { loading: () => <ViewFallback /> }
);
const FavoritesView = dynamic(
  () => import("@/risheh/views/FavoritesView").then((m) => m.FavoritesView),
  { loading: () => <ViewFallback /> }
);
const DiscountsView = dynamic(
  () => import("@/risheh/views/DiscountsView").then((m) => m.DiscountsView),
  { loading: () => <ViewFallback /> }
);

export function RishehApp({ data: rawData }: { data: AppData }) {
  // Guarantee all eight canonical categories are present (see lib/categories.ts).
  const data = useMemo<AppData>(
    () => ({ ...rawData, categories: withCanonicalCategories(rawData.categories) }),
    [rawData]
  );
  const hashRouter = useHashRouter();
  const { route, navigate } = hashRouter;
  const router = useRouter();
  const { toast } = useToast();
  const [pendingPayment, setPendingPayment] = useState<{
    orderNumber: string;
    authority: string;
    amount: number;
    subtotal?: number;
    discount?: number;
    shipping?: number;
  } | null>(null);
  // Server-verified payment outcome held in memory (the server action response —
  // never a client-crafted URL parameter).
  const [paymentResult, setPaymentResult] = useState<{
    orderNumber: string;
    status: string;
    refNumber?: string;
    message: string;
    amount: number;
  } | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.location.hash) {
      window.location.hash = "#/home";
    }
  }, []);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const view = route.view;

  const handleStartPayment = useCallback(
    (p: {
      orderNumber: string;
      authority: string;
      amount: number;
      subtotal?: number;
      discount?: number;
      shipping?: number;
    }) => {
      setPaymentResult(null);
      setPendingPayment(p);
    },
    []
  );

  const handleAddToCart = useCallback(
    async (artworkId: string) => {
      const res = await addToCartAction({ artworkId, quantity: 1 });
      if (res.ok) {
        toast({ title: "سبد خرید", description: res.message ?? "به سبد افزوده شد." });
        refresh();
      } else {
        toast({ title: "خطا", description: res.error, variant: "destructive" });
      }
    },
    [toast, refresh]
  );

  // ---- Optimistic favorites (PERFORMANCE.md item 16) ----
  // The heart flips instantly; the server call reconciles in the background.
  // On failure the override is rolled back and an error toast is shown.
  const [favOverrides, setFavOverrides] = useState<Record<string, boolean>>({});
  const favorites = useMemo(() => new Set(data.favorites ?? []), [data.favorites]);
  const inFlight = useRef(new Set<string>());

  const isFav = useCallback(
    (id: string) => (id in favOverrides ? favOverrides[id] : favorites.has(id)),
    [favorites, favOverrides]
  );

  const handleToggleFavorite = useCallback(
    async (artworkId: string) => {
      if (inFlight.current.has(artworkId)) return;
      inFlight.current.add(artworkId);
      const current = isFav(artworkId);
      setFavOverrides((o) => ({ ...o, [artworkId]: !current })); // optimistic flip
      try {
        const res = await toggleFavoriteAction(artworkId);
        if (res.ok) {
          toast({ title: "علاقه‌مندی‌ها", description: res.message });
          refresh(); // server truth lands with the refreshed snapshot
        } else {
          setFavOverrides((o) => ({ ...o, [artworkId]: current })); // rollback
          toast({ title: "ورود لازم است", description: res.error, variant: "destructive" });
        }
      } catch {
        setFavOverrides((o) => ({ ...o, [artworkId]: current })); // rollback
        toast({
          title: "خطا",
          description: "تغییر علاقه‌مندی ناموفق بود؛ دوباره تلاش کنید.",
          variant: "destructive",
        });
      } finally {
        inFlight.current.delete(artworkId);
      }
    },
    [isFav, toast, refresh]
  );

  const handleLogout = useCallback(async () => {
    await logoutAction();
    toast({ title: "خروج", description: "از حساب خود خارج شدید." });
    navigate("home");
    refresh();
  }, [toast, navigate, refresh]);

  const handleSearch = useCallback(
    (q: string) => {
      navigate(`categories/all?q=${encodeURIComponent(q)}`);
    },
    [navigate]
  );

  const shared = {
    data,
    navigate,
    onAddToCart: handleAddToCart,
    onToggleFavorite: handleToggleFavorite,
    isFav,
    refresh,
    route,
  };

  // Guard payment view without pending payment
  useEffect(() => {
    if (view === "payment" && !pendingPayment && !route.param) {
      navigate("cart");
    }
  }, [view, pendingPayment, route.param, navigate]);

  const renderView = () => {
    switch (view) {
      case "home":
        return <HomeView {...shared} />;
      case "categories":
        return <CategoriesView {...shared} />;
      case "product":
        // key resets gallery/tab/qty state when switching between artworks
        return <ProductView key={route.param ?? ""} {...shared} artworkId={route.param ?? ""} />;
      case "login":
        return <LoginView {...shared} />;
      case "cart":
        return <CartView {...shared} onStartPayment={handleStartPayment} />;
      case "payment":
        return (
          <PaymentView
            data={data}
            navigate={navigate}
            pending={pendingPayment}
            result={paymentResult}
            refresh={refresh}
            param={route.param}
            onVerified={setPaymentResult}
          />
        );
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
      case "orders":
        return <OrdersView {...shared} />;
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
        // Unknown route → branded 404 page (search-404 requirement)
        return <NotFoundView navigate={navigate} kind="route" />;
    }
  };

  const bareLayout = view === "login" || (view === "payment" && !pendingPayment);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader
        user={data.user}
        cartCount={data.cart.reduce((s, c) => s + c.quantity, 0)}
        categories={data.categories}
        activeView={view}
        onNavigate={navigate}
        onSearch={handleSearch}
        onLogout={handleLogout}
      />
      {/* The header is `sticky` (in normal flow), so no top padding is needed — this
          removes the old fixed-height offset that let the header cover the category bar. */}
      <main className={bareLayout ? "flex-1 min-w-0" : "flex-1 min-w-0 pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0"}>
        {renderView()}
      </main>
      {!bareLayout && (
        <MobileTabBar
          user={data.user}
          cartCount={data.cart.reduce((s, c) => s + c.quantity, 0)}
          activeView={view}
          onNavigate={navigate}
        />
      )}
      <PwaProvider />
      {!bareLayout && (
        <SiteFooter
          onNavigate={navigate}
          categories={data.categories.map((c) => ({ slug: c.slug, title: c.title }))}
        />
      )}
    </div>
  );
}
