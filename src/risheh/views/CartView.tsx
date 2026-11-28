"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { MSymbol } from "@/components/icons";
import { faNum, faPrice } from "@/lib/fa";
import { removeCartItemAction, updateCartQuantityAction } from "@/lib/actions/cart";
import { checkDiscountCodeAction } from "@/lib/actions/discounts";
import { createOrderAction } from "@/lib/actions/orders";
import type { AppData } from "@/lib/types";
import type { DiscountInfo } from "@/lib/actions/discounts";
import { cn } from "@/lib/utils";

type Props = {
  data: AppData;
  navigate: (to: string) => void;
  refresh: () => void;
};

const SHIPPING_ICONS: Record<string, string> = {
  free: "local_shipping",
  courier: "two_wheeler",
  tipax: "schedule",
};

/** Render the variant JSON as readable chips (guards against legacy/invalid values). */
function parseVariant(variant: string): string[] {
  try {
    const parsed = JSON.parse(variant) as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof parsed.size === "string" && parsed.size) parts.push(parsed.size);
    if (typeof parsed.color === "string" && parsed.color) parts.push(`رنگ: ${parsed.color}`);
    if (typeof parsed.qty === "number" && parsed.qty > 1) parts.push(`تعداد: ${parsed.qty}`);
    return parts;
  } catch {
    return [variant];
  }
}

