/** Meta (Facebook) Pixel — client-side only. Set NEXT_PUBLIC_META_PIXEL_ID on Vercel. */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: (...args: unknown[]) => void;
  }
}

export function getMetaPixelId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  return id || undefined;
}

export function isMetaPixelEnabled(): boolean {
  return Boolean(getMetaPixelId());
}

export function trackMetaEvent(
  event: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === "undefined" || !isMetaPixelEnabled()) return;
  if (typeof window.fbq !== "function") return;
  window.fbq("track", event, params);
}

export interface MetaProductPayload {
  id: string;
  slug: string;
  name: string;
  price: number;
  quantity?: number;
}

export function trackMetaViewContent(product: MetaProductPayload): void {
  trackMetaEvent("ViewContent", {
    content_ids: [product.slug],
    content_type: "product",
    content_name: product.name,
    value: product.price,
    currency: "USD",
  });
}

export function trackMetaAddToCart(product: MetaProductPayload): void {
  const qty = product.quantity ?? 1;
  trackMetaEvent("AddToCart", {
    content_ids: [product.slug],
    content_type: "product",
    content_name: product.name,
    value: product.price * qty,
    currency: "USD",
    contents: [
      {
        id: product.slug,
        quantity: qty,
        item_price: product.price,
      },
    ],
  });
}

export function trackMetaInitiateCheckout(
  items: MetaProductPayload[],
  value: number,
): void {
  trackMetaEvent("InitiateCheckout", {
    content_ids: items.map((i) => i.slug),
    content_type: "product",
    num_items: items.reduce((n, i) => n + (i.quantity ?? 1), 0),
    value,
    currency: "USD",
    contents: items.map((i) => ({
      id: i.slug,
      quantity: i.quantity ?? 1,
      item_price: i.price,
    })),
  });
}

export function trackMetaPurchase(payload: {
  orderId: string;
  value: number;
  items: MetaProductPayload[];
}): void {
  trackMetaEvent("Purchase", {
    content_ids: payload.items.map((i) => i.slug),
    content_type: "product",
    num_items: payload.items.reduce((n, i) => n + (i.quantity ?? 1), 0),
    value: payload.value,
    currency: "USD",
    order_id: payload.orderId,
    contents: payload.items.map((i) => ({
      id: i.slug,
      quantity: i.quantity ?? 1,
      item_price: i.price,
    })),
  });
}

const PURCHASE_FLAG_PREFIX = "trove-meta-purchase-";

/** Fire Purchase once per order (refresh-safe). */
export function trackMetaPurchaseOnce(
  orderId: string,
  value: number,
  items: MetaProductPayload[],
): void {
  if (typeof window === "undefined") return;
  const key = PURCHASE_FLAG_PREFIX + orderId;
  try {
    if (sessionStorage.getItem(key)) return;
    trackMetaPurchase({ orderId, value, items });
    sessionStorage.setItem(key, "1");
  } catch {
    trackMetaPurchase({ orderId, value, items });
  }
}
