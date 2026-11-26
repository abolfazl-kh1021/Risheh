"use client";

/**
 * App-install card (homepage, id="app-install").
 *
 * Two install paths, both REAL:
 *  1. QR code — encodes the CURRENT site origin, so on any deployment
 *     (Vercel production, preview, local) the scan opens the site on the
 *     visitor's phone; the browser then offers the one-tap install
 *     (beforeinstallprompt card) and the app installs as a PWA.
 *  2. Direct install button — fires the browser's native install prompt
 *     (Chromium/Android). iOS gets the Add-to-Home-Screen guide instead,
 *     which is Apple's official install flow for web apps.
 *
 * The card is deliberately compact: icon, name, three key features, install
 * action — "a small section for users" as requested.
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";
import { MSymbol } from "@/components/icons";
import {
  getInstallEvent,
  subscribeInstallEvent,
  consumeInstallEvent,
  type InstallEvent,
} from "@/lib/install-prompt";

const FEATURES: Array<{ icon: string; text: string }> = [
  { icon: "bolt", text: "اجرا سریع‌تر و دسترسی یک‌ضرب به گنجینه آثار" },
  { icon: "notifications", text: "اطلاع فوری از تخفیف‌ها و آثار تازه" },
  { icon: "wifi_off", text: "مرور آثار بازدیدشده حتی بدون اینترنت" },
];

export function AppInstallSection() {
  // Shared install event — caught even if the browser fired it before mount.
  const installEvent = useSyncExternalStore<InstallEvent | null>(
    subscribeInstallEvent,
    getInstallEvent,
    () => null
  );
  const [origin, setOrigin] = useState("");
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [iosGuideOpen, setIosGuideOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    const ua = navigator.userAgent;
    setIsIos(/iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua));
    setInstalled(
      window.matchMedia?.("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );

    const onInstalled = () => {
      setInstalled(true);
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installEvent || busy) return;
    setBusy(true);
    try {
      await installEvent.prompt();
      await installEvent.userChoice.catch(() => null);
      consumeInstallEvent();
    } finally {
      setBusy(false);
    }
  }, [installEvent, busy]);

  const qrValue = origin ? `${origin}/#/home` : "";

  return (
    <section className="w-full px-3 md:px-8 py-6" id="app-install">
      <div className="max-w-7xl mx-auto relative rounded-3xl overflow-hidden border border-[#E9DAC3] craft-shadow bg-gradient-to-l from-[#0d3833] via-[#0e3b36] to-[#092b27]">
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#f8bc5f 0.8px, transparent 0.8px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 lg:gap-10 items-center p-5 sm:p-7 md:p-9">
          {/* Right column (RTL start): icon, name, features, install action */}
          <div className="flex flex-col sm:flex-row gap-5 sm:gap-7 items-center sm:items-center">
            <div className="shrink-0">
              <img
                src="/assets/icons/icon-192.png"
                alt="آیکون اپلیکیشن ریشه"
                width={96}
                height={96}
                loading="lazy"
                className="w-[84px] h-[84px] sm:w-24 sm:h-24 rounded-3xl shadow-2xl ring-2 ring-brand-gold/40"
              />
            </div>

            <div className="flex-1 min-w-0 text-center sm:text-right">
              <div className="flex items-center justify-center sm:justify-start gap-2 text-brand-gold mb-1.5">
                <span className="w-6 h-px bg-brand-gold/70" />
                <span className="text-xs font-bold tracking-wider">همراه همیشگی گنجینه ریشه</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white leading-snug">
                اپلیکیشن «ریشه» را <span className="text-brand-lightGold">روی گوشی‌تان</span> نصب کنید
              </h3>
              <ul className="mt-3 space-y-1.5 max-w-md mx-auto sm:mx-0">
                {FEATURES.map((f) => (
                  <li key={f.icon} className="flex items-center gap-2 text-[13px] text-gray-200 text-right">
                    <MSymbol name={f.icon} size={18} className="text-brand-lightGold shrink-0" />
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                {installed ? (
                  <span className="inline-flex items-center gap-2 bg-brand-gold/15 text-brand-lightGold border border-brand-gold/40 rounded-full px-5 py-2.5 text-sm font-bold">
                    <MSymbol name="check_circle" size={18} />
                    اپ نصب شده است
                  </span>
                ) : installEvent ? (
                  <button
                    onClick={install}
                    disabled={busy}
                    className="inline-flex items-center gap-2 bg-gradient-to-l from-brand-gold to-brand-lightGold text-brand-darkTeal rounded-full px-6 py-2.5 text-sm font-black shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-60"
                  >
                    <MSymbol name="install_mobile" size={19} />
                    نصب برنامه
                  </button>
                ) : isIos ? (
                  <button
                    onClick={() => setIosGuideOpen((v) => !v)}
                    className="inline-flex items-center gap-2 bg-brand-gold/15 text-brand-lightGold border border-brand-gold/40 rounded-full px-5 py-2.5 text-sm font-bold hover:bg-brand-gold/25 transition"
                  >
                    <MSymbol name="phone_iphone" size={18} />
                    راهنمای نصب در آیفون
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (qrValue) window.location.hash = "#/home";
                      document.getElementById("app-install")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="inline-flex items-center gap-2 bg-brand-gold/15 text-brand-lightGold border border-brand-gold/40 rounded-full px-5 py-2.5 text-sm font-bold hover:bg-brand-gold/25 transition"
                  >
                    <MSymbol name="qr_code_scanner" size={18} />
                    با موبایل، QR را اسکن کنید
                  </button>
                )}
                <span className="text-[11px] text-gray-300/80">
                  نصب رایگان — بدون نیاز به فروشگاه اپ
                </span>
                <button
                  onClick={() => {
                    window.location.hash = "#/app";
                    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
                  }}
                  className="inline-flex items-center gap-1.5 text-[13px] font-bold text-brand-lightGold border-b border-brand-gold/40 hover:text-white hover:border-white/60 transition-colors pb-0.5"
                >
                  <MSymbol name="install_mobile" size={16} />
                  صفحه دانلود اپ
                </button>
              </div>

              {isIos && iosGuideOpen && (
                <p className="mt-3 text-xs text-gray-200 bg-white/10 rounded-xl px-3 py-2 max-w-md mx-auto sm:mx-0 text-right leading-relaxed">
                  در Safari دکمه اشتراک‌گذاری (مربع با فلش رو به بالا) را بزنید و گزینه
                  «Add to Home Screen» را انتخاب کنید — اپ ریشه روی صفحه اصلی گوشی نصب می‌شود.
                </p>
              )}
            </div>
          </div>

          {/* Left column (desktop/tablet): live QR — scanning it opens this very
              deployment on the phone, where the install prompt completes the job. */}
          <div className="hidden md:flex flex-col items-center gap-3 self-center">
            <div className="bg-[#fbf5eb] rounded-2xl p-3 shadow-2xl ring-1 ring-brand-gold/40">
              {qrValue ? (
                <QRCodeSVG
                  value={qrValue}
                  size={148}
                  bgColor="#fbf5eb"
                  fgColor="#07221e"
                  level="M"
                  marginSize={1}
                  title="بارکد نصب اپلیکیشن ریشه"
                />
              ) : (
                <div className="w-[148px] h-[148px]" aria-hidden="true" />
              )}
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-brand-lightGold flex items-center justify-center gap-1.5">
                <MSymbol name="qr_code_scanner" size={16} />
                اسکن با دوربین گوشی
              </p>
              <p className="text-[10px] text-gray-300/75 mt-1 max-w-[180px] break-all" dir="ltr">
                {origin.replace(/^https?:\/\//, "")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
