import { products } from "@/data/products";
import { getVisibilityOverrides } from "@/lib/catalog/visibility-store";
import { resolveVisible } from "@/lib/catalog/visibility";
import type { Product, StoreCategory } from "@/types/product";

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
  return products.filter((p) => isProductVisibleSync(p, overrides));
}

export async function getVisibleProductsByStore(
  store: StoreCategory,
): Promise<Product[]> {
  const list = await getVisibleProducts();
  return list.filter((p) => p.store === store);
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
  return product;
}

export function getVisibleProductsSync(
  overrides: Record<string, boolean> = {},
): Product[] {
  return products.filter((p) => isProductVisibleSync(p, overrides));
}
