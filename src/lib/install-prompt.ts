/**
 * Shared PWA install-prompt store.
 *
 * The `beforeinstallprompt` event can fire BEFORE a component mounts (React
 * hydration takes a moment), and the event is never re-fired — a component
 * that starts listening too late would never offer a native install.
 *
 * This module attaches its listener at import time (the earliest possible
 * moment in the client bundle) and keeps exactly ONE captured event, so
 * every install surface (homepage section, download page, PWA banner)
 * sees the same prompt and can trigger it once.
 */

export type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let captured: InstallEvent | null = null;
const listeners = new Set<(e: InstallEvent | null) => void>();

function emit() {
  listeners.forEach((l) => l(captured));
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    if (captured) return; // only one prompt per page load
    captured = e as InstallEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    captured = null;
    emit();
  });
}

/** useSyncExternalStore snapshot — stable reference or null. */
export function getInstallEvent(): InstallEvent | null {
  return captured;
}

/** Subscribe for useSyncExternalStore; replays the captured event immediately. */
export function subscribeInstallEvent(cb: (e: InstallEvent | null) => void) {
  listeners.add(cb);
  if (captured) cb(captured);
  return () => {
    listeners.delete(cb);
  };
}

/** Mark the prompt as consumed (after prompt() + userChoice) — one shot only. */
export function consumeInstallEvent() {
  captured = null;
  emit();
}
