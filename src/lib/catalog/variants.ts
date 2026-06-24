import type { Product, ProductVariant, ProductVariantCatalog } from "@/types/product";
import variantCatalog from "@/data/product-variants.json";

const catalog = variantCatalog as Record<string, ProductVariantCatalog>;

export function getVariantCatalog(slug: string): ProductVariantCatalog | null {
  const entry = catalog[slug];
  if (!entry?.variants?.length) return null;
  return entry;
}

export function getProductVariants(product: Product): ProductVariant[] {
  if (product.variants?.length) return product.variants;
  return getVariantCatalog(product.slug)?.variants ?? [];
}

export function getDefaultVariantId(product: Product): string | undefined {
  if (product.defaultVariantId) return product.defaultVariantId;
  const entry = getVariantCatalog(product.slug);
  if (entry?.defaultVariantId) return entry.defaultVariantId;
  if (product.cjVid) return product.cjVid;
  const variants = getProductVariants(product);
  return variants[0]?.id;
}

export function findVariant(
  product: Product,
  variantId?: string,
): ProductVariant | undefined {
  const variants = getProductVariants(product);
  if (!variants.length) return undefined;

  const requested = variantId?.trim();
  if (requested) {
    const match = variants.find((v) => v.id === requested);
    if (match) return match;
    return undefined;
  }

  const id = getDefaultVariantId(product);
  return variants.find((v) => v.id === id) ?? variants[0];
}

/** Merge selected variant onto product for cart / checkout snapshots */
export function applyVariant(product: Product, variantId?: string): Product {
  const variant = findVariant(product, variantId);
  if (!variant) return product;

  return {
    ...product,
    price: variant.price,
    compareAtPrice: variant.compareAtPrice ?? product.compareAtPrice,
    image: variant.image,
    images: variant.images.length ? variant.images : product.images,
    cjVid: variant.cjVid,
    cjSku: variant.cjSku,
    inStock: variant.inStock,
    defaultVariantId: variant.id,
  };
}

export function cartLineKey(productId: string, variantId?: string): string {
  return `${productId}:${variantId ?? "default"}`;
}

export function variantPriceLabel(price: number): string {
  return `$${(Math.round(price * 100) / 100).toFixed(2)}`;
}

export function hasMultipleVariants(product: Product): boolean {
  return getProductVariants(product).length > 1;
}

/** Listing / browse price — always match checkout default option */
export function withDefaultVariant(product: Product): Product {
  const id = getDefaultVariantId(product);
  return applyVariant(product, id);
}
