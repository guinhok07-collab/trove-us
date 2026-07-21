import { getProductBySlug } from "@/data/products";
import { pulseProEarbudsLanding } from "@/data/landing/pages/pulse-pro-earbuds";
import type { LandingPageConfig } from "@/data/landing/types";
import type { Product } from "@/types/product";
import { withDefaultVariant } from "@/lib/catalog/variants";

const landingPages: LandingPageConfig[] = [pulseProEarbudsLanding];

const bySlug = new Map(landingPages.map((page) => [page.slug, page]));

export function getAllLandingSlugs(): string[] {
  return landingPages.map((page) => page.slug);
}

export function getLandingPageConfig(slug: string): LandingPageConfig | undefined {
  return bySlug.get(slug);
}

export interface ResolvedLandingPage {
  config: LandingPageConfig;
  product: Product;
  accessory?: Product;
}

/** Resolve catalog products for a landing page (ignores catalog visibility). */
export function resolveLandingPage(slug: string): ResolvedLandingPage | undefined {
  const config = getLandingPageConfig(slug);
  if (!config) return undefined;

  const raw = getProductBySlug(config.productSlug);
  if (!raw) return undefined;

  const product = withDefaultVariant(raw);
  const accessorySlug = config.bundle?.accessorySlug;
  const accessoryRaw = accessorySlug ? getProductBySlug(accessorySlug) : undefined;

  return {
    config,
    product,
    accessory: accessoryRaw ? withDefaultVariant(accessoryRaw) : undefined,
  };
}
