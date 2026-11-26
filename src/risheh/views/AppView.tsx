"use client";

/**
 * Dedicated app download page (#/app).
 *
 * The single entry point for installing the «ریشه» PWA. Two install paths:
 *  1. QR code — scan with another phone; opens this very page on the phone.
 *  2. «دانلود برنامه» button — the PRIMARY path for visitors who cannot
 *     scan (e.g. they are already browsing ON their phone). On
 *     Chromium/Android it fires the browser's real install prompt and the
 *     app is installed; on iOS it opens the official Add-to-Home-Screen
 *     guide; on browsers without the API it explains the manual steps.
 *
 * Visual language follows the homepage install card (dark-teal gradient,
 * saffron-gold CTA, cream patterned background) — no design drift.
 */

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { QRCodeSVG } from "qrcode.react";
import { MSymbol } from "@/components/icons";
import { faNum } from "@/lib/fa";
import {
  getInstallEvent,
  subscribeInstallEvent,
  consumeInstallEvent,
  type InstallEvent,
} from "@/lib/install-prompt";

const FEATURES: Array<{ icon: string; title: string; text: string }> = [
  { icon: "bolt", title: "اجرا و بارگذاری سریع", text: "گنجینه آثار در چند ثانیه و با دسترسی یک‌ضرب در دسترس است." },
  { icon: "notifications", title: "اطلاع فوری تخفیف‌ها", text: "از آثار تازه استادکاران و کدهای هدیه بی‌درنگ باخبر شوید." },
  { icon: "wifi_off", title: "مرور بدون اینترنت", text: "آثاری که یک‌بار دیده‌اید، حتی در قطعی اینترنت باز می‌شوند." },
  { icon: "verified_user", title: "استعلام اصالت آسان", text: "شناسنامه اصالت هر اثر را با چند ضربه استعلام کنید." },
  { icon: "shopping_bag", title: "سبد خرید همیشه در جیب", text: "خرید و پیگیری سفارش‌ها بدون باز کردن دوباره سایت." },
  { icon: "search", title: "جستجوی سریع گنجینه", text: "میان صدها دست‌سازه اصیل در یک لحظه جستجو کنید." },
];

const STEPS: Array<{ icon: string; title: string; items: string[] }> = [
  {
    icon: "install_mobile",
    title: "اندروید — کروم، سامسونگ، ادج",
    items: [
      "دکمه «دانلود برنامه» را بزنید.",
      "در پنجره ظاهرشده گزینه «نصب» را تأیید کنید.",
      "آیکون «ریشه» روی صفحه اصلی گوشی قرار می‌گیرد.",
    ],
  },
  {
    icon: "phone_iphone",
    title: "آیفون و آیپد — سافاری",
    items: [
      "این صفحه را در Safari باز کنید.",
      "دکمه اشتراک‌گذاری (مربع با فلش رو به بالا) را بزنید.",
      "«Add to Home Screen» را انتخاب و تأیید کنید.",
    ],
  },
  {
    icon: "qr_code_2",
    title: "رایانه رومیزی",
    items: [
      "کد QR این صفحه را با دوربین گوشی اسکن کنید.",
      "سایت روی گوشی باز می‌شود؛ دکمه «دانلود برنامه» را بزنید.",
      "«نصب» را تأیید کنید تا اپ به گوشی اضافه شود.",
    ],
  },
];

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "اپلیکیشن ریشه چه تفاوتی با سایت دارد؟",
    a: "همان فروشگاه کامل است اما در قالب یک اپ مستقل: بدون نوار مرورگر، با آیکون اختصاصی روی صفحه اصلی گوشی، اجرای سریع‌تر، اطلاع‌رسانی تخفیف‌ها و مرور آثار بازدیدشده حتی بدون اینترنت.",
  },
  {
    q: "برای نصب، فروشگاه اپ لازم است؟",
    a: "نه. نصب مستقیماً از همین صفحه انجام می‌شود — رایگان، بدون واسطه و بدون نیاز به کافه‌بازار یا گوگل‌پلی و حتی بدون ثبت‌نام.",
  },
  {
    q: "چقدر فضا می‌گیرد و چطور حذف می‌شود؟",
    a: "تنها چند مگابایت. حذف آن هم مثل هر اپ دیگر است: انگشت خود را روی آیکون نگه دارید و «حذف» را انتخاب کنید.",
  },
];

