import { products } from "@/data/products";
import { getVisibleProductBySlug } from "@/lib/catalog/visible-products";
import type { CreateStoreOrderItem, CreateStoreOrderRequest } from "@/lib/cj/types";

export const FREE_SHIPPING_MIN = 35;
export const FLAT_SHIPPING = 4.99;

export interface OrderLineInput {
  productId?: string;
  slug?: string;
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

export function calculateShipping(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_MIN ? 0 : FLAT_SHIPPING;
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

    items.push({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      quantity,
      price: product.price,
      image: product.image,
      cjVid: product.cjVid,
      cjSku: product.cjSku,
    });
  }

  return items;
}

export function calculateOrderTotals(items: CreateStoreOrderItem[]) {
  const subtotal = roundUsd(
    items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  );
  const shipping = calculateShipping(subtotal);
  const total = roundUsd(subtotal + shipping);

  return { subtotal, shipping, total };
}

/** Rebuild line items and totals from the catalog — never trust client prices. */
export async function validateStoreOrder(
  order: CreateStoreOrderRequest,
): Promise<CreateStoreOrderRequest> {
  const items = await resolveOrderItems(
    order.items.map((item) => ({
      productId: item.productId,
      slug: item.slug,
      quantity: item.quantity,
    })),
  );
  const totals = calculateOrderTotals(items);

  return {
    ...order,
    items,
    ...totals,
  };
}

export function amountsMatch(a: number, b: number): boolean {
  return Math.abs(roundUsd(a) - roundUsd(b)) <= 0.01;
}
