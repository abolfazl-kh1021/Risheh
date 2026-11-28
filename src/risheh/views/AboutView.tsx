"use client";

import { MSymbol } from "@/components/icons";
import { faNum } from "@/lib/fa";

const STATS = [
  { icon: "handshake", value: "+۴۵۰", title: "استادکار اصیل و معتبر", desc: "پیشکسوتان درجه‌یک و اساتید دارنده مهر اصالت ملی" },
  { icon: "verified", value: "+۱۲,۰۰۰", title: "اثر با رکورد دیجیتال اصالت", desc: "با کد یکتا و رکورد ثبت‌شده در همین سامانه (نمایشی)" },
  { icon: "explore", value: "۲۸", title: "استان تحت پوشش کارگاهی", desc: "از سیستان و بلوچستان تا آذربایجان و نگین اصفهان" },
  { icon: "science", value: "۱۰۰٪", title: "تضمین متریال و رنگ طبیعی", desc: "طیف‌سنجی الیاف، عیارسنجی فلز و رنگرزی گیاهی سنتی" },
];

const PILLARS = [
  { icon: "biotech", title: "کارشناسی اصالت و متریال (داخلی ریشه)", desc: "هیچ اثری در ریشه منتشر نمی‌شود مگر پس از بازبینی کارشناسان ریشه؛ بررسی مستندات متریال و رنگرزی سنتی. کارشناسی ریشه داخلی است و به‌معنای گواهی آزمایشگاه یا مرجع مستقل بیرونی نیست.", check: "رکورد دیجیتال اصالت هر اثر" },
  { icon: "volunteer_activism", title: "توانمندسازی اقتصاد بومی", desc: "حذف زنجیره‌های دلالی و پرداخت مستقیم دستمزد شرافتمندانه به استادکاران؛ اختصاص بیش از ۷۰ درصد بهای نهایی به خالق اثر و صندوق توسعه پایدار کارگاه‌های روستایی.", check: "سرمایه‌گذاری در آموزش شاگردان جوان" },
  { icon: "fingerprint", title: "شناسنامه دیجیتال و کد استعلام", desc: "ثبت تاریخچه ساخت، نام استاد و مشخصات فنی در رکورد دیجیتال ریشه با کد یکتا؛ استعلام برخط در صفحه «استعلام اصالت». (هولوگرام فیزیکی در این نسخه وجود ندارد.)", check: "استعلام برخط با کد اثر" },
  { icon: "inventory_2", title: "بسته‌بندی موزه‌ای و بیمه", desc: "ارسال در هاردباکس‌های دست‌ساز فاخر با عایق‌های ضدضربه و ضدقارچ، همراه با سند چاپی مالکیت روی کاغذ کتان سنتی، پلمب مومی و پوشش بیمه‌ای ۱۰۰ درصدی نقل‌وانتقال.", check: "ارسال امن به سراسر ایران و جهان" },
];

