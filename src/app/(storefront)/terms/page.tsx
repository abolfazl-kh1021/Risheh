import type { Metadata } from "next";

export const metadata: Metadata = { title: "قوانین و مقررات", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-gutter py-space-lg leading-8 text-on-surface" dir="rtl">
      <h1 className="text-2xl font-bold text-primary mb-4">قوانین و مقررات استفاده</h1>
      <p className="text-sm text-on-surface-variant mb-4">این متن خلاصه‌ی قوانین دموی ریشه است و جایگزین مشاوره حقوقی نیست.</p>
      <h2 className="font-bold text-primary mt-6 mb-2">۱) نقش طرف‌ها</h2>
      <p>ریشه یک بازارچه C2C است؛ قرارداد خرید میان خریدار و فروشنده (استادکار) بسته می‌شود و ریشه نقش واسط پلتفرمی دارد.</p>
      <h2 className="font-bold text-primary mt-6 mb-2">۲) درآمد پلتفرم</h2>
      <p>کارمزد ثبت آگهی هنگام «ارسال برای بازبینی»، اشتراک پلن‌ها (رایگان تا طلایی) و کارمزد فروش از هر زیرسفارش. همه‌ی نرخ‌ها از پنل مدیریت و جدول تنظیمات قابل تغییر است.</p>
      <h2 className="font-bold text-primary mt-6 mb-2">۳) محتوای آگهی</h2>
      <p>مسئولیت صحت توصیف اثر، متریال و قیمت با فروشنده است. آگهی‌ها پیش از انتشار بازبینی می‌شوند و در صورت نقض قوانین رد می‌گردند.</p>
      <h2 className="font-bold text-primary mt-6 mb-2">۴) پرداخت نمایشی</h2>
      <p>در این نسخه هیچ پول واقعی جابه‌جا نمی‌شود؛ همه‌ی پرداخت‌ها و تسویه‌ها شبیه‌سازی‌شده و برچسب‌گذاری‌شده‌اند.</p>
      <h2 className="font-bold text-primary mt-6 mb-2">۵) مالکیت معنوی</h2>
      <p>تصاویر و متن‌ها متعلق به استادکاران است و استفاده تجاری از آن‌ها بدون اجازه مجاز نیست.</p>
    </div>
  );
}
