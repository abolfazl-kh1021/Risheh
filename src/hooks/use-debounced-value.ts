"use client";

import { useEffect, useState } from "react";

/**
 * Debounce a fast-changing value (search inputs, filters) so expensive
 * derived state / filtering only recomputes after typing settles.
 * The input itself stays fully controlled and responsive.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
