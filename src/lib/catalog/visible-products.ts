import { products } from "@/data/products";
import { getVisibilityOverrides } from "@/lib/catalog/visibility-store";
import { resolveVisible } from "@/lib/catalog/visibility";
import { withDefaultVariant } from "@/lib/catalog/variants";
import type { Product, StoreCategory } from "@/types/product";

function resolveProduct(product: Product): Product {
  return withDefaultVariant(product);
}

/** Cheapest first — keeps browse pages approachable for impulse buys. */
export function sortProductsByPriceAsc(list: Product[]): Product[] {
  return [...list].sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
}

export function isProductVisibleSync(
  product: Product,
  overrides: Record<string, boolean> = {},
): boolean {
  return resolveVisible(product.slug, product.catalogHidden, overrides);
}

export async function getCatalogVisibilityMap(): Promise<Record<string, boolean>> {
  const overrides = await getVisibilityOverrides();
  const map: Record<string, boolean> = {};
  for (const p of products) {
    map[p.slug] = isProductVisibleSync(p, overrides);
  }
  return map;
}

export async function getVisibleProducts(): Promise<Product[]> {
  const overrides = await getVisibilityOverrides();
  return products
    .filter((p) => isProductVisibleSync(p, overrides))
    .map(resolveProduct);
}

export async function getVisibleProductsByStore(
  store: StoreCategory,
): Promise<Product[]> {
  const list = await getVisibleProducts();
  return sortProductsByPriceAsc(list.filter((p) => p.store === store));
}

export async function getVisibleBestsellersByStore(
  store: StoreCategory,
  limit = 4,
): Promise<Product[]> {
  return [...(await getVisibleProductsByStore(store))]
    .sort((a, b) => b.sold - a.sold)
    .slice(0, limit);
}

export async function getVisibleProductBySlug(
  slug: string,
): Promise<Product | undefined> {
  const product = products.find((p) => p.slug === slug);
  if (!product) return undefined;
  const overrides = await getVisibilityOverrides();
  if (!isProductVisibleSync(product, overrides)) return undefined;
  return resolveProduct(product);
}

export function getVisibleProductsSync(
  overrides: Record<string, boolean> = {},
): Product[] {
  return products
    .filter((p) => isProductVisibleSync(p, overrides))
    .map(resolveProduct);
}
