import { getProductBySlug } from "@/data/products";
import type { Product } from "@/types/product";

export interface ProductBundle {
  id: string;
  name: string;
  tagline: string;
  slug: string;
  productSlugs: string[];
  highlight?: string;
}

export const bundles: ProductBundle[] = [
  {
    id: "pet-walk-kit",
    slug: "pet-walk-kit",
    name: "Pet Walk Kit",
    tagline: "Leash, 270 bag rolls, and walk cup — ships free.",
    productSlugs: [
      "retractable-dog-leash",
      "pet-waste-bag-refills",
      "portable-pet-water-bottle",
    ],
    highlight: "Free shipping included",
  },
  {
    id: "recovery-duo",
    slug: "recovery-duo",
    name: "Recovery Duo",
    tagline: "Mini massage gun plus resistance bands for post-workout recovery.",
    productSlugs: ["percussion-massage-gun", "yoga-resistance-bands"],
    highlight: "Ships free — delivered price",
  },
  {
    id: "desk-setup",
    slug: "desk-setup",
    name: "Desk Setup",
    tagline: "Laptop stand, USB-C hub, and fast charge cable for work anywhere.",
    productSlugs: [
      "ergonomic-laptop-stand",
      "usb-c-charging-cable",
      "cable-management-box",
    ],
    highlight: "Free shipping included",
  },
];

export function getBundleProducts(bundle: ProductBundle): Product[] {
  return bundle.productSlugs
    .map((slug) => getProductBySlug(slug))
    .filter((p): p is Product => Boolean(p));
}

export function getBundleSubtotal(bundle: ProductBundle): number {
  return getBundleProducts(bundle).reduce((sum, p) => sum + p.price, 0);
}
