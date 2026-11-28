"use client";

import { useEffect, useState } from "react";
import { MSymbol } from "@/components/icons";
import { faNum } from "@/lib/fa";
import type { CategoryDTO, SessionUserDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SiteHeader({
  user,
  cartCount,
  categories,
  activeView,
  onNavigate,
  onSearch,
  onLogout,
  unreadNotifications = 0,
}: {
  user: SessionUserDTO;
  cartCount: number;
  categories: CategoryDTO[];
  activeView: string;
  onNavigate: (to: string) => void;
  onSearch: (q: string) => void;
  onLogout: () => void;
  unreadNotifications?: number;
}) {
  const [q, setQ] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [catMenu, setCatMenu] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  // Escape closes the drawer (accessibility; focus trap helper)
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const submitSearch = () => {
    setDrawerOpen(false);
    onSearch(q);
  };

  const navItems: Array<{ view: string; label: string }> = [
    { view: "home", label: "صفحه اصلی" },
    { view: "categories", label: "دسته‌بندی‌ها" },
    { view: "about", label: "درباره ما" },
    { view: "blog", label: "وبلاگ" },
    { view: "contact", label: "تماس با ما" },
  ];

  const dashboardTarget =
    user?.role === "ADMIN" ? "admin" : user?.role === "ARTISAN" ? "dashboard" : "dashboard";

  return (
    <header className="sticky top-0 w-full z-50 shadow-[0_1px_8px_rgba(0,0,0,0.04)] bg-[#fbf5eb] pt-[env(safe-area-inset-top)] md:pt-0">
      {/* Top utility bar */}
      <div className="hidden md:block w-full bg-[#0a332f] text-white py-2 px-gutter">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 font-label-sm text-label-sm">
          <div className="flex items-center gap-space-xs min-w-0">
            <MSymbol name="support_agent" size={18} className="text-tertiary-fixed-dim shrink-0" />
            <span className="truncate">
              <span className="hidden min-[400px]:inline">پشتیبانی: </span>۰۲۱-۱۲۳۴۵۶۷۸
              <span className="hidden sm:inline"> | ۷/۷</span>
            </span>
          </div>
          <div className="flex items-center gap-space-sm sm:gap-space-md shrink-0">
            {/* تخفیف‌ها فقط برای کاربران واردشده نمایش داده می‌شود */}
            {user && (
              <>
                <button
                  onClick={() => onNavigate("discounts")}
                  className="flex items-center gap-1.5 hover:text-tertiary-fixed-dim transition-colors"
                  aria-label="تخفیف‌ها"
                >
                  <MSymbol name="sell" size={17} />
                  <span className="hidden sm:inline">تخفیف‌ها</span>
                </button>
                <span className="text-[#23534d]">✦</span>
              </>
            )}
            <button
              onClick={() => onNavigate("favorites")}
              className="flex items-center gap-1.5 hover:text-tertiary-fixed-dim transition-colors"
              aria-label="علاقه‌مندی‌ها"
            >
              <MSymbol name="favorite_border" size={17} />
              <span className="hidden sm:inline">علاقه‌مندی‌ها</span>
            </button>
            {user && (
              <>
                <span className="text-[#23534d]">✦</span>
                <button
                  onClick={() => onNavigate("notifications")}
                  className="relative flex items-center gap-1.5 hover:text-tertiary-fixed-dim transition-colors"
                  aria-label="اعلان‌ها"
                >
                  <MSymbol name="notifications" size={17} />
                  <span className="hidden sm:inline">اعلان‌ها</span>
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-red-700 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                      {faNum(Math.min(unreadNotifications, 9))}
                    </span>
                  )}
                </button>
              </>
            )}
            <span className="text-[#23534d]">✦</span>
            <button
              onClick={() => onNavigate("cart")}
              className="relative flex items-center gap-1.5 hover:text-tertiary-fixed-dim transition-colors"
              aria-label="سبد خرید"
            >
              <MSymbol name="shopping_bag" size={18} />
              <span className="hidden sm:inline">سبد خرید</span>
              <span className="bg-tertiary-fixed-dim text-tertiary font-bold text-xs w-4 h-4 rounded-full flex items-center justify-center leading-none">
                {faNum(cartCount)}
              </span>
            </button>
            <span className="text-[#23534d]">✦</span>
            <div className="relative">
              <button
                onClick={() => setUserMenu((v) => !v)}
                className="w-7 h-7 rounded-full bg-[#12423d] flex items-center justify-center text-white hover:bg-[#1a554f] transition-colors"
                aria-label="حساب کاربری"
                aria-haspopup="menu"
                aria-expanded={userMenu}
              >
                <MSymbol name="person" size={16} />
              </button>
              {userMenu && (
                <div
                  role="menu"
                  className="absolute top-9 left-0 w-56 bg-surface-bright text-on-surface rounded-2xl elevation-3 p-2 z-50"
                >
                  {user ? (
                    <>
                      <div className="px-3 py-2 border-b border-outline-variant/30">
                        <p className="text-sm font-bold text-primary">{user.name}</p>
                        <p className="text-xs text-on-surface-variant">{user.email}</p>
                        {user.role !== "BUYER" && (
                          <span className="inline-block mt-1 text-[10px] font-bold bg-primary-fixed text-on-primary-fixed rounded-full px-2 py-0.5">
                            {user.role === "ADMIN" ? "مدیر سامانه" : "استادکار"}
                          </span>
                        )}
                      </div>
                      <MenuLink
                        icon="palette"
                        label="داشبورد من"
                        onClick={() => {
                          setUserMenu(false);
                          onNavigate(dashboardTarget);
                        }}
                      />
                      {user.role === "ARTISAN" && (
                        <MenuLink
                          icon="brush"
                          label="مدیریت آثار من"
                          onClick={() => {
                            setUserMenu(false);
                            onNavigate("artworks");
                          }}
                        />
                      )}
                      <MenuLink
                        icon="receipt_long"
                        label="سفارش‌ها و پیگیری"
                        onClick={() => {
                          setUserMenu(false);
                          onNavigate("orders");
                        }}
                      />
                      <MenuLink
                        icon="sell"
                        label="تخفیف‌ها و کدهای من"
                        onClick={() => {
                          setUserMenu(false);
                          onNavigate("discounts");
                        }}
                      />
                      <MenuLink
                        icon="logout"
                        label="خروج از حساب"
                        onClick={() => {
                          setUserMenu(false);
                          onLogout();
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <MenuLink
                        icon="login"
                        label="ورود | ثبت‌نام"
                        onClick={() => {
                          setUserMenu(false);
                          onNavigate("login");
                        }}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className="w-full bg-[#fbf5eb] border-b border-surface-variant">
        <div className="max-w-7xl mx-auto px-gutter h-16 sm:h-20 flex items-center justify-between gap-space-sm sm:gap-space-md xl:gap-space-lg">
          <button
            id="mobile-menu-btn"
            type="button"
            aria-label="باز کردن منو"
            onClick={() => setDrawerOpen(true)}
            className="xl:hidden w-11 h-11 rounded-xl flex items-center justify-center text-primary hover:bg-surface-container-high transition-colors shrink-0"
          >
            <MSymbol name="menu" size={26} />
          </button>

          <button
            onClick={() => onNavigate("home")}
            className="flex items-center gap-space-sm sm:gap-space-md shrink-0 group"
            aria-label="ریشه — صفحه اصلی"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-tertiary-fixed-dim shadow-sm overflow-hidden">
              { }
              <img
                src="/assets/img/logo-mark.webp"
                alt="نشان ریشه"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col text-right">
              <span className="text-xl sm:text-[22px] sm:leading-[34px] text-primary font-bold leading-none">
                ریشه
              </span>
              <span className="hidden min-[380px]:block font-label-sm text-label-sm text-on-surface-variant mt-1">
                دست‌سازه‌های اصیل ایران
              </span>
            </div>
          </button>

          <div className="flex-1 min-w-0 max-w-xl hidden md:block">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSearch(q);
              }}
              className="relative w-full"
              role="search"
            >
              <input
                className="w-full bg-surface-container-lowest rounded-full py-2.5 pr-5 pl-12 text-body-sm text-on-surface-variant/70 border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                placeholder="جستجو در میان آثار هنری و صنایع دستی ..."
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="جستجو"
              />
              <button
                type="submit"
                aria-label="جستجو"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
              >
                <MSymbol name="search" size={22} />
              </button>
            </form>
          </div>

          <nav className="hidden xl:flex items-center gap-space-lg font-label-lg text-label-lg shrink-0">
            {navItems.map((item) => (
              <div key={item.view} className="relative">
                <button
                  onClick={() => onNavigate(item.view)}
                  className={cn(
                    "transition-colors whitespace-nowrap",
                    item.view === "categories" && "flex items-center gap-1",
                    activeView === item.view
                      ? "text-primary font-bold border-b-2 border-on-tertiary-container"
                      : "text-on-surface-variant hover:text-primary"
                  )}
                  onMouseEnter={() => item.view === "categories" && setCatMenu(true)}
                  onMouseLeave={() => item.view === "categories" && setCatMenu(false)}
                >
                  {item.view === "categories" && <MSymbol name="keyboard_arrow_down" size={18} />}
                  <span>{item.label}</span>
                </button>
                {item.view === "categories" && catMenu && (
                  <div
                    className="absolute top-full right-0 w-80 max-h-[70vh] overflow-y-auto bg-surface-bright rounded-2xl elevation-3 p-2 z-50"
                    onMouseEnter={() => setCatMenu(true)}
                    onMouseLeave={() => setCatMenu(false)}
                  >
                    {categories.map((c) => (
                      <button
                        key={c.slug}
                        onClick={() => {
                          setCatMenu(false);
                          onNavigate(`categories/${c.slug}`);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-surface-container-high transition-colors text-right"
                      >
                        <span className="text-sm font-semibold text-primary">{c.title}</span>
                        <span className="text-xs text-on-surface-variant">
                          {faNum(c.count)} اثر
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Mobile / small-tablet search (the inline search is hidden below md) */}
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            onSearch(q);
          }}
          className="md:hidden px-gutter pb-3"
        >
          <div className="relative">
            <input
              className="w-full bg-surface-container-lowest rounded-full py-2.5 pr-5 pl-12 text-body-sm text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
              placeholder="جستجو در آثار هنری و صنایع دستی ..."
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="جستجو"
            />
            <button
              type="submit"
              aria-label="جستجو"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
            >
              <MSymbol name="search" size={22} />
            </button>
          </div>
        </form>
      </div>

      {/* Mobile drawer */}
      <div
        id="mobile-backdrop"
        className={cn(
          "fixed inset-0 bg-primary-container/40 backdrop-blur-sm z-[60] transition-opacity xl:hidden",
          drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setDrawerOpen(false)}
      />
      <nav
        id="mobile-drawer"
        aria-label="منوی موبایل"
        className={cn(
          "fixed top-0 right-0 h-dvh w-80 max-w-[85vw] bg-surface-container-low z-[70] shadow-2xl p-4 flex flex-col gap-1.5 transition-transform duration-300 xl:hidden overflow-y-auto overscroll-contain",
          drawerOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            { }
            <img
              src="/assets/img/logo-mark.webp"
              alt="نشان ریشه"
              className="w-9 h-9 object-contain"
            />
            <div className="flex flex-col">
              <span className="font-bold text-primary leading-none">ریشه</span>
              <span className="text-[11px] text-on-surface-variant mt-0.5">دست‌سازه‌های اصیل ایران</span>
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high"
            aria-label="بستن منو"
          >
            <MSymbol name="close" />
          </button>
        </div>
        {/* Search first — directly above the «خانه» item, as requested */}
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            submitSearch();
          }}
          className="mb-2"
        >
          <div className="relative">
            <input
              type="search"
              inputMode="search"
              className="w-full bg-surface-container-lowest rounded-full py-2.5 pr-4 pl-11 text-[14px] text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
              placeholder="جستجوی اثر، استادکار، دسته‌بندی…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="جستجو در منوی موبایل"
            />
            <button
              type="submit"
              aria-label="جستجو"
              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
            >
              <MSymbol name="search" size={20} />
            </button>
          </div>
        </form>

        {navItems.map((item) => (
          <button
            key={item.view}
            onClick={() => {
              setDrawerOpen(false);
              onNavigate(item.view);
            }}
            className={cn(
              "flex items-center gap-space-md px-space-md py-3 rounded-xl transition-colors text-right min-h-11",
              activeView === item.view
                ? "bg-surface-container-high text-primary font-bold"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
            )}
          >
            <MSymbol name={navIcons[item.view] ?? "home"} />
            {item.label}
          </button>
        ))}
        <p className="px-space-md pt-2 text-[11px] font-bold text-on-tertiary-container">دسته‌بندی آثار</p>
        {categories.map((c) => (
          <button
            key={c.slug}
            onClick={() => {
              setDrawerOpen(false);
              onNavigate(`categories/${c.slug}`);
            }}
            className="flex items-center gap-space-md px-space-md py-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high text-sm text-right"
          >
            <MSymbol name="category" size={20} />
            {c.title}
          </button>
        ))}
        <div className="border-t border-outline-variant/30 my-2" />
        {/* تخفیف‌ها فقط برای کاربران واردشده — مهمان‌ها این بخش را نمی‌بینند */}
        {user && (
          <DrawerLink
            icon="sell"
            label="تخفیف‌ها و کدهای هدیه"
            onClick={() => {
              setDrawerOpen(false);
              onNavigate("discounts");
            }}
          />
        )}
        <DrawerLink
          icon="favorite_border"
          label="علاقه‌مندی‌ها"
          onClick={() => {
            setDrawerOpen(false);
            onNavigate("favorites");
          }}
        />
        <DrawerLink
          icon="shopping_bag"
          label="سبد خرید"
          onClick={() => {
            setDrawerOpen(false);
            onNavigate("cart");
          }}
        />
        {user && (
          <DrawerLink
            icon="receipt_long"
            label="سفارش‌ها و پیگیری"
            onClick={() => {
              setDrawerOpen(false);
              onNavigate("orders");
            }}
          />
        )}
        <DrawerLink
          icon="verified"
          label="استعلام اصالت"
          onClick={() => {
            setDrawerOpen(false);
            onNavigate("verify");
          }}
        />
        <DrawerLink
          icon="install_mobile"
          label="نصب اپلیکیشن"
          onClick={() => {
            setDrawerOpen(false);
            onNavigate("app");
          }}
        />
        {user ? (
          <>
            <DrawerLink
              icon="palette"
              label="داشبورد من"
              onClick={() => {
                setDrawerOpen(false);
                onNavigate(dashboardTarget);
              }}
            />
            {user.role === "ARTISAN" && (
              <DrawerLink
                icon="brush"
                label="مدیریت آثار من"
                onClick={() => {
                  setDrawerOpen(false);
                  onNavigate("artworks");
                }}
              />
            )}
            <DrawerLink
              icon="logout"
              label="خروج از حساب"
              onClick={() => {
                setDrawerOpen(false);
                onLogout();
              }}
            />
          </>
        ) : (
          <DrawerLink
            icon="login"
            label="ورود | ثبت‌نام"
            onClick={() => {
              setDrawerOpen(false);
              onNavigate("login");
            }}
          />
        )}
        {/* پیشخوان مدیریت فقط برای ادمین */}
        {user?.role === "ADMIN" && (
          <DrawerLink
            icon="admin_panel_settings"
            label="پیشخوان مدیریت"
            onClick={() => {
              setDrawerOpen(false);
              onNavigate("admin");
            }}
          />
        )}
        <div className="mt-auto flex items-center gap-2 text-xs text-on-surface-variant pt-4 border-t border-outline-variant/30">
          <MSymbol name="support_agent" size={16} />
          پشتیبانی ۷/۷ | ۰۲۱-۱۲۳۴۵۶۷۸
        </div>
      </nav>
    </header>
  );
}

const navIcons: Record<string, string> = {
  home: "home",
  categories: "category",
  about: "museum",
  blog: "article",
  contact: "call",
};

function MenuLink({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-surface-container-high text-sm text-on-surface text-right"
    >
      <MSymbol name={icon} size={20} />
      {label}
    </button>
  );
}

function DrawerLink({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-space-md px-space-md py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors text-right"
    >
      <MSymbol name={icon} />
      {label}
    </button>
  );
}