const TIMELINE = [
  { year: "۱۳۹۸", title: "آغاز ایده", sub: "پیمایش میدانی ۵۰ روستای هنرخیز", desc: "سفر بنیان‌گذاران ریشه به دورافتاده‌ترین کارگاه‌های فارس، اصفهان و یزد و مصاحبه مستند با بیش از ۱۰۰ استادکار پیشکسوت برای شناسایی گره‌های کور توزیع هنر سنتی.", when: "پاییز و زمستان ۱۳۹۸" },
  { year: "۱۳۹۹", title: "اعتبارسنجی معیارها", sub: "تدوین چک‌لیست کارشناسی مواد و رنگ", desc: "گردآوری معیارهای کیفی ارزیابی دست‌سازه‌ها با راهنمایی پژوهشگران صنایع‌دستی؛ مبنای بازبینی داخلی آثار پیش از انتشار (بدون آزمایشگاه فیزیکی).", when: "بهار ۱۳۹۹" },
  { year: "۱۴۰۰", title: "فناوری اسناد", sub: "رونمایی رکورد دیجیتال اصالت", desc: "زیرساخت ثبت یکتای هر دست‌ساز در پایگاه‌داده ریشه؛ رکورد شامل تایید کتبی استاد سازنده و مشخصات فنی، با استعلام برخط (نمایشی).", when: "تابستان ۱۴۰۰" },
  { year: "۱۴۰۱", title: "هم‌افزایی استادکاران", sub: "پیوستن استادکاران برجسته به شبکه ریشه", desc: "همکاری اختصاصی با بزرگان قلم‌زنی، منبت، گلیم‌بافی و خاتم‌کاری ایران و گشایش شبکه پشتیبانی از هنرمندان مستقل در استان‌های کشور (روایت دمو).", when: "پاییز ۱۴۰۱" },
  { year: "۱۴۰۲ - اکنون", title: "نگارخانه مرکزی", sub: "تاسیس سرای مرکزی ریشه و گسترش جهانی", desc: "گشایش سالن نمایشگاهی و شوروم تخصصی در خیابان استاد نجات‌اللهی تهران و آغاز صادرات مستقیم بسته‌های هاردباکس به کلکسیونرهای مقیم اروپا و حاشیه خلیج فارس.", when: "افق ماندگار امروز" },
];

const COUNCIL = [
  { img: "img_98822300f662.webp", place: "اصفهان / تهران", degree: "دکتری پژوهش هنر دانشگاه تهران", name: "دکتر علیرضا میرصادقی", role: "مدیر ارشد هنری و سرپرست کیوریتوری", bio: "نویسنده ۳ جلد دانشنامه نقوش کهن و ارزیاب ارشد اصالت آثار فلزی و منبت تاریخی در موزه‌های ملی.", exp: "سابقه: ۲۲ سال", icon: "verified_user" },
  { img: "img_cec8ef7dae09.webp", place: "تبریز / تهران", degree: "متخصص طیف‌سنجی رنگ و الیاف", name: "مهندس پروانه پاکزاد", role: "کارشناس متریال و رنگ ریشه", bio: "کارشناسی مستندات متریال ابریشم و کرک دست‌ریس و راستی‌آزمایی روایت رنگ‌های گیاهی در فرایند بازبینی داخلی آثار.", exp: "سابقه: ۱۶ سال", icon: "biotech" },
  { img: "img_council_qashqaei.webp", place: "شیراز / یزد", degree: "پژوهشگر مردم‌شناسی و ایلات", name: "محمدرضا قشقایی", role: "مدیر ارتباط با کارگاه‌ها و عشایر", bio: "پلی مطمئن میان چادرهای بافندگان قشقایی و بختیاری و نگارخانه ریشه؛ معمار شبکه عدالت دستمزد در روستاها.", exp: "سابقه: ۱۹ سال", icon: "hub" },
  { img: "img_631a04288db5.webp", place: "تهران", degree: "متخصص بلاک‌چین و آرشیو امن", name: "مهندس نیما بهشتی", role: "مدیر اسناد دیجیتال و هویت مجازی", bio: "طراح سامانه ثبت یکتای شناسنامه‌های رمزنگاری‌شده و ردیابی زنجیره تامین دست‌ساخته‌ها.", exp: "سابقه: ۱۱ سال", icon: "vpn_key" },
];

const LICENSES = [
  { icon: "account_balance", title: "میراث فرهنگی (نمونه)", desc: "چارچوب همکاری با نهادهای میراثی — نمونه‌ی دمو، بدون ادعای مجوز واقعی" },
  { icon: "workspace_premium", title: "شبکه استادکاران (نمونه)", desc: "ارتباط مستقیم با استادکاران دارای نشان‌های هنری — نمونه‌ی دمو" },
  { icon: "verified", title: "قیمت‌گذاری مشارکتی (نمونه)", desc: "تعیین قیمت با توافق استادکار — نمونه‌ی دمو، بدون ادعای عضویت اتحادیه" },
  { icon: "shield_with_heart", title: "بسته‌بندی ایمن (نمونه)", desc: "بسته‌بندی ضربه‌گیر و بیمه‌شده در روایت دمو — بدون قرارداد بیمه واقعی" },
];

