import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import {
  PaymentNotFoundError,
  type PaymentProvider,
  type PaymentRequestInput,
  type PaymentRequestResult,
  type PaymentVerifyResult,
} from "@/lib/payments/types";

/**
 * DEMO PAYMENT PROVIDER — a faithful simulation of a real redirect gateway.
 *
 * Flow (mirrors Zarinpal-style gateways exactly):
 *  1. request()   → creates a server-issued authority and returns the demo
 *                   gateway page URL `/pay/demo/[authority]` (clearly labeled
 *                   «نمایشی — پول واقعی جابه‌جا نمی‌شود»).
 *  2. The payer picks an outcome ON THE DEMO GATEWAY PAGE; a SERVER ACTION
 *                   stores that choice in `PaymentAttempt.demoOutcome` — the
 *                   client never sends the result to the callback.
 *  3. The gateway page redirects to the shared callback URL; the callback
 *                   route calls verify() which reads the SERVER-STORED outcome.
 *  4. verify()    → SUCCESS | FAILED | CANCELED + demo reference number.
 *
 * No real money ever moves. Every message in the flow carries the «نمایشی»
 * label (M6 honesty rule).
 */

export class DemoPaymentProvider implements PaymentProvider {
  name = "demo";

  async request(o: PaymentRequestInput): Promise<PaymentRequestResult> {
    const authority = `DEMO-${randomBytes(12).toString("hex")}`;
    return {
      authority,
      redirectUrl: `/pay/demo/${encodeURIComponent(authority)}`,
    };
  }

  async verify({ authority }: { authority: string; amount: number }): Promise<PaymentVerifyResult> {
    // The authoritative result lives in OUR database (server-side record of
    // what happened on the demo gateway page) — never in a query parameter.
    const attempt = await db.paymentAttempt.findUnique({
      where: { authority },
      select: { demoOutcome: true },
    });
    if (!attempt) throw new PaymentNotFoundError(authority);

    switch (attempt.demoOutcome) {
      case "SUCCESS":
        return {
          status: "SUCCESS",
          refNumber: `DEMO-REF-${randomBytes(5).toString("hex").toUpperCase()}`,
          raw: { simulated: true, provider: "demo" },
        };
      case "FAILED":
        return { status: "FAILED", raw: { simulated: true, reason: "gateway_failure" } };
      case "CANCELED":
        return { status: "CANCELED", raw: { simulated: true, reason: "user_canceled" } };
      default:
        // No recorded outcome: treat as user abandonment.
        return { status: "CANCELED", raw: { simulated: true, reason: "no_outcome_recorded" } };
    }
  }

  async refund({ amount }: { refNumber: string; amount: number }): Promise<{ ok: boolean; reference?: string }> {
    // Demo refund: always "succeeds" locally, clearly labeled in the ledger.
    return {
      ok: true,
      reference: `DEMO-REFUND-${randomBytes(5).toString("hex").toUpperCase()}-${amount}`,
    };
  }
}
