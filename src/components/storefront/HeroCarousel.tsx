"use client";

/**
 * Hero carousel — homepage slideshow (RTL-aware).
 *
 * Features (per request):
 *  - Slides move BOTH ways: pointer/touch drag to the left or to the right.
 *  - Timed autoplay: advances to the next slide automatically (paused while
 *    the visitor hovers/focuses or drags, so nothing jumps mid-read).
 *  - NO arrows — position is shown with clickable dots instead.
 *  - Every slide promotes a different section of the site and carries its
 *    own curated image.
 *
 * RTL note: the track itself is forced to `dir="ltr"` so `translateX` math
 * stays predictable, while every slide's content keeps the document's RTL
 * direction for correct Persian typography.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

export type CarouselSlide = {
  id: string;
  kicker: string;
  /** Gold lead-in of the headline. */
  titleGold: string;
  /** White remainder of the headline. */
  titleWhite: string;
  desc: string;
  cta: string;
  img: string;
  /** Hash-route target (e.g. "verify"). Mutually exclusive with scrollTarget. */
  target?: string;
  /** DOM id of an element on this page to scroll to (e.g. the app-install card). */
  scrollTarget?: string;
};

const AUTOPLAY_MS = 5000;
const DRAG_THRESHOLD = 60; // px of horizontal drag that counts as a slide change

