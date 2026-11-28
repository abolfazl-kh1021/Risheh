"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { PwaProvider } from "@/components/pwa/PwaProvider";
import { addToCartAction, toggleFavoriteAction } from "@/lib/actions/cart";
import { logoutAction } from "@/lib/actions/auth";
import type { ShellData } from "@/lib/types";
import { useAppNavigate, mapLegacyViewPath } from "@/risheh/nav";
import { markNotificationsReadAction } from "@/lib/actions/notifications";

/**
 * The storefront shell — real App Router chrome (Phase 4).
 *
 * Replaces the SPA's RishehApp wrapper: same header/footer/tab bar, same
 * callbacks, but navigation pushes REAL routes and each page fetches only its
 * own data (the loadAppData monolith is gone).
 */

type ShellContextValue = {
  shell: ShellData;
  navigate: (to: string) => void;
  refresh: () => void;
  onAddToCart: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  isFav: (id: string) => boolean;
  favorites: string[];
  activeView: string;
};

const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used inside ShellProvider");
  return ctx;
}

const VIEW_BY_PATH: Array<[RegExp, string]> = [
  [/^\/$/, "home"],
  [/^\/products\/[^/]+$/, "product"],
  [/^\/products$/, "categories"],
  [/^\/c\//, "categories"],
  [/^\/cart$/, "cart"],
  [/^\/account\/login$/, "login"],
  [/^\/dashboard\/artworks$/, "artworks"],
  [/^\/dashboard\/orders$/, "orders"],
  [/^\/dashboard\/finance$/, "finance"],
  [/^\/dashboard\/lab$/, "lab"],
  [/^\/dashboard\/plans$/, "plans"],
  [/^\/dashboard$/, "dashboard"],
  [/^\/orders/, "orders"],
  [/^\/admin/, "admin"],
  [/^\/favorites$/, "favorites"],
  [/^\/discounts$/, "discounts"],
  [/^\/verify$/, "verify"],
  [/^\/blog/, "blog"],
  [/^\/about$/, "about"],
  [/^\/contact$/, "contact"],
  [/^\/app$/, "app"],
  [/^\/plans$/, "plans"],
  [/^\/artisans\//, "artisan"],
  [/^\/track$/, "track"],
];

export function ShellProvider({ shell, children }: { shell: ShellData; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const navigate = useAppNavigate();
  const { toast } = useToast();
  const [favOverrides, setFavOverrides] = useState<Record<string, boolean>>({});
  const inFlight = useRef(new Set<string>());

  const activeView = useMemo(() => {
    for (const [re, view] of VIEW_BY_PATH) {
      if (re.test(pathname)) return view;
    }
    return "home";
  }, [pathname]);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

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

  const isFav = useCallback(
    (id: string) => (id in favOverrides ? favOverrides[id] : false),
    [favOverrides]
  );

  const handleToggleFavorite = useCallback(
    async (artworkId: string) => {
      if (inFlight.current.has(artworkId)) return;
      inFlight.current.add(artworkId);
      const current = isFav(artworkId);
      setFavOverrides((o) => ({ ...o, [artworkId]: !current }));
      try {
        const res = await toggleFavoriteAction(artworkId);
        if (res.ok) {
          toast({ title: "علاقه‌مندی‌ها", description: res.message });
          refresh();
        } else {
          setFavOverrides((o) => ({ ...o, [artworkId]: current }));
          toast({ title: "ورود لازم است", description: res.error, variant: "destructive" });
        }
      } catch {
        setFavOverrides((o) => ({ ...o, [artworkId]: current }));
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

  const ctx = useMemo<ShellContextValue>(
    () => ({
      shell,
      navigate,
      refresh,
      onAddToCart: handleAddToCart,
      onToggleFavorite: handleToggleFavorite,
      isFav,
      favorites: [],
      activeView,
    }),
    [shell, navigate, refresh, handleAddToCart, handleToggleFavorite, isFav, activeView]
  );

  return (
    <ShellContext.Provider value={ctx}>
      {children}
    </ShellContext.Provider>
  );
}

/** The chrome (header/tab bar/footer) — rendered by the storefront layout. */
export function ShellChrome({ children }: { children: ReactNode }) {
  const { shell, navigate, refresh, activeView } = useShell();
  const { toast } = useToast();
  const bareLayout = activeView === "login" || activeView === "track";

  const handleLogout = useCallback(async () => {
    await logoutAction();
    toast({ title: "خروج", description: "از حساب خود خارج شدید." });
    navigate("home");
    refresh();
  }, [toast, navigate, refresh]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ShellHeaderBridge activeView={activeView} onLogout={handleLogout} />
      <main className={bareLayout ? "flex-1 min-w-0" : "flex-1 min-w-0 pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0"}>
        {shell.demoMode && (
          <div className="bg-amber-100 border-b border-amber-300 text-amber-900 text-center text-xs py-1.5 px-3">
            نسخه‌ی نمایشی ریشه — پرداخت‌ها، تسویه‌ها و شناسنامه‌ها شبیه‌سازی شده‌اند و هیچ پول واقعی جابه‌جا نمی‌شود.
          </div>
        )}
        {children}
      </main>
      {!bareLayout && (
        <MobileTabBar
          user={shell.user}
          cartCount={shell.cartCount}
          activeView={activeView}
          onNavigate={navigate}
        />
      )}
      <PwaProvider />
      {!bareLayout && (
        <SiteFooter
          onNavigate={navigate}
          categories={shell.categories.map((c) => ({ slug: c.slug, title: c.title }))}
        />
      )}
    </div>
  );
}

/** Bridge to the SiteHeader: passes shell data via context. */
function ShellHeaderBridge({ activeView, onLogout }: { activeView: string; onLogout: () => Promise<void> }) {
  const { shell, navigate } = useShell();
  return (
    <SiteHeader
      user={shell.user}
      cartCount={shell.cartCount}
      categories={shell.categories}
      activeView={activeView}
      onNavigate={navigate}
      onSearch={(q) => navigate(`categories/all?q=${encodeURIComponent(q)}`)}
      onLogout={onLogout}
      unreadNotifications={shell.unreadNotifications}
    />
  );
}

export { mapLegacyViewPath };
