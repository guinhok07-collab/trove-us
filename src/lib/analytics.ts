import {
  AnalyticsEvent,
  AnalyticsEventType,
  StoreCategory,
} from "@/types/product";

const STORAGE_KEY = "trove-analytics";
const LEGACY_STORAGE_KEY = "techdrop-mall-analytics";

function readEvents(): AnalyticsEvent[] {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) localStorage.setItem(STORAGE_KEY, raw);
    }
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function trackEvent(
  store: StoreCategory,
  type: AnalyticsEventType,
  productId?: string,
) {
  if (typeof window === "undefined") return;

  try {
    const events = readEvents();
    events.push({ store, type, productId, timestamp: Date.now() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-500)));
  } catch {
    /* ignore */
  }
}

export function getAnalyticsSummary(): Record<
  StoreCategory,
  { views: number; productViews: number; addToCart: number; score: number }
> {
  const empty = {
    pet: { views: 0, productViews: 0, addToCart: 0, score: 0 },
    home: { views: 0, productViews: 0, addToCart: 0, score: 0 },
    wellness: { views: 0, productViews: 0, addToCart: 0, score: 0 },
    tech: { views: 0, productViews: 0, addToCart: 0, score: 0 },
  };

  if (typeof window === "undefined") return empty;

  try {
    const events = readEvents();
    for (const e of events) {
      const s = empty[e.store];
      if (e.type === "view_store") s.views++;
      if (e.type === "view_product") s.productViews++;
      if (e.type === "add_to_cart") s.addToCart++;
    }

    for (const key of Object.keys(empty) as StoreCategory[]) {
      const s = empty[key];
      s.score = s.views * 1 + s.productViews * 2 + s.addToCart * 5;
    }
  } catch {
    /* ignore */
  }

  return empty;
}

export function clearAnalytics() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function getTopStore(): StoreCategory | null {
  const summary = getAnalyticsSummary();
  const sorted = (
    Object.entries(summary) as [StoreCategory, { score: number }][]
  ).sort((a, b) => b[1].score - a[1].score);
  return sorted[0]?.[1].score > 0 ? sorted[0][0] : null;
}
