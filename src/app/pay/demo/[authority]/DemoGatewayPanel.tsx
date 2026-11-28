"use client";

import { useState, useTransition } from "react";
import { recordDemoOutcomeAction } from "@/lib/actions/demo-gateway";

/**
 * Client buttons of the demo gateway. Each button calls a SERVER action that
 * records the chosen outcome in the database and redirects to the shared
 * callback route — the client never passes the result to the callback itself.
 */
export function DemoGatewayPanel({ authority }: { authority: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const choose = (outcome: "SUCCESS" | "FAILED" | "CANCELED") => {
    setError(null);
    startTransition(async () => {
      const res = await recordDemoOutcomeAction({ authority, outcome });
      if (!res.ok) setError(res.error);
    });
  };

  return (
    <div className="mt-6">
      <p className="text-sm font-semibold text-on-surface mb-3">نتیجه تراکنش نمایشی را انتخاب کنید:</p>
      <div className="grid gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => choose("SUCCESS")}
          className="rounded-full bg-emerald-800 text-white px-6 py-3 text-sm font-semibold disabled:opacity-60 hover:bg-emerald-900 transition-colors"
        >
          پرداخت موفق (نمایشی)
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => choose("FAILED")}
          className="rounded-full bg-red-800 text-white px-6 py-3 text-sm font-semibold disabled:opacity-60 hover:bg-red-900 transition-colors"
        >
          پرداخت ناموفق (شبیه‌سازی خطای درگاه)
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => choose("CANCELED")}
          className="rounded-full border border-outline text-on-surface px-6 py-3 text-sm font-semibold disabled:opacity-60 hover:bg-surface-container transition-colors"
        >
          انصراف از پرداخت
        </button>
      </div>
      {pending && <p className="mt-3 text-xs text-on-surface-variant">در حال ثبت نتیجه روی سرور…</p>}
      {error && <p className="mt-3 text-xs text-red-800">{error}</p>}
    </div>
  );
}
