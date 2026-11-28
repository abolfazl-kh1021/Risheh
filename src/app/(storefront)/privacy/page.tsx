import type { Metadata } from "next";

export const metadata: Metadata = { title: "حریم خصوصی", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-gutter py-space-lg leading-8" dir="rtl">
      <h1 className="text-2xl font-bold text-primary mb-4">حریم خصوصی</h1>
      <p className="mb-4">حداقل داده‌ها فقط برای ارائه خدمات جمع می‌شود: نام، ایمیل، شماره تماس، آدرس ارسال و سابقه سفارش.</p>
      <h2 className="font-bold text-primary mt-6 mb-2">داده‌های پرداخت</h2>
      <p>در نسخه دمو هیچ داده بانکی واقعی پردازش نمی‌شود؛ درگاه نمایشی است و شماره کارت از شما پرسیده نمی‌شود.</p>
      <h2 className="font-bold text-primary mt-6 mb-2">کوکی‌ها</h2>
      <p>کوکی نشست (httpOnly) برای ورود و کوکی مهمان برای سبد خرید استفاده می‌شود؛ ردیابی تبلیغاتی نداریم.</p>
      <h2 className="font-bold text-primary mt-6 mb-2">حذف حساب</h2>
      <p>برای حذف حساب با پشتیبانی تماس بگیرید؛ سوابق مالی طبق قوانین مالیاتی بایگانی می‌شود.</p>
    </div>
  );
}
