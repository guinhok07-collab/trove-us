import { products } from "@/data/products";
import { getVisibleProductBySlug } from "@/lib/catalog/visible-products";
import { applyVariant, findVariant } from "@/lib/catalog/variants";
import { applyPromoToOrderTotals } from "@/lib/promo/codes";
import type { CreateStoreOrderItem, CreateStoreOrderRequest } from "@/lib/cj/types";

/** Legacy threshold — kept for bundle copy; checkout shipping is always $0. */
export const FREE_SHIPPING_MIN = 35;
/** @deprecated Shipping is free at checkout; cost baked into sub-$13 item prices. */
export const FLAT_SHIPPING = 0;
export const TARGET_MARGIN = 0.2;
export const PAYPAL_RATE = 0.034;
export const MAX_RETAIL = 39.99;
export const DEFAULT_CJ_SHIPPING = 3.5;

/** Mirror scripts/lib/cj-catalog-lib.mjs — cost + ship + 20% margin + PayPal fee. */
export function retailPriceFromCost(cost: number, shipping = DEFAULT_CJ_SHIPPING): number {
  const base = cost + shipping;
  const raw = base / (1 - TARGET_MARGIN - PAYPAL_RATE);
  return Math.min(
    Math.max(Math.ceil(raw) - 0.01, base + 1.5),
    MAX_RETAIL,
  );
}

export function compareAtFromRetail(sell: number): number {
  return Math.ceil(sell * 1.1) - 0.01;
}

/** After PayPal fee, approximate net vs product cost (single unit, excl. store shipping). */
export function estimateUnitEconomics(
  retail: number,
  cjCost: number,
  cjShipping = DEFAULT_CJ_SHIPPING,
) {
  const net = retail * (1 - PAYPAL_RATE);
  const margin = net - cjCost - cjShipping;
  const marginPct = margin / retail;
  return { net: roundUsd(net), margin: roundUsd(margin), marginPct };
}

export interface OrderLineInput {
  productId?: string;
  slug?: string;
  variantId?: string;
  quantity: number;
}
export class OrderPricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderPricingError";
  }
}

export function roundUsd(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateShipping(_subtotal: number): number {
  return 0;
}

async function resolveProduct(input: OrderLineInput) {
  const slug = input.slug?.trim();
  const productId = input.productId?.trim();

  let product = slug ? await getVisibleProductBySlug(slug) : undefined;
  if (!product && productId) {
    const match = products.find((entry) => entry.id === productId);
    if (match) {
      product = await getVisibleProductBySlug(match.slug);
    }
  }

  if (!product) {
    throw new OrderPricingError(
      `Product unavailable: ${slug || productId || "item"}.`,
    );
  }

  if (!product.inStock) {
    throw new OrderPricingError(`${product.name} is out of stock.`);
  }

  return product;
}

export async function resolveOrderItems(
  inputs: OrderLineInput[],
): Promise<CreateStoreOrderItem[]> {
  if (!inputs.length) {
    throw new OrderPricingError("Cart is empty.");
  }

  const items: CreateStoreOrderItem[] = [];

  for (const input of inputs) {
    const quantity = Math.floor(Number(input.quantity));
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 99) {
      throw new OrderPricingError("Invalid quantity.");
    }

    const product = await resolveProduct(input);
    const variant = findVariant(product, input.variantId);
    if (input.variantId?.trim() && !variant) {
      throw new OrderPricingError(
        `${product.name}: selected option is no longer available.`,
      );
    }
    const line = applyVariant(product, variant?.id);

    if (!line.cjVid?.trim()) {
      throw new OrderPricingError(`${product.name} is temporarily unavailable.`);
    }

    items.push({
      productId: line.id,
      slug: line.slug,
      name: variant ? `${line.name} — ${variant.label}` : line.name,
      quantity,
      price: line.price,
      image: line.image,
      cjVid: line.cjVid,
      cjSku: line.cjSku,
      variantId: variant?.id,
    });  }

  return items;
}

export function calculateOrderTotals(
  items: CreateStoreOrderItem[],
  promoCode?: string | null,
) {
  const subtotal = roundUsd(
    items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  );
  const shipping = calculateShipping(subtotal);
  return applyPromoToOrderTotals(subtotal, shipping, promoCode);
}

/** Rebuild line items and totals from the catalog — never trust client prices. */
export async function validateStoreOrder(
  order: CreateStoreOrderRequest,
): Promise<CreateStoreOrderRequest> {
  const items = await resolveOrderItems(
    order.items.map((item) => ({
      productId: item.productId,
      slug: item.slug,
      variantId: item.variantId,
      quantity: item.quantity,
    })),
  );  const totals = calculateOrderTotals(items, order.promoCode);

  return {
    ...order,
    items,
    subtotal: totals.subtotal,
    shipping: totals.shipping,
    total: totals.total,
    discount: totals.discount > 0 ? totals.discount : undefined,
    promoCode: totals.promoCode,
  };
}

export function amountsMatch(a: number, b: number): boolean {
  return Math.abs(roundUsd(a) - roundUsd(b)) <= 0.01;
}