export function AboutView() {
  return (
    <div className="pb-space-xl">
      {/* Hero */}
      <section className="persian-pattern-subtle border-b border-outline-variant/30">
        <div className="max-w-7xl mx-auto px-gutter py-space-xl text-center">
          <div className="inline-flex items-center gap-2 bg-surface-container-lowest rounded-full px-4 py-1.5 elevation-1 text-xs font-bold text-on-tertiary-container mb-4">
            <MSymbol name="temp_preferences_custom" size={16} />
            روایت هویت و میثاق‌نامه نگارخانه ریشه
            <span className="text-tertiary-fixed-dim">✦</span>
            <span className="text-on-surface-variant">تأسیس ۱۳۹۸</span>
          </div>
          <h1 className="font-headline-xl !text-[26px] !leading-[42px] sm:!text-[34px] sm:!leading-[52px] text-primary font-extrabold mb-4 max-w-3xl mx-auto">
            ریشه؛ پیوند اصالت هنر ایرانی و زندگی معاصر
          </h1>
          <p className="text-body-lg text-on-surface-variant leading-relaxed max-w-3xl mx-auto text-justify">
            ما ریشه دوانده‌ایم در خاکی که هزاران سال، سرانگشتان نیاکانمان خاک را به کیمیا و تاروپود را به
            جاودانگی پیوند زده است. رسالت ما در «ریشه»، تنها عرضه دست‌ساخته‌ها نیست؛ بلکه احیای حرمت هنر بومی،
            شناسنامه‌دار کردن آثار فاخر و شکستن زنجیره ناعادلانه واسطه‌هاست تا نام و رنج استادکاران نام‌آور و
            گمنام سراسر فلات ایران، با شکوهی درخور به حافظه روزگار معاصر سنجاق شود.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-gutter py-space-lg">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.title} className="bg-surface-container-lowest rounded-2xl elevation-1 p-4 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center">
                  <MSymbol name={s.icon} size={20} />
                </div>
                <span className="text-headline-md font-black text-primary">{s.value}</span>
              </div>
              <p className="text-sm font-bold text-primary mt-1">{s.title}</p>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Story */}
      <section className="max-w-7xl mx-auto px-gutter py-space-lg">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-space-lg items-stretch">
          <div className="lg:col-span-2 relative rounded-3xl overflow-hidden min-h-[300px] elevation-1">
            { }
            <img src="/assets/img/img_08307b5171ff.webp" alt="میراث زنده — هنر دستی" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-primary-container/70 via-transparent" />
            <div className="absolute bottom-4 right-4 left-4 text-surface-bright">
              <p className="text-xs font-bold flex items-center gap-1.5">
                <MSymbol name="history_edu" size={16} className="text-tertiary-fixed-dim" />
                میراث زنده
              </p>
              <p className="text-sm mt-1 leading-relaxed">
                هنر دستی، زمانِ منجمدشده در کالبد ماده است؛ پاسخی عاشقانه به شتاب‌زدگی دنیای ماشینی.
              </p>
              <p className="text-xs text-tertiary-fixed-dim font-bold mt-1">۷۰۰+ ساعت کار مستمر دست</p>
            </div>
          </div>
          <div className="lg:col-span-3 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-on-tertiary-container text-xs font-bold mb-2">
              <MSymbol name="auto_stories" size={18} />
              روایت نگارخانه ریشه
            </div>
            <h2 className="font-headline-lg text-primary font-extrabold leading-snug mb-4">
              دست‌ساز؛ تنفس جان آدمی در برابر انجماد خطوط تولید صنعتی
            </h2>
            <p className="text-body-md text-on-surface-variant leading-relaxed mb-3 text-justify">
              ریشه از یک پرسش دردناک اما صادقانه در پاییز ۱۳۹۸ آغاز شد: چرا دست‌ساخته‌ای که ماه‌ها از عمر و
              بینایی یک استادکار سالخورده در میبد یا روستاهای کویری قائنات را گرفته است، باید با بهایی ناچیز به
              دلالان واگذار شود و با شناسنامه‌ای جعلی یا مجهول در بازارهای لوکس پایتخت دست به دست گردد؟
            </p>
            <p className="text-body-md text-on-surface-variant leading-relaxed text-justify">
              ما کوله‌بار بستیم و به ژرفای کویرها، کوهپایه‌ها و کوچه‌پس‌کوچه‌های هنرخیز ایران سفر کردیم. با
              پیرزنی در روستاهای مرزی سیستان که سوزن‌دوزی بلوچی را بی‌هیچ نقشه مکتوبی چون وحی روی پارچه می‌نشاند،
              و با پیرمرد خاتم‌کاری در اصفهان که میلیون‌ها مثلث چوب آبنوس و فلز برنج را با چشمان کم‌سو کنار هم
              می‌چید، همنشین شدیم. دریافتیم که بحران صنایع دستی ایران، فقدان خلاقیت نیست؛ بحرانِ بی‌اعتمادی،
              فقدان اعتبارسنجی علمی و جدایی هنر سنتی از زیبایی‌شناسی خانه مدرن است.
            </p>
            <div className="mt-4 bg-surface-container-low rounded-2xl p-4 flex items-start gap-3">
              <MSymbol name="format_quote" className="text-tertiary-fixed-dim shrink-0" />
              <div>
                <p className="text-sm font-bold text-primary">«هر دست‌ساز، تکه‌ای از روح و فرهنگ ایران کهن در خانه شماست.»</p>
                <p className="text-[11px] text-outline mt-1">مانیفست و مرام‌نامه اخلاقی نگارخانه صنایع دستی ریشه</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Four pillars */}
      <section className="max-w-7xl mx-auto px-gutter py-space-lg">
        <div className="text-center mb-space-lg">
          <div className="ornament-line mb-2">
            <span className="text-xs font-bold text-on-tertiary-container">ارکان چهارگانه ریشه</span>
          </div>
          <h2 className="font-headline-lg text-primary font-extrabold">
            معیارهایی سخت‌گیرانه برای خلق اعتماد جاودان
          </h2>
          <p className="text-sm text-on-surface-variant mt-2">
            ما تعریف تجمل را از جلوه‌گری ظاهری به اصالت، اخلاق و کارشناسی مستند بازگردانده‌ایم.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PILLARS.map((p) => (
            <div key={p.title} className="bg-surface-container-lowest rounded-2xl elevation-1 p-5 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
                  <MSymbol name={p.icon} size={22} />
                </div>
                <h3 className="font-headline-sm text-primary font-bold">{p.title}</h3>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed text-justify">{p.desc}</p>
              <p className="text-xs font-bold text-secondary flex items-center gap-1.5 mt-auto pt-1">
                <MSymbol name="check_circle" size={15} />
                {p.check}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="persian-pattern-subtle py-space-lg">
        <div className="max-w-7xl mx-auto px-gutter">
          <div className="text-center mb-space-lg">
            <div className="ornament-line mb-2">
              <span className="text-xs font-bold text-on-tertiary-container">مسیر پیموده شده</span>
            </div>
            <h2 className="font-headline-lg text-primary font-extrabold">گاه‌شمار سیر تعالی و احیای ریشه</h2>
            <p className="text-sm text-on-surface-variant mt-2">
              پنج سال هم‌قدم با استادکاران؛ گام‌به‌گام از یک آرمان تا یک نهاد معتبر ملی
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {TIMELINE.map((t, i) => (
              <div key={i} className="bg-surface-container-lowest rounded-2xl elevation-1 p-4 flex flex-col gap-1.5 relative">
                <span className="text-headline-md font-black text-on-tertiary-container">{t.year}</span>
                <span className="text-sm font-bold text-primary">{t.title}</span>
                <span className="text-[11px] font-bold text-secondary">{t.sub}</span>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">{t.desc}</p>
                <span className="text-[10px] text-outline mt-auto pt-2">{t.when}</span>
                <span className="absolute top-3 left-3 w-6 h-6 rounded-full bg-tertiary-fixed text-tertiary-container text-[11px] font-black flex items-center justify-center">
                  {faNum(i + 1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Council */}
      <section className="max-w-7xl mx-auto px-gutter py-space-lg">
        <div className="text-center mb-space-lg">
          <div className="ornament-line mb-2">
            <span className="text-xs font-bold text-on-tertiary-container">نگهبانان اصالت</span>
          </div>
          <h2 className="font-headline-lg text-primary font-extrabold">شورای ارزیابی، پژوهش و راهبری ریشه</h2>
          <p className="text-sm text-on-surface-variant mt-2">
            ترکیبی از اساتید دانشگاهی هنرهای سنتی، متخصصان ارزیابی شیمیایی و عاشقان میراث ماندگار سرزمین ایران.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COUNCIL.map((c) => (
            <div key={c.name} className="bg-surface-container-lowest rounded-2xl elevation-1 overflow-hidden">
              <div className="aspect-[4/3] overflow-hidden bg-surface-container">
                { }
                <img src={`/assets/img/${c.img}`} alt={c.name} loading="lazy" className="w-full h-full object-cover" />
              </div>
              <div className="p-4 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-on-tertiary-container">{c.place}</span>
                <span className="text-[11px] text-outline">{c.degree}</span>
                <span className="text-sm font-bold text-primary">{c.name}</span>
                <span className="text-xs font-bold text-secondary">{c.role}</span>
                <p className="text-[11px] text-on-surface-variant leading-relaxed mt-1">{c.bio}</p>
                <span className="text-[10px] text-outline flex items-center gap-1 mt-1">
                  <MSymbol name={c.icon} size={12} />
                  {c.exp}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Licenses */}
      <section className="max-w-7xl mx-auto px-gutter pb-space-lg">
        <div className="bg-primary-container text-surface-bright rounded-3xl p-6 md:p-8">
          <div className="text-center mb-4">
            <h2 className="font-headline-md font-bold">همکاران و چارچوب‌های حمایتی (نمونه نمایشی)</h2>
            <p className="text-xs text-on-primary-container mt-1">
              داده‌های این بخش نمونه‌ی دمو هستند؛ هیچ مجوز یا گواهی واقعی ادعا نمی‌شود.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {LICENSES.map((l) => (
              <div key={l.title} className="bg-surface-bright/5 border border-on-primary-container/20 rounded-2xl p-3 text-center flex flex-col items-center gap-1.5">
                <MSymbol name={l.icon} size={22} className="text-tertiary-fixed-dim" />
                <span className="text-xs font-bold">{l.title}</span>
                <span className="text-[10px] text-on-primary-container leading-relaxed">{l.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-gutter">
        <div className="bg-tertiary-fixed/40 border border-tertiary-fixed-dim rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-4 justify-between">
          <div>
            <h2 className="font-headline-md text-primary font-bold">دعوت به هم‌افزایی ملی</h2>
            <p className="text-sm text-on-tertiary-fixed-variant mt-1 leading-relaxed max-w-xl">
              آیا شما نیز خالق هنری اصیل هستید یا در جستجوی شاهکاری بی‌بدیل؟ درب‌های نگارخانه ریشه به روی تمام
              استادکاران، پژوهشگران و دارندگان کارگاه‌های خانوادگی در روستاهای ایران گشوده است.
            </p>
          </div>
          <div className="flex gap-3 shrink-0 flex-wrap">
            <button className="bg-surface-bright text-primary text-sm font-bold px-space-xl py-3 rounded-xl hover:bg-surface-container-high transition-colors shadow-lg">
              ورود به گنجینه و مشاهده آثار
            </button>
            <button className="bg-transparent border border-on-tertiary-container text-on-tertiary-container hover:bg-on-tertiary-container/10 text-sm font-bold px-space-xl py-3 rounded-xl transition-colors flex items-center gap-2">
              <MSymbol name="brush" size={18} />
              درخواست پذیرش اثر توسط استادکاران
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
