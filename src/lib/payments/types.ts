/**
 * Payment provider boundary (scope §۴.۶). Every paid flow in the platform —
 * buyer orders, listing registration fees, subscription purchases — goes
 * through THIS interface. Connecting a real gateway later means writing one
 * adapter and setting `PAYMENT_PROVIDER` + its env vars; nothing else changes
 * (see docs/GO_LIVE_PAYMENT_CHECKLIST.md).
 *
 * Honesty rules (non-negotiable):
 *  - The payment result is decided ONLY by the server after provider.verify().
 *  - A client query parameter is NEVER treated as proof of payment.
 *  - The demo provider is visibly labeled «نمایشی» everywhere; no real money.
 */

export type PaymentRequestInput = {
  /** Business reference: invoice number (preferred) or order number. */
  invoiceOrOrderId: string;
  amount: number; // Toman, integer
  callbackUrl: string; // server callback endpoint
  description?: string;
};

export type PaymentRequestResult = {
  authority: string; // provider token — the ONLY key used later
  redirectUrl: string; // where to send the payer (gateway page)
};

export type PaymentVerifyResult = {
  status: "SUCCESS" | "FAILED" | "CANCELED";
  refNumber?: string;
  raw?: unknown;
};

export interface PaymentProvider {
  name: string;
  /** Simulated or real gateway handshake. Must produce a server-issued authority. */
  request(o: PaymentRequestInput): Promise<PaymentRequestResult>;
  /** Authoritative verification — server-to-server (or server-DB for demo). */
  verify(o: { authority: string; amount: number }): Promise<PaymentVerifyResult>;
  /** Optional refund (real gateways only; demo returns labeled no-op). */
  refund?(o: { refNumber: string; amount: number }): Promise<{ ok: boolean; reference?: string }>;
}

/** Thrown when the provider cannot locate a payment. */
export class PaymentNotFoundError extends Error {
  constructor(public authority: string) {
    super(`payment not found: ${authority}`);
    this.name = "PaymentNotFoundError";
  }
}
