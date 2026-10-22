/**
 * Full-screen logo splash — shown while the server renders the app shell
 * (src/app/loading.tsx) and reused as the Suspense fallback of lazily-loaded
 * views. Pure presentational: works in server and client components.
 */
export function SplashScreen({ label = "در حال آماده‌سازی گنجینه هنر ایران…" }: { label?: string }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 select-none"
      style={{ background: "radial-gradient(circle at 50% 40%, #0d3833 0%, #07221e 100%)" }}
      role="status"
      aria-live="polite"
      aria-label="در حال بارگذاری"
    >
      {/* soft glow behind the logo */}
      <div className="relative flex items-center justify-center">
        <div className="absolute w-44 h-44 rounded-full bg-brand-gold/15 blur-2xl animate-pulse" />
        <img
          src="/assets/img/logo-mark.webp"
          alt="نشان ریشه"
          width={128}
          height={128}
          fetchPriority="high"
          className="relative w-28 h-28 object-contain animate-[splash-breathe_1.8s_ease-in-out_infinite]"
        />
        {/* spinner ring */}
        <svg
          className="absolute w-40 h-40 -rotate-90"
          viewBox="0 0 100 100"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="50" cy="50" r="46" stroke="#E8C97D" strokeOpacity="0.15" strokeWidth="2" />
          <circle
            cx="50"
            cy="50"
            r="46"
            stroke="#E8C97D"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="72 217"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 50 50"
              to="360 50 50"
              dur="1.1s"
              repeatCount="indefinite"
            />
          </circle>
        </svg>
      </div>

      <div className="flex flex-col items-center gap-2 px-6 text-center">
        <span className="text-3xl font-black text-brand-lightGold tracking-tight">ریشه</span>
        <span className="text-xs text-[#d8c9a8]/80">دست‌سازه‌های اصیل ایران</span>
        <span className="mt-3 text-[11px] text-[#d8c9a8]/60 flex items-center gap-1.5">
          {label}
          <span className="inline-flex gap-0.5">
            <Dot delay="0s" />
            <Dot delay="0.15s" />
            <Dot delay="0.3s" />
          </span>
        </span>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="w-1 h-1 rounded-full bg-brand-gold inline-block animate-bounce"
      style={{ animationDelay: delay }}
    />
  );
}
