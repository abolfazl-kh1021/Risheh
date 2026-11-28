import { describe, expect, it } from "vitest";
import { applyBps, splitProportionally, clampMoney } from "@/lib/money";

describe("money — applyBps", () => {
  it("computes 10% commission exactly (integer math)", () => {
    expect(applyBps(1_890_000, 1000)).toBe(189_000);
    expect(applyBps(5_000_000, 1000)).toBe(500_000);
  });

  it("floors fractional commissions (no float creep)", () => {
    // 1,234,567 × 10% = 123,456.7 → 123,456
    expect(applyBps(1_234_567, 1000)).toBe(123_456);
    // 999 × 33% = 329.67 → 329
    expect(applyBps(999, 3300)).toBe(329);
  });

  it("rejects invalid inputs", () => {
    expect(() => applyBps(-1, 1000)).toThrow();
    expect(() => applyBps(100, 10001)).toThrow();
    expect(() => applyBps(0.5, 1000)).toThrow();
  });
});

describe("money — splitProportionally (largest remainder)", () => {
  it("parts always sum EXACTLY to the whole", () => {
    for (let i = 0; i < 200; i++) {
      const total = Math.floor(Math.random() * 5_000_000) + 1;
      const w = [1, 2, 3, 5, 7, 11].map((x) => x * (1 + (i % 3)));
      const parts = splitProportionally(total, w);
      const sum = parts.reduce((a, b) => a + b, 0);
      expect(sum).toBe(total);
      expect(parts.every((p) => Number.isInteger(p) && p >= 0)).toBe(true);
    }
  });

  it("proportional allocation for equal weights is equal", () => {
    const parts = splitProportionally(1001, [1, 1, 1]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(1001);
    // 1001/3 = 333.67 each; largest remainder gives [334, 334, 333] order-stable
    expect(parts).toEqual([334, 334, 333]);
  });

  it("single-seller order gets the whole discount", () => {
    expect(splitProportionally(500_000, [2_500_000])).toEqual([500_000]);
  });

  it("zero weights keep the invariant", () => {
    expect(splitProportionally(700, [0, 0])).toEqual([700, 0]);
  });

  it("multi-seller discount split is proportional and exact", () => {
    // order.discount=100,000 over two sellers with gross 2.5M and 1.89M
    const parts = splitProportionally(100_000, [2_500_000, 1_890_000]);
    expect(parts[0] + parts[1]).toBe(100_000);
    const expected0 = (100_000 * 2_500_000) / 4_390_000; // ≈ 56,947.6
    expect(Math.abs(parts[0] - expected0)).toBeLessThanOrEqual(1);
    expect(parts[1]).toBe(100_000 - parts[0]);
  });

  it("clampMoney clamps", () => {
    expect(clampMoney(5000, 0, 1000)).toBe(1000);
    expect(clampMoney(-5, 0, 1000)).toBe(0);
  });
});
