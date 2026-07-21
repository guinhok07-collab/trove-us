import type { Product } from "@/types/product";

const TOP_SELLER_SOLD = 80;

function stableRemaining(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash + slug.charCodeAt(i) * (i + 1)) % 997;
  }
  return 8 + (hash % 9);
}

export function isTopSeller(product: Product): boolean {
  return product.tags.includes("bestseller") || product.sold >= TOP_SELLER_SOLD;
}

/** Consistent low-stock message for high-demand in-stock products. */
export function getStockUrgencyMessage(product: Product): string | null {
  if (!product.inStock || !isTopSeller(product)) return null;
  const remaining = stableRemaining(product.slug);
  return `Only ${remaining} left at this price · Free shipping included`;
}
