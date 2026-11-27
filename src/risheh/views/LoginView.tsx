"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { MSymbol } from "@/components/icons";
import { loginAction, registerAction } from "@/lib/actions/auth";
import type { AppData } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = { data: AppData; navigate: (to: string) => void; refresh: () => void };

const PERKS = [
  { icon: "verified", title: "شناسنامه دیجیتال و نشان اصالت", desc: "صدور برگه تایید مهرشده و تاریخچه استادکار با قابلیت استعلام آنلاین" },
  { icon: "workspace_premium", title: "پیش‌نمایش شاهکارهای تک‌نسخه", desc: "اولویت ۴۸ ساعته جهت بازدید و تملک آثار ویژه پیش از رونمایی عمومی" },
  { icon: "shield_lock", title: "بیمه نفایس و ارسال حفاظتی", desc: "بسته‌بندی در جعبه‌های اختصاصی چوب گردو با ضمانت بازگشت بی‌قیدوشرط" },
  { icon: "support_agent", title: "مشاوره تبارشناسی و چیدمان هنر", desc: "جلسات برخط با کارشناسان رسمی وزارت میراث و اساتید پیشکسوت" },
];

const TRUST = [
  { icon: "encrypted", title: "رمزنگاری SSL ۲۵۶", desc: "امنیت فوق‌پیشرفته داده‌ها" },
  { icon: "verified_user", title: "انطباق با شاپرک و افتا", desc: "درگاه معتبر پرداخت نفایس" },
  { icon: "headset_mic", title: "پشتیبانی زنده ۲۴/۷", desc: "راهنمایی تخصصی هنر" },
];

