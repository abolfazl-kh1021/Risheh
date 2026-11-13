
"use client";

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { MSymbol } from "@/components/icons";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "risheh:pwa-install-dismissed";
const DISMISS_DAYS = 7;

// Subscribe to browser online/offline events.
function subscribeOnlineStatus(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);

  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineStatus() {
  return navigator.onLine;
}

// Keep server and initial hydration snapshots consistent.
function getServerOnlineStatus() {
  return true;
}

function isStandalone() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function recentlyDismissed() {
  try {
    const t = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return t > 0 && Date.now() - t < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

/**
 * Registers the service worker (production only), shows a dismissible
 * "install the app" card on phones, and an offline banner.
 */
export function PwaProvider() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  // Online / offline status.
  const online = useSyncExternalStore(
    subscribeOnlineStatus,
    getOnlineStatus,
    getServerOnlineStatus
  );

  // Service worker: register in production, remove in dev.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {});
    } else {
      navigator.serviceWorker
        .getRegistrations()
        .then((rs) => rs.forEach((r) => r.unregister()));
    }
  }, []);

  // Install prompt (Chromium/Android) + iOS Safari instructions.
  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    let revealTimer: ReturnType<typeof setTimeout> | undefined;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallEvent);

      if (revealTimer) clearTimeout(revealTimer);

      revealTimer = setTimeout(() => {
        setVisible(true);
      }, 6000);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);

    const onInstalled = () => {
      if (revealTimer) clearTimeout(revealTimer);
      setVisible(false);
    };

    window.addEventListener("appinstalled", onInstalled);

    const ua = navigator.userAgent;
    const isIos =
      /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua);

    if (isIos) {
      revealTimer = setTimeout(() => {
        setIosHint(true);
        setVisible(true);
      }, 8000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);

      if (revealTimer) clearTimeout(revealTimer);
    };
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);

    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* storage unavailable — fine */
    }
  }, []);

  const install = useCallback(async () => {
    if (!installEvent) return;

    await installEvent.prompt();
    await installEvent.userChoice.catch(() => null);

    setInstallEvent(null);
    setVisible(false);
  }, [installEvent]);

  return (
    <>
      {!online && (
        <div
          role="status"
          className="fixed top-0 inset-x-0 z-[80] bg-pomegranate text-white text-xs font-bold text-center py-1.5 pt-[calc(0.375rem+env(safe-area-inset-top))]"
        >
          اتصال اینترنت قطع است — برخی بخش‌ها در دسترس نیستند.
        </div>
      )}

      {visible && (installEvent || iosHint) && (
        <div
          role="dialog"
          aria-label="نصب اپ ریشه"
          className="md:hidden fixed inset-x-3 z-[45] bottom-[calc(4.75rem+env(safe-area-inset-bottom))] rounded-2xl bg-primary-container text-surface-bright p-3.5 shadow-2xl ring-1 ring-tertiary-fixed-dim/30 flex items-center gap-3"
        >
          <img
            src="/assets/icons/icon-192.png"
            alt=""
            className="w-12 h-12 rounded-xl shrink-0"
          />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-tight">
              اپ ریشه را نصب کنید
            </p>

            <p className="text-[11px] text-on-primary-container leading-relaxed mt-0.5">
              {installEvent
                ? "دسترسی سریع‌تر از صفحه اصلی گوشی، بدون نوار مرورگر."
                : "در Safari روی دکمه اشتراک‌گذاری بزنید و «افزودن به صفحه اصلی» را انتخاب کنید."}
            </p>
          </div>

          {installEvent && (
            <button
              onClick={install}
              className="shrink-0 min-h-10 px-4 rounded-xl bg-tertiary-fixed-dim text-tertiary-container text-xs font-black"
            >
              نصب
            </button>
          )}

          <button
            onClick={dismiss}
            aria-label="بستن"
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-on-primary-container hover:bg-white/10"
          >
            <MSymbol name="close" size={20} />
          </button>
        </div>
      )}
    </>
  );
}
