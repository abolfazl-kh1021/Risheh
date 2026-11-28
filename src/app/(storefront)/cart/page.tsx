import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { loadCartData } from "@/lib/data";
import { PageView } from "@/risheh/PageView";

export const metadata: Metadata = {
  title: "سبد خرید و تسویه‌حساب",
  description: "مراحل تسویه‌حساب: آدرس، روش ارسال، مرور سبد و پرداخت نمایشی.",
  robots: { index: false, follow: false },
};

/** سبد خرید و تسویه‌حساب چندمرحله‌ای (M5) — همه مبالغ سمت سرور. */
export default async function CartPage() {
  const user = await getCurrentUser();
  const { cart, addresses, shippingMethods } = await loadCartData();
  return (
    <PageView
      view="cart"
      route={{ view: "cart", query: {} }}
      data={{
        user,
        categories: [],
        cart,
        addresses,
        shippingMethods,
      }}
    />
  );
}