/** Reactive prefers-reduced-motion (no setState-in-effect; lint-clean). */
function useReducedMotion(): boolean {
  const subscribe = useCallback((cb: () => void) => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}

export function HeroCarousel({
  slides,
  navigate,
}: {
  slides: CarouselSlide[];
  navigate: (to: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0); // live drag offset in px
  const [dragging, setDragging] = useState(false);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useReducedMotion();
  const startX = useRef(0);
  const movedRef = useRef(0); // how far the pointer travelled (px)

  const count = slides.length;
  const goTo = useCallback(
    (i: number) => setIndex(((i % count) + count) % count),
    [count]
  );
  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  // Timed autoplay — restarts on every interaction because `paused`/`dragging`
  // flip, which re-runs this effect.
  useEffect(() => {
    if (paused || dragging || count < 2) return;
    const t = setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % count);
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [paused, dragging, count]);

  // ---- pointer dragging (works for touch AND mouse) ----
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (count < 2) return;
    startX.current = e.clientX;
    movedRef.current = 0;
    setDragging(true);
    setDrag(0);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const delta = e.clientX - startX.current;
    movedRef.current = delta;
    setDrag(delta);
  };
  const endDrag = () => {
    if (!dragging) return;
    setDragging(false);
    const delta = movedRef.current;
    setDrag(0);
    if (delta <= -DRAG_THRESHOLD) next();
    else if (delta >= DRAG_THRESHOLD) prev();
  };
  // pointerleave does NOT bubble, so React has no `Capture` variant for it —
  // use the plain handler for both drag-end and autoplay resume.
  const onLeave = () => {
    endDrag();
    setPaused(false);
  };
  // Swallow the click that follows a real drag (buttons must not fire).
  const onClickCapture = (e: React.MouseEvent) => {
    if (Math.abs(movedRef.current) > DRAG_THRESHOLD / 2) {
      e.preventDefault();
      e.stopPropagation();
      movedRef.current = 0;
    }
  };

  const slideCta = (s: CarouselSlide) => {
    if (s.scrollTarget) {
      document
        .getElementById(s.scrollTarget)
        ?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
      return;
    }
    if (s.target) navigate(s.target);
  };

  const offset = `calc(${-(index * 100)}% + ${drag}px)`;

  return (
    <div
      dir="ltr"
      className="relative overflow-hidden select-none"
      style={{ touchAction: "pan-y" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={onLeave}
      onClickCapture={onClickCapture}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className="flex will-change-transform"
        style={{
          transform: `translateX(${offset})`,
          transition:
            dragging || reducedMotion
              ? "none"
              : "transform 560ms cubic-bezier(0.32, 0.08, 0.24, 1)",
        }}
      >
        {slides.map((s, i) => (
          <div
            key={s.id}
            dir="rtl"
            className="relative min-w-full flex overflow-hidden"
            aria-hidden={i !== index}
          >
            {/* Background image — unique per slide. Slide 1 keeps the original
                hero treatment; section slides show their image clearly. */}
            <div className="absolute inset-0 z-0">
              <img
                alt={s.kicker}
                src={s.img}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
                decoding="async"
                draggable={false}
                className={cn(
                  "w-full h-full object-cover scale-105",
                  i === 0 ? "object-left opacity-35 mix-blend-luminosity" : "object-center opacity-55"
                )}
              />
              {i === 0 ? (
                <>
                  <div className="absolute inset-0 bg-gradient-to-l from-[#082622] via-[#0b332e]/90 to-transparent" />
                  <div className="absolute inset-0 bg-radial from-transparent via-[#092b27]/40 to-[#071f1c]" />
                </>
              ) : (
                <>
                  {/* keep the text side dark, let the image breathe on the image side */}
                  <div className="absolute inset-0 bg-gradient-to-l from-[#082622] via-[#0b332e]/75 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071f1c]/45 via-transparent to-transparent" />
                </>
              )}
            </div>

            {/* Desktop framed artwork — slide 1 keeps the original hero look */}
            {i === 0 && (
              <div className="hidden lg:block relative z-10 w-1/2 h-full mr-8 pointer-events-none">
                <div className="relative w-full h-[440px] flex items-center justify-center">
                  <div className="absolute w-80 h-80 rounded-full bg-brand-gold/15 blur-2xl" />
                  <img
                    alt="نمایش هنرهای دستی ایرانی"
                    src="/assets/img/dl_af6f95412a.webp"
                    fetchPriority="high"
                    decoding="async"
                    draggable={false}
                    className="w-[420px] h-[360px] object-cover rounded-2xl shadow-2xl ring-4 ring-brand-gold/30 rotate-[-1deg]"
                  />
                </div>
              </div>
            )}

            {/* Copy */}
            <div className="relative z-10 w-full lg:w-1/2 p-6 sm:p-8 md:p-14 flex flex-col items-start justify-center min-h-[430px] sm:min-h-[460px] text-right">
              <div className="mb-3 text-brand-gold/80 flex items-center gap-2">
                <span className="w-8 h-px bg-brand-gold" />
                <span className="text-xs font-semibold tracking-wider">{s.kicker}</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4 tracking-tight drop-shadow-md">
                <span className="text-brand-lightGold">{s.titleGold}</span>
                {s.titleWhite ? ` ${s.titleWhite}` : ""}
              </h2>
              <p className="text-gray-200 text-sm md:text-base mb-6 md:mb-8 font-light max-w-md leading-relaxed opacity-95">
                {s.desc}
              </p>
              <button
                onClick={() => slideCta(s)}
                tabIndex={i === index ? 0 : -1}
                className="inline-flex items-center gap-3 bg-gradient-to-l from-brand-gold to-brand-lightGold hover:from-amber-500 hover:to-brand-gold text-brand-darkTeal font-bold px-6 md:px-8 py-3 md:py-3.5 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 text-sm md:text-base"
              >
                <span>{s.cta}</span>
                <svg
                  className="w-4 h-4 transform rotate-180"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Position dots — deliberately NOT arrows */}
      {count > 1 && (
        <div
          dir="ltr"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-[#07221e]/45 backdrop-blur-sm rounded-full px-3 py-2 ring-1 ring-white/10"
        >
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(i)}
              tabIndex={i === index ? 0 : -1}
              aria-label={`اسلاید ${i + 1}: ${s.kicker}`}
              aria-current={i === index}
              className={cn(
                "rounded-full transition-all duration-300",
                i === index
                  ? "w-6 h-2 bg-brand-lightGold"
                  : "w-2 h-2 bg-white/45 hover:bg-white/75"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
