import { DemoPaymentProvider } from "@/lib/payments/demo";
import { ZarinpalProvider } from "@/lib/payments/zarinpal";
import type { PaymentProvider } from "@/lib/payments/types";

/**
 * Provider registry — selected by the `PAYMENT_PROVIDER` env var.
 * `demo` is the default and the only honest choice until a real gateway
 * adapter is completed and reviewed (Won't until then).
 */

export function getPaymentProvider(): PaymentProvider {
  const name = (process.env.PAYMENT_PROVIDER ?? "demo").toLowerCase();
  switch (name) {
    case "demo":
      return new DemoPaymentProvider();
    case "zarinpal":
      return new ZarinpalProvider();
    default:
      throw new Error(`Unknown PAYMENT_PROVIDER: ${name} (supported: demo, zarinpal-skeleton)`);
  }
}

export * from "@/lib/payments/types";
