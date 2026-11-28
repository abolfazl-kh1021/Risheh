/**
 * Integer money math (Toman). Every monetary calculation in the platform goes
 * through these helpers so that rounding is deterministic and sums are exact.
 *
 * Rule: never use floats for money; commission = floor(gross × bps / 10000)
 * computed with integer math, and multi-way splits use the largest-remainder
 * method so the parts always add up to the whole (no ۱-تومان losses).
 */

/** floor(n * bps / 10000) with pure integer math. bps = basis points (1000 = ۱۰٪). */
export function applyBps(amount: number, bps: number): number {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error(`invalid amount: ${amount}`);
  if (!Number.isSafeInteger(bps) || bps < 0 || bps > 10000) throw new Error(`invalid bps: ${bps}`);
  return Math.floor((amount * bps) / 10000);
}

/**
 * Split `total` into `n` proportional shares of weights, using largest-remainder
 * rounding so Σ shares === total exactly. Weights must be non-negative integers.
 */
export function splitProportionally(total: number, weights: number[]): number[] {
  if (!Number.isSafeInteger(total) || total < 0) throw new Error(`invalid total: ${total}`);
  const n = weights.length;
  if (n === 0) return [];
  const sumW = weights.reduce((s, w) => s + w, 0);
  if (sumW === 0) {
    // no positive weight: everything to the first bucket (nothing to allocate
    // for zero-value carts) — keeps the invariant Σ = total.
    return weights.map((_, i) => (i === 0 ? total : 0));
  }
  const exact = weights.map((w) => (total * w) / sumW);
  const floors = exact.map((v) => Math.floor(v));
  let remainder = total - floors.reduce((s, v) => s + v, 0);
  // distribute the remainder by largest fractional part (stable by index)
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; remainder > 0; k = (k + 1) % n) {
    floors[order[k % n].i] += 1;
    remainder -= 1;
  }
  return floors;
}

/** Clamp helper used by discount caps. */
export function clampMoney(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** true if `a` equals `b` exactly (defensive against float creep). */
export function moneyEquals(a: number, b: number): boolean {
  return Number.isSafeInteger(a) && Number.isSafeInteger(b) && a === b;
}
