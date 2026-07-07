/** CJ CDN — load directly; Vercel image optimizer often times out on mobile. */
export function isCatalogCdnUrl(src: string): boolean {
  return /cjdropshipping\.com/i.test(src);
}

/** Local brand placeholder when CDN images fail. */
export const PRODUCT_IMAGE_FALLBACK = "/product-image-fallback.svg";

export function shouldSkipImageOptimization(src: string): boolean {
  return (
    isCatalogCdnUrl(src) ||
    src.startsWith("/") ||
    src.startsWith("data:") ||
    src.endsWith(".svg")
  );
}

/** Unique image candidates: primary first, then gallery alternates. */
export function productImageCandidates(
  primary?: string | null,
  gallery: string[] = [],
): string[] {
  const list = [primary, ...gallery].filter(
    (src): src is string => Boolean(src?.trim()),
  );
  return [...new Set(list)];
}