export function CartView({ data, navigate, refresh }: Props) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const methods = data.shippingMethods ?? [];
  const [shippingId, setShippingId] = useState(methods[0]?.id ?? "");
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const addresses = data.addresses ?? [];
  const [form, setForm] = useState({
    buyerName: data.user?.name ?? "",
    buyerPhone: "",
    city: "",
    address: "",
    postalCode: "",
    note: "",
  });
  // Checkout discount (S7): checked server-side, applied authoritatively by the
  // server at order creation — the numbers below are a display estimate only.
  const [couponInput, setCouponInput] = useState("");
  const [couponInfo, setCouponInfo] = useState<DiscountInfo | null>(null);
  const [couponMsg, setCouponMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);

  const cart = data.cart ?? [];
  const subtotal = useMemo(() => cart.reduce((s, c) => s + c.price * c.quantity, 0), [cart]);
  const shippingCost = methods.find((m) => m.id === shippingId)?.priceToman ?? 0;
  const couponEstimate = useMemo(() => {
    if (!couponInfo) return 0;
    let est =
      couponInfo.kind === "PERCENT"
        ? Math.floor((subtotal * couponInfo.amount) / 100)
        : couponInfo.amount;
    if (couponInfo.kind === "PERCENT" && couponInfo.maxPrice) est = Math.min(est, couponInfo.maxPrice);
    return Math.max(0, Math.min(est, subtotal));
  }, [couponInfo, subtotal]);
  const total = subtotal - couponEstimate + shippingCost;

  const applySavedAddress = (id: string) => {
    setSelectedAddressId(id);
    const a = addresses.find((x) => x.id === id);
    if (!a) return;
    setForm((f) => ({
      ...f,
      buyerName: a.receiverName,
      buyerPhone: a.phone,
      city: a.city,
      address: `${a.province}، ${a.line1}`,
      postalCode: a.postalCode ?? "",
    }));
  };

  const checkCoupon = async () => {
    const code = couponInput.trim();
    if (!code) {
      setCouponMsg({ text: "ابتدا کد تخفیف را وارد کنید.", error: true });
      return;
    }
    if (!data.user) {
      setCouponMsg({ text: "برای استفاده از کد تخفیف ابتدا وارد حساب خود شوید.", error: true });
      return;
    }
    setCouponBusy(true);
    const res = await checkDiscountCodeAction(code);
    setCouponBusy(false);
    if (!res.ok) {
      setCouponMsg({ text: res.error, error: true });
      return;
    }
    if (res.status === "VALID" && res.info) {
      if (res.info.minPrice && subtotal < res.info.minPrice) {
        setCouponMsg({
          text: `این کد برای سبد کمتر از ${faPrice(res.info.minPrice)} تومان قابل استفاده نیست.`,
          error: true,
        });
        return;
      }
      setCouponInfo(res.info);
      setCouponMsg({ text: `${res.message} — مبلغ تخفیف در ثبت سفارش به‌صورت قطعی در سرور محاسبه می‌شود.`, error: false });
    } else {
      setCouponInfo(null);
      setCouponMsg({ text: res.message, error: true });
    }
  };

  const clearCoupon = () => {
    setCouponInfo(null);
    setCouponInput("");
    setCouponMsg(null);
  };

  const setQty = async (itemId: string, qty: number) => {
    const res = await updateCartQuantityAction(itemId, qty);
    if (res.ok) refresh();
    else toast({ title: "خطا", description: res.error, variant: "destructive" });
  };

  const remove = async (itemId: string) => {
    const res = await removeCartItemAction(itemId);
    if (res.ok) {
      toast({ title: "سبد خرید", description: res.message });
      refresh();
    } else toast({ title: "خطا", description: res.error, variant: "destructive" });
  };

  const checkout = async () => {
    if (!shippingId) {
      toast({ title: "روش ارسال", description: "یک شیوه ارسال انتخاب کنید.", variant: "destructive" });
      return;
    }
    setBusy(true);
    const res = await createOrderAction({
      ...form,
      shippingMethodId: shippingId,
      addressId: selectedAddressId,
      discountCode: couponInfo?.code ?? "",
    });
    setBusy(false);
    if (res.ok) {
      // Full navigation to the PAYMENT GATEWAY (demo or real) — the callback
      // decides the outcome server-side and redirects to the order page.
      toast({ title: "سفارش ثبت شد", description: `موجودی تا پرداخت برای شما رزرو شد — سفارش ${res.orderNumber}` });
      window.location.href = res.redirectUrl;
    } else {
      toast({ title: "ثبت سفارش ناموفق", description: res.error, variant: "destructive" });
    }
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-gutter py-space-xl">
        <div className="bg-surface-container-lowest rounded-2xl elevation-1 p-12 text-center flex flex-col items-center gap-3">
          <MSymbol name="shopping_bag" size={48} className="text-outline" />
          <p className="font-headline-lg text-primary font-bold">سبد خرید شما خالی است</p>
          <p className="text-sm text-on-surface-variant">از گنجینه آثار اصیل ریشه دیدن فرمایید و شاهکار خود را برگزینید.</p>
          <button
            onClick={() => navigate("categories/all")}
            className="mt-2 bg-primary text-on-primary rounded-xl px-6 py-3 text-sm font-bold hover:bg-primary-container transition"
          >
            مشاهده گنجینه آثار
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-gutter py-space-lg pb-space-xl">
      {/* Steps */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 mb-6 flex-wrap">
        <Step icon="check_circle" label="سبد خرید" sub={`${faNum(cart.length)} اثر گزیده`} active />
        <span className="text-tertiary-fixed-dim">✦</span>
        <Step icon="local_shipping" label="مشخصات و ارسال" sub="در حال تکمیل" />
        <span className="text-tertiary-fixed-dim">✦</span>
        <Step icon="account_balance_wallet" label="بازبینی و پرداخت" sub="درگاه امن" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
        {/* ===== Items + address ===== */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-3.5 sm:p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline-md text-primary font-bold flex items-center flex-wrap gap-x-2 gap-y-1">
                <MSymbol name="shopping_basket" className="text-secondary" />
                سبد خرید شما
                <span className="text-xs font-medium text-on-surface-variant">
                  {faNum(cart.length)} اثر فاخر دست‌ساز با شناسنامه اختصاصی
                </span>
              </h2>
            </div>
            <div className="flex flex-col gap-3">
              {cart.map((item) => (
                <div key={item.id} className="flex gap-3 bg-surface-container-low rounded-2xl p-3">
                  { }
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => navigate(`product/${item.artworkId}`)}
                        className="font-bold text-sm text-primary text-right hover:text-secondary transition line-clamp-2"
                      >
                        {item.title}
                      </button>
                      <button
                        onClick={() => remove(item.id)}
                        title="حذف از سبد"
                        aria-label="حذف از سبد"
                        className="text-outline hover:text-error transition-colors p-1.5 rounded-full hover:bg-error-container/30 shrink-0"
                      >
                        <MSymbol name="close" size={18} />
                      </button>
                    </div>
                    <p className="text-[11px] text-outline mt-1">
                      کد اثر: {item.code} ✦ استادکار: {item.sellerName}
                    </p>
                    {item.variant && (
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        {parseVariant(item.variant).map((v, i) => (
                          <span key={i} className="text-[10px] text-on-tertiary-container bg-tertiary-fixed/40 rounded-full px-2 py-0.5">
                            {v}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-on-surface-variant">تعداد:</span>
                        <button
                          onClick={() => setQty(item.id, item.quantity - 1)}
                          aria-label="کاهش تعداد"
                          className="text-primary hover:text-secondary p-1.5 -m-1 rounded-full hover:bg-surface-container"
                        >
                          <MSymbol name="remove" size={16} />
                        </button>
                        <span className="text-sm font-bold w-6 text-center">{faNum(item.quantity)}</span>
                        <button
                          onClick={() => setQty(item.id, item.quantity + 1)}
                          disabled={item.quantity >= Math.min(item.available, item.stock)}
                          title={item.quantity >= Math.min(item.available, item.stock) ? "اثر تک‌نسخه یا حداکثر موجودی قابل رزرو" : undefined}
                          aria-label="افزایش تعداد"
                          className={cn(
                            "p-1.5 -m-1 rounded-full",
                            item.quantity >= item.stock
                              ? "text-outline/40 cursor-not-allowed"
                              : "text-primary hover:text-secondary"
                          )}
                        >
                          <MSymbol name="add" size={16} />
                        </button>
                        {Math.min(item.available, item.stock) <= 1 && (
                          <span className="text-[10px] text-pomegranate">(تنها ۱ نسخه موجود در جهان)</span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-black text-primary">{faPrice(item.price * item.quantity)}</span>
                        <span className="text-[10px] text-on-surface-variant">تومان</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-3.5 sm:p-4">
            <h2 className="font-headline-sm text-primary font-bold flex items-center gap-2 mb-3">
              <MSymbol name="pin_drop" className="text-secondary" />
              نشانی تحویل مرسوله
            </h2>
            {data.user && addresses.length > 0 && (
              <div className="mb-3 flex flex-col gap-2">
                <p className="text-[11px] font-bold text-on-surface-variant">دفترچه نشانی‌ها:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {addresses.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => applySavedAddress(a.id)}
                      className={cn(
                        "text-right rounded-xl border p-2.5 text-[11px] leading-5 transition",
                        selectedAddressId === a.id
                          ? "border-primary bg-secondary/5"
                          : "border-outline-variant/40 hover:border-outline bg-surface-bright"
                      )}
                    >
                      <span className="font-bold text-primary">{a.title}</span>
                      {a.isDefault && <span className="mr-1 text-[9px] text-secondary">(پیش‌فرض)</span>}
                      <br />
                      <span className="text-on-surface-variant">{a.city}، {a.line1}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!data.user && (
              <p className="mb-3 text-[11px] rounded-lg px-3 py-2 bg-tertiary-fixed/40 text-on-tertiary-fixed-variant">
                به‌عنوان مهمان خرید می‌کنید؛ پس از پرداخت می‌توانید با «شماره سفارش + شماره موبایل» سفارش را پیگیری کنید.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="نام تحویل‌گیرنده" value={form.buyerName} onChange={(v) => setForm({ ...form, buyerName: v })} placeholder="مثال: علیرضا شمس‌آبادی" required />
              <Field label="شماره تماس" value={form.buyerPhone} onChange={(v) => setForm({ ...form, buyerPhone: v })} placeholder="09123456789" ltr required />
              <Field label="شهر" value={form.city} onChange={(v) => setForm({ ...form, city: v })} placeholder="تهران" required />
              <Field label="کد پستی" value={form.postalCode} onChange={(v) => setForm({ ...form, postalCode: v })} placeholder="1969734512" ltr />
              <div className="sm:col-span-2">
                <Field label="نشانی کامل" value={form.address} onChange={(v) => setForm({ ...form, address: v })} placeholder="خیابان، کوچه، پلاک، واحد…" textarea required />
              </div>
              <div className="sm:col-span-2">
                <Field label="پیام به استادکار / یادداشت سفارش (اختیاری)" value={form.note} onChange={(v) => setForm({ ...form, note: v })} placeholder="مثال: لطفاً همراه با کارت تبریک خطاطی‌شده ارسال شود." textarea />
              </div>
            </div>
          </section>

          <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-3.5 sm:p-4">
            <h2 className="font-headline-sm text-primary font-bold flex items-center gap-2 mb-3">
              <MSymbol name="local_shipping" className="text-secondary" />
              شیوه ارسال و بسته‌بندی ایمن
            </h2>
            <div className="flex flex-col gap-2">
              {methods.map((o) => (
                <label
                  key={o.id}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition",
                    shippingId === o.id
                      ? "border-primary bg-secondary/5"
                      : "border-outline-variant/40 hover:border-outline bg-surface-bright"
                  )}
                >
                  <input
                    type="radio"
                    name="shipping"
                    checked={shippingId === o.id}
                    onChange={() => setShippingId(o.id)}
                    className="mt-1 accent-[#186969]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-primary flex items-center gap-1.5">
                        <MSymbol name={SHIPPING_ICONS[o.slug] ?? "local_shipping"} size={16} className="text-secondary" />
                        {o.title}
                      </span>
                      <span className="text-xs font-bold text-on-tertiary-container shrink-0">
                        {o.priceToman === 0 ? "رایگان (هدیه ریشه)" : `${faPrice(o.priceToman)} تومان`}
                      </span>
                    </div>
                    {o.description && <p className="text-[11px] text-on-surface-variant mt-1">{o.description}</p>}
                  </div>
                </label>
              ))}
            </div>
          </section>

          <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-3.5 sm:p-4">
            <h2 className="font-headline-sm text-primary font-bold flex items-center gap-2 mb-3">
              <MSymbol name="sell" className="text-secondary" />
              کد تخفیف یا بن‌کارت هدیه هنر
            </h2>
            <div className="flex gap-2">
              <input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && checkCoupon()}
                placeholder="کد تخفیف (از صفحه تخفیف‌ها دریافت کنید)…"
                aria-label="کد تخفیف"
                className="flex-1 bg-surface-container-low rounded-xl px-3 py-2.5 text-sm border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={checkCoupon}
                disabled={couponBusy}
                className="h-11 px-5 rounded-xl bg-primary-container text-on-primary hover:bg-secondary transition-colors text-xs font-bold shrink-0 shadow-sm disabled:opacity-60"
              >
                {couponBusy ? "در حال بررسی…" : "بررسی کد"}
              </button>
              {couponInfo && (
                <button
                  type="button"
                  onClick={clearCoupon}
                  className="h-11 px-3 rounded-xl bg-surface-container-low text-on-surface-variant hover:text-error transition-colors text-xs font-bold shrink-0"
                  aria-label="حذف کد تخفیف"
                >
                  حذف کد
                </button>
              )}
            </div>
            {couponMsg && (
              <p
                className={cn(
                  "mt-2 text-[11px] rounded-lg px-3 py-1.5",
                  couponMsg.error
                    ? "bg-error-container/40 text-on-error-container"
                    : "bg-secondary/10 text-secondary"
                )}
              >
                {couponMsg.text}
              </p>
            )}
            {!data.user && (
              <p className="mt-2 text-[11px] text-outline">
                کدهای تخفیف حساب‌محور هستند؛ برای دریافت یا استفاده، وارد حساب خود شوید.
              </p>
            )}
          </section>
        </div>

        {/* ===== Summary ===== */}
        <aside className="flex flex-col gap-4">
          <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-4 lg:sticky lg:top-[140px]">
            <h2 className="font-headline-sm text-primary font-bold flex items-center gap-2 mb-3">
              <MSymbol name="receipt_long" className="text-secondary" />
              صورت‌حساب سفارش
            </h2>
            <div className="flex flex-col gap-2 text-sm">
              <Row label={`مجموع بهای آثار (${faNum(cart.length)} قلم):`} value={`${faPrice(subtotal)} تومان`} />
              {couponInfo && couponEstimate > 0 && (
                <Row
                  label={`تخفیف کد ${couponInfo.code}:`}
                  value={`${faPrice(couponEstimate)} تومان تخفیف`}
                  accent
                />
              )}
              <Row label="بسته‌بندی کادویی و بیمه مرسوله:" value="رایگان (هدیه ریشه)" />
              <Row label="هزینه حمل و نقل ایمن:" value={shippingCost === 0 ? "رایگان" : `${faPrice(shippingCost)} تومان`} />
              <div className="border-t border-dashed border-outline-variant/50 my-1" />
              <div className="flex items-center justify-between">
                <span className="font-bold text-primary">مبلغ قابل پرداخت:</span>
                <span className="flex items-baseline gap-1">
                  <span className="text-headline-md font-black text-primary">{faPrice(total)}</span>
                  <span className="text-xs text-on-surface-variant">تومان</span>
                </span>
              </div>
            </div>
            <button
              onClick={checkout}
              disabled={busy}
              className="w-full h-14 mt-4 rounded-xl bg-primary-container text-on-primary hover:bg-secondary font-headline-sm font-bold flex items-center justify-center gap-3 transition-all duration-300 shadow-md disabled:opacity-60"
            >
              {busy ? "در حال ثبت سفارش…" : "ادامه فرآیند و پرداخت امن بانکی"}
              <MSymbol name="arrow_left_alt" />
            </button>
            <p className="text-[10px] text-outline mt-2 flex items-center gap-1">
              <MSymbol name="lock" size={12} />
              مبلغ نهایی و موجودی پیش از پرداخت در سرور بازبینی می‌شود؛ موجودی ۱۵ دقیقه رزرو می‌ماند.
            </p>
            <p className="mt-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[10px] px-3 py-2 leading-5">
              درگاه پرداخت این نسخه «نمایشی» است — پول واقعی جابه‌جا نمی‌شود.
            </p>
          </section>

          <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-4 flex flex-col gap-3">
            <MiniGuarantee icon="workspace_premium" title="شناسنامه فیزیکی هولوگرام‌دار" desc="تضمین اصالت صددرصدی همراه با امضای زنده استادکار" />
            <MiniGuarantee icon="security" title="بیمه کامل سلامت مرسوله" desc="جبران کامل خسارت در صورت آسیب‌دیدگی احتمالی در مسیر" />
            <MiniGuarantee icon="published_with_changes" title="۷ روز ضمانت بازگشت بی‌قید و شرط" desc="امکان مرجوعی و عودت آنی تمام وجه" />
          </section>

          <div className="bg-tertiary-fixed/40 border border-tertiary-fixed-dim/60 rounded-2xl p-3 flex items-start gap-2 text-[11px] text-on-tertiary-fixed-variant leading-relaxed">
            <MSymbol name="headset_mic" size={18} className="shrink-0 mt-0.5" />
            نیاز به مشاوره پیش از خرید دارید؟ کارشناسان هنر ریشه در کنار شما هستند: ۰۲۱-۱۲۳۴۵۶۷۸
          </div>
        </aside>
      </div>
    </div>
  );
}

function Step({ icon, label, sub, active }: { icon: string; label: string; sub: string; active?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-2xl px-3 py-2", active ? "bg-secondary/10 border border-secondary/40" : "opacity-70")}>
      <MSymbol name={icon} className={active ? "text-secondary" : "text-outline"} size={20} />
      <div className="flex flex-col">
        <span className={cn("text-xs font-bold", active ? "text-primary" : "text-on-surface-variant")}>{label}</span>
        <span className="text-[10px] text-outline">{sub}</span>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between text-on-surface-variant">
      <span>{label}</span>
      <span className={cn("font-bold", accent ? "text-secondary" : "text-on-surface")}>{value}</span>
    </div>
  );
}

function MiniGuarantee({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-9 h-9 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
        <MSymbol name={icon} size={18} />
      </div>
      <div>
        <p className="text-xs font-bold text-primary">{title}</p>
        <p className="text-[10px] text-on-surface-variant">{desc}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea,
  ltr,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
  ltr?: boolean;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold text-on-surface-variant">
        {label} {required && <span className="text-error">*</span>}
      </span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="bg-surface-container-low rounded-xl px-3 py-2.5 text-sm border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          dir={ltr ? "ltr" : undefined}
          className={cn(
            "bg-surface-container-low rounded-xl px-3 py-2.5 text-sm border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary",
            ltr && "text-left"
          )}
        />
      )}
    </label>
  );
}