export function AppView({ navigate }: { navigate: (to: string) => void }) {
  // One shared install event — captured at module import time so an early
  // browser prompt is never missed (see lib/install-prompt.ts).
  const installEvent = useSyncExternalStore<InstallEvent | null>(
    subscribeInstallEvent,
    getInstallEvent,
    () => null
  );

  const [origin, setOrigin] = useState("");
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [busy, setBusy] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [iosGuideOpen, setIosGuideOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    setOrigin(window.location.origin);
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua);
    setIsIos(ios);
    setInstalled(
      window.matchMedia?.("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
    const onInstalled = () => setInstalled(true);
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  const download = useCallback(async () => {
    if (busy || installed) return;
    if (installEvent) {
      // REAL install: fires the browser's native install dialog.
      setBusy(true);
      try {
        await installEvent.prompt();
        await installEvent.userChoice.catch(() => null);
        consumeInstallEvent();
      } finally {
        setBusy(false);
      }
    } else {
      // No native prompt available (iOS Safari or unsupported browser):
      // open the manual guide — the click still leads to installation.
      setManualOpen(true);
      if (isIos) setIosGuideOpen(true);
    }
  }, [busy, installed, installEvent, isIos]);

  const qrValue = origin ? `${origin}/#/app` : "";

  const ctaLabel = installed
    ? "اپ نصب شده است"
    : isIos && !installEvent
      ? "افزودن به صفحه اصلی"
      : "دانلود برنامه";

  return (
    <div className="persian-pattern-subtle">
      {/* ---------- Hero ---------- */}
      <section className="w-full px-gutter pt-space-xl pb-4 text-center">
        <div className="relative inline-flex items-center justify-center mb-3">
          <span className="absolute w-32 h-32 rounded-full bg-tertiary-fixed/40 blur-xl" aria-hidden="true" />
          <img
            src="/assets/icons/icon-192.png"
            alt="آیکون اپلیکیشن ریشه"
            width={96}
            height={96}
            className="relative w-24 h-24 rounded-3xl shadow-2xl ring-2 ring-brand-gold/50"
          />
        </div>
        <h1 className="text-headline-md text-primary font-black sm:text-[26px]">
          اپلیکیشن «ریشه» — گنجینه در جیب شما
        </h1>
        <p className="text-body-sm text-body-sm text-on-surface-variant leading-relaxed mt-2 max-w-xl mx-auto">
          همان بازار دست‌سازه‌های اصیل ایران، در قالب یک اپ مستقل و سبک؛ بدون نوار مرورگر، با دسترسی یک‌ضرب از صفحه اصلی گوشی.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {[
            { icon: "check_circle", label: "نصب رایگان" },
            { icon: "install_mobile", label: "بدون نیاز به فروشگاه اپ" },
            { icon: "bolt", label: "حجم کم و اجرای سریع" },
          ].map((b) => (
            <span
              key={b.label}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-on-tertiary-container bg-tertiary-fixed/50 border border-outline-variant/40 rounded-full px-3.5 py-1.5"
            >
              <MSymbol name={b.icon} size={15} />
              {b.label}
            </span>
          ))}
        </div>
      </section>

      {/* ---------- Download card: button + QR ---------- */}
      <section className="w-full px-3 md:px-8 pb-6">
        <div className="max-w-7xl mx-auto relative rounded-3xl overflow-hidden border border-[#E9DAC3] craft-shadow bg-gradient-to-l from-[#0d3833] via-[#0e3b36] to-[#092b27]">
          <div
            className="absolute inset-0 opacity-[0.08] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#f8bc5f 0.8px, transparent 0.8px)",
              backgroundSize: "22px 22px",
            }}
          />
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 lg:gap-10 items-center p-5 sm:p-7 md:p-9">
            {/* RTL start: icon, copy, download button, manual guide */}
            <div className="flex flex-col sm:flex-row gap-5 sm:gap-7 items-center">
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
                <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">
                  «ریشه» را <span className="text-brand-lightGold">روی گوشی‌تان</span> نصب کنید
                </h2>
                <p className="mt-2 text-[13px] text-gray-200 leading-relaxed max-w-md mx-auto sm:mx-0">
                  نمی‌توانید کد QR را اسکن کنید؟ نیازی به اسکن نیست — روی گوشی‌ای که با آن این صفحه را می‌بینید، فقط
                  دکمه «دانلود برنامه» را بزنید تا اپ مستقیم نصب شود.
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  {installed ? (
                    <span className="inline-flex items-center gap-2 bg-brand-gold/15 text-brand-lightGold border border-brand-gold/40 rounded-full px-5 py-2.5 text-sm font-bold">
                      <MSymbol name="check_circle" size={18} />
                      اپ نصب شده است
                    </span>
                  ) : (
                    <button
                      onClick={download}
                      disabled={busy}
                      className="inline-flex items-center gap-2 bg-gradient-to-l from-brand-gold to-brand-lightGold text-brand-darkTeal rounded-full px-7 py-3 text-base font-black shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-60"
                    >
                      <MSymbol name="install_mobile" size={20} />
                      {busy ? "در حال آماده‌سازی…" : ctaLabel}
                    </button>
                  )}
                  <button
                    onClick={() => navigate("categories/all")}
                    className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/20 rounded-full px-5 py-2.5 text-sm font-bold hover:bg-white/15 transition"
                  >
                    <MSymbol name="storefront" size={18} />
                    مرور گنجینه آثار
                  </button>
                </div>
                <p className="mt-2.5 text-[11px] text-gray-300/80">
                  نصب رایگان — بدون نیاز به فروشگاه اپ | پشتیبانی از اندروید، آیفون و رایانه
                </p>

                {/* Manual guide — appears when there is no native prompt */}
                {(manualOpen || iosGuideOpen) && !installed && !installEvent && (
                  <div
                    role="note"
                    className="mt-3 text-xs text-gray-100 bg-white/10 border border-white/15 rounded-xl px-3.5 py-3 max-w-md mx-auto sm:mx-0 text-right leading-relaxed"
                  >
                    {isIos ? (
                      <>
                        در <b>Safari</b> دکمه اشتراک‌گذاری (مربع با فلش رو به بالا) را بزنید و گزینه
                        «Add to Home Screen» را انتخاب کنید — اپ ریشه بلافاصله روی صفحه اصلی گوشی نصب می‌شود.
                      </>
                    ) : (
                      <>
                        در مرورگر خود منو (سه‌نقطه بالای صفحه) را باز کنید و گزینه
                        «نصب برنامه» یا «Install app» را انتخاب کنید تا اپ ریشه نصب شود.
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* RTL end (desktop/tablet): live QR — encodes THIS page, so the scan
                lands the phone exactly here, on the download page. */}
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
                    title="بارکد دانلود اپلیکیشن ریشه"
                  />
                ) : (
                  <div className="w-[148px] h-[148px]" aria-hidden="true" />
                )}
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-brand-lightGold flex items-center justify-center gap-1.5">
                  <MSymbol name="qr_code_scanner" size={16} />
                  اسکن با دوربین گوشی دیگر
                </p>
                <p className="text-[10px] text-gray-300/75 mt-1 max-w-[180px] break-all" dir="ltr">
                  {origin.replace(/^https?:\/\//, "")}
                </p>
              </div>
            </div>
          </div>

          {/* Mobile-only QR note: the QR card above is hidden on phones (you
              cannot scan your own screen) — the download button replaces it. */}
          <p className="md:hidden relative z-10 -mt-1 pb-5 px-6 text-center text-[11px] text-gray-300/75 flex items-center justify-center gap-1.5">
            <MSymbol name="qr_code_scanner" size={14} />
            با گوشیِ دیگری؟ کد QR پس از باز کردن صفحه روی آن نمایش داده می‌شود.
          </p>
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section className="max-w-7xl mx-auto px-gutter py-space-lg">
        <div className="text-center mb-space-lg">
          <h2 className="text-headline-sm text-primary font-extrabold">ویژگی‌های اپلیکیشن ریشه</h2>
          <div className="ornament-line my-3 max-w-[220px] mx-auto">
            <span className="ornament-diamond" />
          </div>
          <p className="text-body-sm text-on-surface-variant max-w-xl mx-auto leading-relaxed">
            همه امکانات سایت، با سرعت و سادگی بیشتر — طراحی‌شده برای دسترسی روزمره به گنجینه هنر ایران.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.icon}
              className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 elevation-1 p-4 sm:p-5 flex flex-col items-center text-center gap-2 hover:elevation-2 transition-shadow"
            >
              <span className="w-11 h-11 rounded-2xl bg-tertiary-fixed/50 text-on-tertiary-container flex items-center justify-center shrink-0">
                <MSymbol name={f.icon} size={24} />
              </span>
              <h3 className="text-sm sm:text-[15px] font-extrabold text-primary leading-snug">{f.title}</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Install steps ---------- */}
      <section className="max-w-7xl mx-auto px-gutter py-space-lg">
        <div className="text-center mb-space-lg">
          <h2 className="text-headline-sm text-primary font-extrabold">نصب در سه گام کوتاه</h2>
          <div className="ornament-line my-3 max-w-[220px] mx-auto">
            <span className="ornament-diamond" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {STEPS.map((s, i) => (
            <div
              key={s.icon}
              className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 elevation-1 p-5 flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-primary text-on-primary flex items-center justify-center shrink-0">
                  <MSymbol name={s.icon} size={22} />
                </span>
                <h3 className="text-[15px] font-extrabold text-primary leading-snug">{s.title}</h3>
              </div>
              <ol className="flex flex-col gap-2">
                {s.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-[13px] text-on-surface-variant leading-relaxed">
                    <span className="w-5 h-5 mt-0.5 rounded-full bg-tertiary-fixed/60 text-tertiary-container text-[11px] font-black flex items-center justify-center shrink-0">
                      {faNum(j + 1)}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="max-w-3xl mx-auto px-gutter py-space-lg">
        <div className="text-center mb-space-lg">
          <h2 className="text-headline-sm text-primary font-extrabold">پرسش‌های پرتکرار نصب</h2>
          <div className="ornament-line my-3 max-w-[220px] mx-auto">
            <span className="ornament-diamond" />
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          {FAQ.map((f, i) => (
            <div
              key={i}
              className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq((v) => (v === i ? null : i))}
                aria-expanded={openFaq === i}
                className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 text-right"
              >
                <span className="flex items-center gap-2.5 text-[14px] font-bold text-primary leading-snug">
                  <MSymbol name="help_outline" size={20} className="text-on-tertiary-container shrink-0" />
                  {f.q}
                </span>
                <MSymbol
                  name="expand_more"
                  size={22}
                  className={`text-on-surface-variant shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`}
                />
              </button>
              {openFaq === i && (
                <p className="px-4 sm:px-5 pb-4 pr-12 text-[13px] text-on-surface-variant leading-relaxed">
                  {f.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Closing ornament ---------- */}
      <div className="pb-space-xl text-center">
        <div className="ornament-line max-w-[260px] mx-auto">
          <span className="ornament-diamond" />
        </div>
      </div>
    </div>
  );
}
