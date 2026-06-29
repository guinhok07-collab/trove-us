/** CJ CDN — load directly; Vercel image optimizer often times out on mobile. */
export function isCatalogCdnUrl(src: string): boolean {
  return /cjdropshipping\.com/i.test(src);
}

export const PRODUCT_IMAGE_FALLBACK = "/product-image-fallback.png";
