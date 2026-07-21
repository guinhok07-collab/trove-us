import { roundUsd } from "@/lib/pricing";

export interface PromoDefinition {
  percentOff: number;
  label: string;
}

export const PROMO_CODES: Record<string, PromoDefinition> = {
  SAVE10NOW: { percentOff: 10, label: "10% off your order" },
  TROVE10: { percentOff: 10, label: "10% off your order" },
};

export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase();
}

export function resolvePromoCode(code: string | undefined | null): {
  code: string;
  definition: PromoDefinition;
} | null {
  if (!code?.trim()) return null;
  const normalized = normalizePromoCode(code);
  const definition = PROMO_CODES[normalized];
  if (!definition) return null;
  return { code: normalized, definition };
}

export function calculatePromoDiscount(
  subtotal: number,
  percentOff: number,
): number {
  if (subtotal <= 0 || percentOff <= 0) return 0;
  return roundUsd(subtotal * (percentOff / 100));
}

export interface OrderPromoTotals {
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  promoCode?: string;
  promoLabel?: string;
}

export function applyPromoToOrderTotals(
  subtotal: number,
  shipping: number,
  promoCode?: string | null,
): OrderPromoTotals {
  const subtotalRounded = roundUsd(subtotal);
  const shippingRounded = roundUsd(shipping);
  const promo = resolvePromoCode(promoCode);

  if (!promo) {
    return {
      subtotal: subtotalRounded,
      shipping: shippingRounded,
      discount: 0,
      total: roundUsd(subtotalRounded + shippingRounded),
    };
  }

  const discount = calculatePromoDiscount(subtotalRounded, promo.definition.percentOff);
  const total = roundUsd(
    Math.max(0.01, subtotalRounded + shippingRounded - discount),
  );

  return {
    subtotal: subtotalRounded,
    shipping: shippingRounded,
    discount,
    total,
    promoCode: promo.code,
    promoLabel: promo.definition.label,
  };
}
