"use client";

import { useEffect } from "react";
import { onCLS, onINP, onLCP, onTTFB, onFCP } from "web-vitals";

/**
 * Real-user monitoring of Core Web Vitals.
 * Metrics are beaconed to /api/vitals; on Vercel you can additionally enable
 * Speed Insights (marketplace) — this sender stays useful either way.
 */
export function WebVitals() {
  useEffect(() => {
    const send = (metric: { name: string; value: number; rating: string; id: string }) => {
      try {
        const payload = JSON.stringify({
          name: metric.name,
          value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
          rating: metric.rating,
          id: metric.id,
          path: window.location.hash || "#/home",
          t: Date.now(),
        });
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/vitals", new Blob([payload], { type: "application/json" }));
        } else {
          fetch("/api/vitals", { method: "POST", body: payload, keepalive: true }).catch(() => {});
        }
      } catch {
        /* monitoring must never break the page */
      }
    };
    onCLS(send);
    onINP(send);
    onLCP(send);
    onTTFB(send);
    onFCP(send);
  }, []);
  return null;
}
