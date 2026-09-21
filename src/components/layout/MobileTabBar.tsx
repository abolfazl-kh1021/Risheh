"use client";

import { MSymbol } from "@/components/icons";
import { faNum } from "@/lib/fa";
import type { SessionUserDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = {
  id: string;
  label: string;
  icon: string;
  to: string;
  views: string[];
  badge?: number;
};

const ACCOUNT_VIEWS = ["dashboard", "login", "orders", "admin", "artworks", "finance", "lab"];

/**
 * App-style bottom navigation, shown below `md` only (phones / installed PWA).
 * Mirrors the site's palette: cream surface, deep-teal active pill, saffron badge.
 */
export function MobileTabBar({
  user,
  cartCount,
  activeView,
  onNavigate,
}: {
  user: SessionUserDTO;
  cartCount: number;
  activeView: string;
  onNavigate: (to: string) => void;
}) {
  const accountTarget = !user ? "login" : user.role === "ADMIN" ? "admin" : "dashboard";

  const tabs: Tab[] = [
    { id: "home", label: "خانه", icon: "home", to: "home", views: ["home"] },
    { id: "categories", label: "دسته‌ها", icon: "category", to: "categories/all", views: ["categories", "product"] },
    { id: "favorites", label: "علاقه‌مندی", icon: "favorite_border", to: "favorites", views: ["favorites"] },
    { id: "cart", label: "سبد خرید", icon: "shopping_bag", to: "cart", views: ["cart", "payment"], badge: cartCount },
    { id: "account", label: user ? "حساب من" : "ورود", icon: "person", to: accountTarget, views: ACCOUNT_VIEWS },
  ];

  return (
    <nav
      aria-label="ناوبری اصلی اپ"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface-bright/95 backdrop-blur-md border-t border-outline-variant/40 shadow-[0_-8px_24px_-12px_rgba(15,61,58,0.25)] pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5 max-w-lg mx-auto px-1">
        {tabs.map((t) => {
          const active = t.views.includes(activeView);
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onNavigate(t.to)}
                aria-current={active ? "page" : undefined}
                className="relative w-full min-h-[3.75rem] flex flex-col items-center justify-center gap-0.5 pt-1.5 pb-1 active:scale-95 transition-transform"
              >
                <span
                  className={cn(
                    "relative h-8 w-14 rounded-full flex items-center justify-center transition-colors duration-200",
                    active ? "bg-primary-container text-tertiary-fixed-dim" : "text-on-surface-variant"
                  )}
                >
                  <MSymbol name={t.icon} size={24} filled={active} />
                  {!!t.badge && t.badge > 0 && (
                    <span className="absolute -top-0.5 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-pomegranate text-white text-[10px] font-bold leading-none flex items-center justify-center ring-2 ring-surface-bright">
                      {faNum(t.badge > 99 ? 99 : t.badge)}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "text-[11px] leading-none",
                    active ? "font-bold text-primary" : "font-medium text-on-surface-variant"
                  )}
                >
                  {t.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
