/**
 * Client-safe analytics hooks. Vercel Web Analytics exposes `window.va` when enabled.
 */
export function trackProductClick(payload: {
  slug: string;
  id: string;
}): void {
  if (typeof window === "undefined") return;
  const w = window as Window & {
    va?: (action: string, data?: Record<string, unknown>) => void;
  };
  if (typeof w.va === "function") {
    w.va("event", { name: "product_click", ...payload });
  }
}

export function trackProductView(payload: { slug: string; id: string }): void {
  if (typeof window === "undefined") return;
  const w = window as Window & {
    va?: (action: string, data?: Record<string, unknown>) => void;
  };
  if (typeof w.va === "function") {
    w.va("event", { name: "product_view", ...payload });
  }
}
