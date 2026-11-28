import { describe, expect, it } from "vitest";
import {
  assertTransition,
  canTransition,
  deriveOrderStatus,
  LISTING_MACHINE,
  ORDER_MACHINE,
  PAYOUT_MACHINE,
  SELLER_ORDER_MACHINE,
  SUBSCRIPTION_MACHINE,
  RETURN_MACHINE,
  TransitionError,
} from "@/lib/state-machines";

describe("listing machine (§۴.۲)", () => {
  it("DRAFT → PENDING_REVIEW → PUBLISHED is legal", () => {
    expect(canTransition(LISTING_MACHINE, "DRAFT", "PENDING_REVIEW")).toBe(true);
    expect(canTransition(LISTING_MACHINE, "PENDING_REVIEW", "PUBLISHED")).toBe(true);
  });

  it("REJECTED can be edited and resubmitted", () => {
    expect(canTransition(LISTING_MACHINE, "REJECTED", "PENDING_REVIEW")).toBe(true);
    expect(canTransition(LISTING_MACHINE, "REJECTED", "ARCHIVED")).toBe(true);
  });

  it("PUBLISHED cannot go directly to SOLD-or-back arbitrarily", () => {
    expect(canTransition(LISTING_MACHINE, "PUBLISHED", "DRAFT")).toBe(false);
    expect(canTransition(LISTING_MACHINE, "PUBLISHED", "PENDING_REVIEW")).toBe(false);
    expect(canTransition(LISTING_MACHINE, "PUBLISHED", "EXPIRED")).toBe(true);
    expect(canTransition(LISTING_MACHINE, "PUBLISHED", "SOLD")).toBe(true);
  });

  it("SOLD is terminal", () => {
    expect(LISTING_MACHINE.SOLD).toEqual([]);
  });

  it("assertTransition throws for illegal transitions", () => {
    expect(() => assertTransition(LISTING_MACHINE, "listing", "SOLD", "PUBLISHED")).toThrow(TransitionError);
    expect(() => assertTransition(LISTING_MACHINE, "listing", "DRAFT", "PUBLISHED")).toThrow(TransitionError);
  });
});

describe("order machines (M7)", () => {
  it("buyer path PAID → PREPARING → SHIPPED → DELIVERED", () => {
    expect(canTransition(ORDER_MACHINE, "PAID", "PREPARING")).toBe(true);
    expect(canTransition(ORDER_MACHINE, "PREPARING", "SHIPPED")).toBe(true);
    expect(canTransition(ORDER_MACHINE, "SHIPPED", "DELIVERED")).toBe(true);
    expect(canTransition(ORDER_MACHINE, "DELIVERED", "SHIPPED")).toBe(false);
  });

  it("PENDING_PAYMENT can only be paid, fail, cancel, or expire", () => {
    expect(canTransition(ORDER_MACHINE, "PENDING_PAYMENT", "PAID")).toBe(true);
    expect(canTransition(ORDER_MACHINE, "PENDING_PAYMENT", "PAYMENT_FAILED")).toBe(true);
    expect(canTransition(ORDER_MACHINE, "PENDING_PAYMENT", "CANCELLED")).toBe(true);
    expect(canTransition(ORDER_MACHINE, "PENDING_PAYMENT", "EXPIRED")).toBe(true);
    expect(canTransition(ORDER_MACHINE, "PENDING_PAYMENT", "DELIVERED")).toBe(false);
  });

  it("PAYMENT_FAILED allows retry, EXPIRED is terminal", () => {
    expect(canTransition(ORDER_MACHINE, "PAYMENT_FAILED", "PENDING_PAYMENT")).toBe(true);
    expect(ORDER_MACHINE.EXPIRED).toEqual([]);
  });

  it("seller sub-order machine forbids skipping steps", () => {
    expect(canTransition(SELLER_ORDER_MACHINE, "PAID", "SHIPPED")).toBe(false);
    expect(canTransition(SELLER_ORDER_MACHINE, "PREPARING", "DELIVERED")).toBe(false);
    expect(canTransition(SELLER_ORDER_MACHINE, "SHIPPED", "DELIVERED")).toBe(true);
    expect(canTransition(SELLER_ORDER_MACHINE, "DELIVERED", "CANCELLED")).toBe(false);
  });

  it("derive parent status from sub-orders", () => {
    expect(deriveOrderStatus(["DELIVERED", "DELIVERED"])).toBe("DELIVERED");
    expect(deriveOrderStatus(["PAID", "PREPARING"])).toBe("PREPARING");
    expect(deriveOrderStatus(["PAID", "PAID"], "PAID")).toBe("PAID");
    expect(deriveOrderStatus(["CANCELLED", "DELIVERED"])).toBe("DELIVERED");
    expect(deriveOrderStatus(["CANCELLED", "CANCELLED"])).toBe("CANCELLED");
    expect(deriveOrderStatus(["PAID", "SHIPPED", "PREPARING"])).toBe("SHIPPED");
  });
});

describe("payout machine (S6)", () => {
  it("PENDING → APPROVED | REJECTED only", () => {
    expect(canTransition(PAYOUT_MACHINE, "PENDING", "APPROVED")).toBe(true);
    expect(canTransition(PAYOUT_MACHINE, "PENDING", "PAID")).toBe(false);
    expect(canTransition(PAYOUT_MACHINE, "PENDING", "REJECTED")).toBe(true);
  });

  it("APPROVED → PAID | REJECTED; PAID terminal (no double payment)", () => {
    expect(canTransition(PAYOUT_MACHINE, "APPROVED", "PAID")).toBe(true);
    expect(canTransition(PAYOUT_MACHINE, "PAID", "PAID")).toBe(false);
    expect(canTransition(PAYOUT_MACHINE, "PAID", "APPROVED")).toBe(false);
    expect(canTransition(PAYOUT_MACHINE, "REJECTED", "PAID")).toBe(false);
  });
});

describe("subscription + return machines", () => {
  it("ACTIVE → EXPIRED | CANCELED only", () => {
    expect(canTransition(SUBSCRIPTION_MACHINE, "ACTIVE", "EXPIRED")).toBe(true);
    expect(canTransition(SUBSCRIPTION_MACHINE, "ACTIVE", "PENDING")).toBe(false);
  });

  it("return flow: PENDING → APPROVED → RECEIVED → REFUNDED", () => {
    expect(canTransition(RETURN_MACHINE, "PENDING", "APPROVED")).toBe(true);
    expect(canTransition(RETURN_MACHINE, "APPROVED", "RECEIVED")).toBe(true);
    expect(canTransition(RETURN_MACHINE, "RECEIVED", "REFUNDED")).toBe(true);
    expect(canTransition(RETURN_MACHINE, "PENDING", "REFUNDED")).toBe(false);
  });
});
