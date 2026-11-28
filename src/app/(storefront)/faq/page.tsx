import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "پرسش‌های متداول",
  description: "پاسخ پرسش‌های رایج خرید و فروش در بازارچه ریشه.",
  alternates: { canonical: "/faq" },
};

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "ریشه چگونه کار می‌کند؟",
    a: "ریشه یک بازارچه C2C است: استادکار و کارگاه خانوادگی اثر خود را ثبت و پس از بازبینی مدیریت منتشر می‌کنند و خریدار مستقیماً از سازنده خرید می‌کند. ریشه خودش کالا نمی‌فروشد؛ درآمد پلتفرم از کارمزد ثبت آگهی، پلن‌های اشتراک و کارمزد فروش است.",
  },
  {
    q: "پرداخت چگونه انجام می‌شود؟",
    a: "پرداخت‌ها در این نسخه از طریق درگاه نمایشی شبیه‌سازی می‌شوند — پول واقعی جابه‌جا نمی‌شود و برچسب «نمایشی» در همه‌ی مراحل دیده می‌شود. اتصال درگاه واقعی طبق مستند GO_LIVE_PAYMENT_CHECKLIST فقط با یک Adapter انجام می‌شود.",
  },
  {
    q: "شناسنامه اصالت به چه معناست؟",
    a: "هر اثر یک رکورد دیجیتال در همین سامانه دارد (کد اثر/هولوگرام). این رکورد توسط ریشه نگهداری می‌شود و به معنای آزمایش فیزیکی یا گواهی آزمایشگاه مستقل خارجی نیست.",
  },
  {
    q: "سفارش چندفروشنده چگونه مدیریت می‌شود؟",
    a: "اگر سبد شما آثاری از چند کارگاه داشته باشد، سفارش به زیرسفارش‌های مستقل برای هر فروشنده تقسیم می‌شود؛ هر کارگاه وضعیت ارسال خود را جداگانه جلو می‌برد و وضعیت کلی سفارش از زیرسفارش‌ها مشتق می‌شود.",
  },
  {
    q: "موجودی و رزرو چگونه است؟",
    a: "هنگام ثبت سفارش، موجودی به مدت ۱۵ دقیقه برای شما رزرو می‌شود؛ اگر پرداخت نهایی نشود، رزرو آزاد و سفارش منقضی می‌شود.",
  },
  {
    q: "مرجوعی چگونه است؟",
    a: "پس از تحویل، از طریق صفحه سفارش درخواست مرجوعی ثبت کنید؛ پس از تایید مدیریت و بازگشت مرسول، مبلغ (نمایشی) بازگشت داده می‌شود.",
  },
];

export default function FaqPage() {
  return (
    <div className="max-w-3xl mx-auto px-gutter py-space-lg" dir="rtl">
      <h1 className="text-2xl font-bold text-primary mb-6">پرسش‌های متداول</h1>
      <div className="space-y-4">
        {FAQS.map((f, i) => (
          <details key={i} className="group bg-surface-container-low rounded-2xl p-4 border border-outline-variant/30">
            <summary className="flex items-center justify-between cursor-pointer font-semibold text-primary list-none">
              <span>{f.q}</span>
              <span className="text-on-surface-variant group-open:rotate-180 transition-transform">▾</span>
            </summary>
            <p className="mt-3 text-sm leading-7 text-on-surface-variant">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
