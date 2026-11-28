import type { PaymentProvider } from "@/lib/payments/types";

/**
 * ZARINPAL PROVIDER — SKELETON ONLY (Won't-item of the scope).
 *
 * This file intentionally contains NO working integration, NO merchant keys
 * and NO network calls. It exists so that the go-live step is exactly:
 *   1. fill in the TODOs below against Zarinpal's request/verify API,
 *   2. set PAYMENT_PROVIDER=zarinpal and the three env vars,
 *   3. run the acceptance checklist in docs/GO_LIVE_PAYMENT_CHECKLIST.md.
 *
 * Orders, ledger and UI code NEVER change for this step — they only know the
 * PaymentProvider interface (docs/DECISIONS.md D-PAY).
 */

export class ZarinpalProvider implements PaymentProvider {
  name = "zarinpal";

  private merchantId: string | undefined;

  constructor() {
    // TODO(go-live): read process.env.PAYMENT_MERCHANT_ID (fail fast if missing).
    // NEVER fall back to a default key — a missing secret must throw.
    this.merchantId = undefined;
  }

  async request(_o: {
    invoiceOrOrderId: string;
    amount: number;
    callbackUrl: string;
    description?: string;
  }): Promise<{ authority: string; redirectUrl: string }> {
    throw new Error(
      "ZarinpalProvider is a skeleton (Won't item). Implement request() per docs/GO_LIVE_PAYMENT_CHECKLIST.md before enabling PAYMENT_PROVIDER=zarinpal."
    );
  }

  async verify(_o: { authority: string; amount: number }): Promise<{
    status: "SUCCESS" | "FAILED" | "CANCELED";
    refNumber?: string;
    raw?: unknown;
  }> {
    throw new Error(
      "ZarinpalProvider is a skeleton (Won't item). Implement verify() per docs/GO_LIVE_PAYMENT_CHECKLIST.md before enabling PAYMENT_PROVIDER=zarinpal."
    );
  }

  async refund(_o: { refNumber: string; amount: number }): Promise<{ ok: boolean; reference?: string }> {
    throw new Error("ZarinpalProvider.refund() is not implemented (Won't item).");
  }
}