export function LoginView({ navigate, refresh }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const [role, setRole] = useState<"collector" | "artisan">("collector");
  const [mainTab, setMainTab] = useState<"login" | "register">("login");
  const [loginMethod, setLoginMethod] = useState<"otp" | "pwd">("pwd");
  const [busy, setBusy] = useState(false);

  // login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [phone, setPhone] = useState("");

  // register fields
  const [rName, setRName] = useState("");
  const [rPhone, setRPhone] = useState("");
  const [rEmail, setREmail] = useState("");
  const [rPwd, setRPwd] = useState("");
  const [rWorkshop, setRWorkshop] = useState("");
  const [rProvince, setRProvince] = useState("");
  const [agree, setAgree] = useState(false);

  const afterAuth = (msg?: string) => {
    toast({ title: "خوش آمدید", description: msg ?? "ورود با موفقیت انجام شد." });
    refresh();
    navigate("dashboard");
    router.refresh();
  };

  const doLogin = async () => {
    setBusy(true);
    const res = await loginAction({ email, password });
    setBusy(false);
    if (res.ok) afterAuth();
    else toast({ title: "ورود ناموفق", description: res.error, variant: "destructive" });
  };

  const doRegister = async () => {
    if (!agree) {
      toast({ title: "تایید شرایط", description: "برای عضویت باید شرایط اصالت و حریم خصوصی را بپذیرید.", variant: "destructive" });
      return;
    }
    setBusy(true);
    const res = await registerAction({
      name: rName,
      email: rEmail,
      password: rPwd,
      role: role === "artisan" ? "ARTISAN" : "BUYER",
      workshop: rWorkshop,
      province: rProvince,
    });
    setBusy(false);
    if (res.ok) afterAuth(res.message);
    else toast({ title: "ثبت‌نام ناموفق", description: res.error, variant: "destructive" });
  };

  return (
    <div className="persian-pattern-subtle py-space-lg">
      <div className="max-w-7xl mx-auto px-gutter grid grid-cols-1 lg:grid-cols-2 gap-space-lg items-stretch">
        {/* ===== Brand panel ===== */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary-container via-[#0a332f] to-primary text-surface-bright p-8 md:p-10 flex flex-col justify-between min-h-[420px]">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full border-8 border-tertiary-fixed-dim" />
            <div className="absolute bottom-10 right-10 w-40 h-40 rotate-45 border border-secondary-fixed" />
          </div>
          <div className="relative z-10">
            <div className="ornament-line justify-start mb-4">
              <span className="ornament-diamond" />
              <span className="text-xs font-semibold tracking-wider text-tertiary-fixed-dim">سرای اهل هنر و کلکسیونرهای اصیل</span>
            </div>
            <h1 className="font-headline-xl !text-[24px] !leading-[40px] sm:!text-[28px] sm:!leading-[44px] font-extrabold leading-tight mb-3">
              گنجینه نفایس ایران؛ دسترسی اختصاصی به شاهکارهای تک‌نسخه
            </h1>
            <p className="text-sm text-on-primary-container leading-relaxed mb-6">
              با ورود به سرای ریشه، تاریخچه و شناسنامه دیجیتال دست‌سازه‌های فاخر را در قالبی امن و با اصالت رهگیری نمایید.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PERKS.map((p) => (
                <div key={p.title} className="bg-surface-bright/5 border border-on-primary-container/20 rounded-2xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MSymbol name={p.icon} size={18} className="text-tertiary-fixed-dim" />
                    <p className="text-xs font-bold">{p.title}</p>
                  </div>
                  <p className="text-[11px] text-on-primary-container leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative z-10 mt-6 flex items-start gap-2 bg-surface-bright/10 rounded-2xl p-4">
            <MSymbol name="format_quote" className="text-tertiary-fixed-dim shrink-0" />
            <p className="text-xs leading-relaxed text-on-primary-container">
              <span className="font-bold text-tertiary-fixed-dim">مانیفست هنر ریشه:</span> «هر اثر دست‌ساز، تپش پاره‌ای از
              روح، رنج و حکمت فرهنگ کهن ایران در دل خانه و آرامش روزگار شماست.»
            </p>
          </div>
        </div>

        {/* ===== Auth panel ===== */}
        <div className="bg-surface-container-lowest rounded-3xl elevation-1 p-6 md:p-8 flex flex-col gap-4">
          <div>
            <h2 className="font-headline-lg text-primary font-extrabold">
              {mainTab === "login" ? "خوش‌آمدید به گنجینه ریشه" : "عضویت در خانواده دوستداران هنر"}
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">
              {mainTab === "login"
                ? "روش ورود مورد علاقه خود را انتخاب کنید و به پنل خود متصل شوید."
                : "اطلاعات خود را کامل کنید تا به سرای ریشه بپیوندید."}
            </p>
          </div>

          {/* Role selector */}
          <div>
            <p className="text-xs font-bold text-on-surface-variant mb-2">نقش کاربری در سرای ریشه:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("collector")}
                className={cn(
                  "flex items-center gap-2.5 p-2.5 rounded-lg border-2 transition-all text-right",
                  role === "collector"
                    ? "bg-surface-container-lowest border-primary text-primary shadow-sm"
                    : "bg-surface-container-lowest/60 border-transparent hover:border-outline-variant text-on-surface-variant"
                )}
              >
                <MSymbol name="diamond" size={20} />
                <span className="flex flex-col">
                  <span className="text-xs font-bold">خریدار و کلکسیونر</span>
                  <span className="text-[10px] opacity-80">خرید آثار اصیل و دریافت شناسنامه</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setRole("artisan")}
                className={cn(
                  "flex items-center gap-2.5 p-2.5 rounded-lg border-2 transition-all text-right",
                  role === "artisan"
                    ? "bg-surface-container-lowest border-primary text-primary shadow-sm"
                    : "bg-surface-container-lowest/60 border-transparent hover:border-outline-variant text-on-surface-variant"
                )}
              >
                <MSymbol name="palette" size={20} />
                <span className="flex flex-col">
                  <span className="text-xs font-bold">فروشنده و استادکار</span>
                  <span className="text-[10px] opacity-80">عرضه آثار فاخر و نگارخانه‌ها</span>
                </span>
              </button>
            </div>
          </div>

          {/* Main tabs */}
          <div className="flex gap-2 bg-surface-container rounded-full p-1.5">
            <button
              type="button"
              onClick={() => setMainTab("login")}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2",
                mainTab === "login" ? "text-on-primary bg-primary-container shadow-sm" : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              <MSymbol name="login" size={17} />
              ورود به حساب کاربری
            </button>
            <button
              type="button"
              onClick={() => setMainTab("register")}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2",
                mainTab === "register" ? "text-on-primary bg-primary-container shadow-sm" : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              <MSymbol name="person_add" size={17} />
              ایجاد حساب کاربری
            </button>
          </div>

          {mainTab === "login" && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLoginMethod("otp")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                    loginMethod === "otp" ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant hover:text-primary"
                  )}
                >
                  <MSymbol name="sms" size={16} />
                  ورود با رمز یک‌بار مصرف (پیامک)
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod("pwd")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                    loginMethod === "pwd" ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant hover:text-primary"
                  )}
                >
                  <MSymbol name="key" size={16} />
                  ورود با کلمه عبور
                </button>
              </div>

              {loginMethod === "otp" ? (
                <div className="rounded-2xl border border-tertiary-fixed-dim/60 bg-tertiary-fixed/30 p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <MSymbol name="info" size={20} className="text-on-tertiary-fixed-variant" />
                    <p className="text-sm font-bold text-on-tertiary-fixed-variant">سرویس پیامک در حالت نمایشی فعال نیست</p>
                  </div>
                  <p className="text-xs text-on-tertiary-fixed-variant leading-relaxed">
                    ارسال رمز یک‌بار مصرف به اتصال به سامانه پیامک ایرانی نیاز دارد که در این محیط نمایشی پیکربندی
                    نشده است. لطفاً از روش «ورود با کلمه عبور» استفاده کنید. (هیچ کد نمایشی جعلی ارسال نمی‌شود.)
                  </p>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="۰۹۱۲۱۸۸۳۰۴۰"
                    aria-label="شماره تلفن همراه"
                    disabled
                    title="غیرفعال — سرویس پیامک پیکربندی نشده است"
                    className="bg-surface-bright border border-outline-variant/50 rounded-xl px-3 py-2.5 text-sm opacity-60 cursor-not-allowed"
                  />
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void doLogin();
                  }}
                  className="flex flex-col gap-4"
                >
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-on-surface-variant">نشانی رایانامه</span>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full bg-surface-container-low rounded-xl py-2.5 pr-9 pl-9 text-sm border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <MSymbol name="mail" size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline" />
                    </div>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-on-surface-variant">کلمه عبور</span>
                    <div className="relative">
                      <input
                        type={showPwd ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-surface-container-low rounded-xl py-2.5 pr-9 pl-10 text-sm border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <MSymbol name="lock" size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline" />
                      <button
                        type="button"
                        onClick={() => setShowPwd((v) => !v)}
                        aria-label="نمایش/پنهان‌سازی کلمه عبور"
                        className="absolute left-3 text-outline hover:text-on-surface transition-colors p-1"
                      >
                        <MSymbol name={showPwd ? "visibility_off" : "visibility"} size={18} />
                      </button>
                    </div>
                  </label>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-3.5 px-6 rounded-lg bg-primary-container text-on-primary text-sm font-bold hover:bg-secondary transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <MSymbol name="door_open" size={18} />
                    {busy ? "در حال ورود…" : "ورود به گنجینه ریشه"}
                  </button>
                </form>
              )}

              {/* Demo accounts — clearly labeled */}
              <div className="rounded-2xl border border-secondary/30 bg-secondary/5 p-4">
                <p className="text-xs font-bold text-secondary flex items-center gap-1.5 mb-2">
                  <MSymbol name="science" size={15} />
                  حساب‌های نمایشی (حالت دمو — بدون احراز هویت واقعی)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  {[
                    { email: "buyer@risheh.ir", label: "خریدار" },
                    { email: "artisan@risheh.ir", label: "استادکار" },
                    { email: "admin@risheh.ir", label: "مدیر" },
                  ].map((a) => (
                    <button
                      key={a.email}
                      type="button"
                      onClick={() => {
                        setEmail(a.email);
                        setPassword("risheh1403");
                        setLoginMethod("pwd");
                      }}
                      className="bg-surface-bright rounded-lg px-2 py-1.5 border border-outline-variant/40 hover:border-secondary text-right"
                    >
                      <span className="font-bold text-primary">{a.label}</span>
                      <span className="block text-on-surface-variant" dir="ltr">
                        {a.email}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-on-surface-variant mt-2">
                  گذرواژه همه حساب‌های نمایشی: <span dir="ltr" className="font-bold">risheh1403</span> — با کلیک روی هر حساب،
                  فیلدها به‌صورت خودکار پر می‌شوند.
                </p>
              </div>
            </div>
          )}

          {mainTab === "register" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void doRegister();
              }}
              className="flex flex-col gap-3"
            >
              {role === "artisan" && (
                <div className="rounded-xl bg-primary-fixed/30 border border-primary-fixed-dim/50 p-3 text-[11px] text-on-primary-fixed-variant flex items-start gap-2">
                  <MSymbol name="palette" size={16} className="shrink-0 mt-0.5" />
                  ثبت‌نام به‌عنوان استادکار، درخواست پیوستن به گنجینه را ایجاد می‌کند که پس از تایید مدیریت و ارزیابی
                  آزمایشگاه، غرفه شما فعال می‌شود.
                </div>
              )}
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-on-surface-variant">نام و نام خانوادگی (جهت صدور شناسنامه اثر)</span>
                <div className="relative">
                  <input
                    required
                    value={rName}
                    onChange={(e) => setRName(e.target.value)}
                    placeholder="مثال: آرش کامانی"
                    className="w-full bg-surface-container-low rounded-xl py-2.5 pr-9 pl-3 text-sm border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <MSymbol name="badge" size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline" />
                </div>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-on-surface-variant">نشانی رایانامه</span>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={rEmail}
                    onChange={(e) => setREmail(e.target.value)}
                    placeholder="you@example.com"
                    dir="ltr"
                    className="w-full bg-surface-container-low rounded-xl py-2.5 px-3 text-sm border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary text-left"
                  />
                </div>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-on-surface-variant">شماره تلفن همراه</span>
                <div className="relative">
                  <input
                    value={rPhone}
                    onChange={(e) => setRPhone(e.target.value)}
                    placeholder="09123456789"
                    dir="ltr"
                    className="w-full bg-surface-container-low rounded-xl py-2.5 px-3 text-sm border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary text-left"
                  />
                  <MSymbol name="phone_iphone" size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline" />
                </div>
              </label>
              {role === "artisan" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-on-surface-variant">نام کارگاه / نگارخانه</span>
                    <input
                      value={rWorkshop}
                      onChange={(e) => setRWorkshop(e.target.value)}
                      placeholder="مثال: کارگاه میناکاری نظری"
                      className="bg-surface-container-low rounded-xl py-2.5 px-3 text-sm border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-on-surface-variant">استان</span>
                    <input
                      value={rProvince}
                      onChange={(e) => setRProvince(e.target.value)}
                      placeholder="مثال: همدان"
                      className="bg-surface-container-low rounded-xl py-2.5 px-3 text-sm border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </label>
                </div>
              )}
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-on-surface-variant">تعیین کلمه عبور امن</span>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={rPwd}
                    onChange={(e) => setRPwd(e.target.value)}
                    placeholder="حداقل ۸ نویسه"
                    className="w-full bg-surface-container-low rounded-xl py-2.5 pr-9 pl-10 text-sm border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <MSymbol name="lock" size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline" />
                </div>
              </label>
              <label className="flex items-start gap-2 text-[11px] text-on-surface-variant leading-relaxed">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-0.5 accent-[#186969]"
                />
                با عضویت، تمامی شرایط اصالت اثر و تعهدات کلکسیونی ریشه و ضوابط حفظ حریم خصوصی را می‌پذیرم.
              </label>
              <button
                type="submit"
                disabled={busy}
                className="w-full py-4 px-6 rounded-lg bg-primary text-on-primary text-sm font-bold hover:bg-secondary transition-all shadow-md flex items-center justify-between disabled:opacity-60"
              >
                <span className="flex items-center gap-2">
                  <MSymbol name="card_giftcard" size={18} />
                  {busy ? "در حال ثبت…" : "ثبت‌نام و پیوستن به سرای ریشه"}
                </span>
                <span className="text-xs font-bold">۵۰۰,۰۰۰ تومان اعتبار هدیه</span>
              </button>
            </form>
          )}

          {/* Trust row */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-outline-variant/30">
            {TRUST.map((t) => (
              <div key={t.title} className="flex flex-col items-center text-center gap-1 py-1">
                <MSymbol name={t.icon} size={20} className="text-secondary" />
                <span className="text-[10px] font-bold text-primary">{t.title}</span>
                <span className="text-[9px] text-outline">{t.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
