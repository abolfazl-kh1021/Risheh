"use client";

import { useState } from "react";
import { MSymbol } from "@/components/icons";
import { subscribeNewsletterAction } from "@/lib/actions/public";

export function SiteFooter({
  onNavigate,
  categories,
}: {
  onNavigate: (to: string) => void;
  categories: Array<{ slug: string; title: string }>;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ ok?: boolean; msg?: string; busy?: boolean }>({});

  const subscribe = async () => {
    setState({ busy: true });
    const res = await subscribeNewsletterAction({ email });
    setState({ ok: res.ok, msg: res.ok ? res.message : res.error });
    if (res.ok) setEmail("");
  };

  return (
    <footer className="w-full mt-auto bg-primary-container text-inverse-on-surface pt-space-xl pb-space-lg overflow-hidden">
      <div className="max-w-7xl mx-auto px-gutter">
        <div className="flex flex-col md:flex-row items-center justify-between pb-space-lg gap-space-md text-center md:text-start">
          <div className="flex items-center justify-center gap-space-sm sm:gap-space-md">
            <MSymbol name="qr_code_2" size={28} className="text-on-tertiary-container shrink-0" />
            <p className="font-headline-sm text-headline-sm text-on-tertiary-container font-bold">
              ریشه؛ پلی میان هنر اصیل ایرانی و زندگی مدرن
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-space-xs text-on-primary-container font-label-md text-label-md">
            <span>اصالت دست‌ساخته‌های میراث</span>
            <span>✦</span>
            <span>ایران کهن</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-space-lg gap-y-space-lg py-space-lg">
          <div className="flex flex-col gap-space-sm">
            <span className="font-headline-sm text-headline-sm text-surface-bright font-bold">
              درباره ریشه
            </span>
            <p className="font-body-sm text-body-sm text-on-primary-container leading-relaxed">
              سامانه تخصصی عرضه مستقیم دست‌آفریده‌های نفیس استادکاران ایران با شناسنامه اصالت
              فیزیکی و ضمانت رسمی بدون واسطه؛ خلق‌شده توسط استادکاران نام‌آور دیار اصفهان، یزد،
              تبریز و شیراز.
            </p>
            <div className="mt-2 flex flex-col gap-2">
              <span className="text-xs text-on-primary-container">
                از رونمایی آثار جدید و تخفیف‌های فصلی باخبر شوید:
              </span>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="رایانامه شما"
                  aria-label="رایانامه خبرنامه"
                  className="flex-1 min-w-0 bg-surface-container-lowest/10 border border-on-primary-container/30 rounded-xl px-3 py-2 text-xs text-surface-bright placeholder:text-on-primary-container/60 focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim"
                />
                <button
                  onClick={subscribe}
                  disabled={state.busy}
                  className="bg-tertiary-fixed-dim text-tertiary-container px-3 py-2 rounded-xl text-xs font-bold shrink-0 hover:brightness-110 transition disabled:opacity-60"
                >
                  عضویت
                </button>
              </div>
              {state.msg && (
                <p className={`text-[11px] ${state.ok ? "text-secondary-fixed" : "text-error-container"}`}>
                  {state.msg}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-space-sm">
            <span className="font-headline-sm text-headline-sm text-surface-bright font-bold">
              دسته‌بندی‌های برگزیده
            </span>
            <div className="flex flex-col gap-space-xs font-body-sm text-body-sm text-on-primary-container">
              {categories.slice(0, 4).map((c) => (
                <button
                  key={c.slug}
                  onClick={() => onNavigate(`categories/${c.slug}`)}
                  className="hover:text-surface-bright transition-colors text-right py-0.5"
                >
                  {c.title}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-space-sm">
            <span className="font-headline-sm text-headline-sm text-surface-bright font-bold">
              خدمات مشتریان ریشه
            </span>
            <div className="flex flex-col gap-space-xs font-body-sm text-body-sm text-on-primary-container">
              <button onClick={() => onNavigate("verify")} className="hover:text-surface-bright transition-colors text-right py-0.5">
                استعلام اصالت شناسنامه آثار
              </button>
              <button onClick={() => onNavigate("about")} className="hover:text-surface-bright transition-colors text-right py-0.5">
                روایت کارگاه‌ها و اساتید
              </button>
              <button onClick={() => onNavigate("contact")} className="hover:text-surface-bright transition-colors text-right py-0.5">
                همکاری با هنرمندان و مشاوره خرید
              </button>
              <button onClick={() => onNavigate("blog")} className="hover:text-surface-bright transition-colors text-right py-0.5">
                دانشنامه هنرهای دستی
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-space-sm">
            <span className="font-headline-sm text-headline-sm text-surface-bright font-bold">
              ارتباط و مشاوره هنر
            </span>
            <p className="font-body-sm text-body-sm text-on-primary-container">
              دفتر مرکزی: تهران، خیابان نجات‌اللهی (ویلا)، سرای صنایع دستی
            </p>
            <p className="font-label-md text-label-md text-on-tertiary-container">
              تلفن تماس: ۰۲۱-۱۲۳۴۵۶۷۸
            </p>
            <p className="font-body-sm text-body-sm text-on-primary-container">
              رایانامه: salam@risheh-crafts.ir
            </p>
          </div>
        </div>

        <div className="pt-space-md mt-space-md border-t border-on-primary-container/20 flex flex-col sm:flex-row items-center justify-between text-center sm:text-start text-on-primary-container font-label-sm text-label-sm gap-space-sm">
          <span>© تمامی حقوق مادی و معنوی برای نگارخانه صنایع‌دستی «ریشه» محفوظ است. © ۱۴۰۳</span>
          <span>✦ نقش ماندگار تمدن کهن ✦</span>
        </div>
      </div>
    </footer>
  );
}
