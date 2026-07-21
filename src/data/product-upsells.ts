import { getProductBySlug } from "@/data/products";
import type { Product } from "@/types/product";
import { isTopSeller } from "@/lib/catalog/stock-urgency";

export interface ProductUpsellOffer {
  accessorySlug: string;
  title: string;
  description: string;
  ctaLabel?: string;
}

const upsellOffers: Record<string, ProductUpsellOffer> = {
  "wireless-earbuds-pro": {
    accessorySlug: "usb-c-charging-cable",
    title: "Pair with a fast USB-C cable",
    description:
      "Keep your charging case and phone powered with a reinforced nylon cable — ships free with your order.",
    ctaLabel: "Add cable to cart",
  },
  "percussion-massage-gun": {
    accessorySlug: "yoga-resistance-bands",
    title: "Complete your recovery kit",
    description:
      "Add resistance bands for warm-ups and cooldown stretches alongside your massage gun.",
    ctaLabel: "Add bands to cart",
  },
  "ergonomic-laptop-stand": {
    accessorySlug: "usb-c-charging-cable",
    title: "Power your desk setup",
    description:
      "A durable USB-C cable for your laptop, phone, and accessories — one less cable hunt at your desk.",
    ctaLabel: "Add cable to cart",
  },
  "no-pull-dog-harness": {
    accessorySlug: "portable-pet-water-bottle",
    title: "Upgrade your walk kit",
    description:
      "Clip-on water bottle for long walks — pairs perfectly with your no-pull harness.",
    ctaLabel: "Add bottle to cart",
  },
  "orthopedic-dog-bed": {
    accessorySlug: "retractable-dog-leash",
    title: "Treat your dog to a walk upgrade",
    description:
      "Retractable leash for comfortable outdoor time after a great night's sleep on their new bed.",
    ctaLabel: "Add leash to cart",
  },
  "pet-water-fountain": {
    accessorySlug: "pet-waste-bag-refills",
    title: "Everyday pet essentials",
    description: "270-count waste bag rolls — handy to stock up while you are already shopping.",
    ctaLabel: "Add refills to cart",
  },
  "mini-bluetooth-speaker": {
    accessorySlug: "usb-c-charging-cable",
    title: "Keep everything charged",
    description: "USB-C cable for your speaker, phone, and earbuds case in one go.",
    ctaLabel: "Add cable to cart",
  },
};

export interface ResolvedProductUpsell {
  offer: ProductUpsellOffer;
  accessory: Product;
}

export function getProductUpsell(product: Product): ResolvedProductUpsell | null {
  if (!isTopSeller(product)) return null;

  const offer = upsellOffers[product.slug];
  if (!offer) return null;

  const accessory = getProductBySlug(offer.accessorySlug);
  if (!accessory?.inStock) return null;

  return { offer, accessory };
}
