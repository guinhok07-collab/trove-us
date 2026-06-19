/**
 * Launch catalog — first 10 products to source on CJ Dropshipping.
 * Match each slug to an existing entry in products.ts, then paste CJ photos + prices.
 *
 * CJ filters: Ship From → United States · Sort by orders · 4+ stars
 * Sign up: https://cjdropshipping.com
 */
export interface LaunchProductGuide {
  slug: string;
  store: "pet" | "home" | "wellness" | "tech";
  cjSearch: string;
  /** Typical CJ product cost (USD) */
  costMin: number;
  costMax: number;
  /** Suggested retail on Trove */
  sellPrice: number;
  /** CJ shipping to US (estimate) */
  shippingEst: number;
  notes: string;
}

export const launchProducts: LaunchProductGuide[] = [
  {
    slug: "orthopedic-dog-bed",
    store: "pet",
    cjSearch: "orthopedic memory foam dog bed large",
    costMin: 16,
    costMax: 22,
    sellPrice: 49.99,
    shippingEst: 5,
    notes: "Pick removable cover + non-slip base. Weigh under 5 lb if possible.",
  },
  {
    slug: "no-pull-dog-harness",
    store: "pet",
    cjSearch: "no pull dog harness reflective front clip",
    costMin: 7,
    costMax: 11,
    sellPrice: 27.99,
    shippingEst: 4,
    notes: "Offer S–L sizes. Front clip is a strong selling point.",
  },
  {
    slug: "pet-water-fountain",
    store: "pet",
    cjSearch: "pet water fountain 2.5L filter automatic",
    costMin: 11,
    costMax: 16,
    sellPrice: 34.99,
    shippingEst: 5,
    notes: "Quiet pump + replacement filters in listing photos.",
  },
  {
    slug: "closet-organizer-6-shelf",
    store: "home",
    cjSearch: "closet hanging organizer 6 shelf",
    costMin: 8,
    costMax: 12,
    sellPrice: 32.99,
    shippingEst: 4,
    notes: "Lightweight fabric organizers ship cheap and sell well.",
  },
  {
    slug: "led-motion-night-light",
    store: "home",
    cjSearch: "LED motion sensor night light plug in",
    costMin: 4,
    costMax: 7,
    sellPrice: 19.99,
    shippingEst: 3,
    notes: "Low cost, high margin. Good for impulse ads.",
  },
  {
    slug: "percussion-massage-gun",
    store: "wellness",
    cjSearch: "mini massage gun percussion deep tissue",
    costMin: 18,
    costMax: 28,
    sellPrice: 59.99,
    shippingEst: 5,
    notes: "Avoid medical claims. Focus on recovery and sore muscles.",
  },
  {
    slug: "foam-roller-recovery",
    store: "wellness",
    cjSearch: "high density foam roller 18 inch",
    costMin: 6,
    costMax: 10,
    sellPrice: 29.99,
    shippingEst: 4,
    notes: "Include exercise guide PDF in your support email if supplier provides one.",
  },
  {
    slug: "ergonomic-laptop-stand",
    store: "tech",
    cjSearch: "aluminum laptop stand adjustable ergonomic",
    costMin: 10,
    costMax: 15,
    sellPrice: 39.99,
    shippingEst: 4,
    notes: "Aluminum looks premium. Check max laptop size (15–17\").",
  },
  {
    slug: "usb-c-hub-7in1",
    store: "tech",
    cjSearch: "USB C hub 7 in 1 HDMI SD card",
    costMin: 12,
    costMax: 18,
    sellPrice: 44.99,
    shippingEst: 3,
    notes: "List compatible ports clearly in description.",
  },
  {
    slug: "ergonomic-wrist-rest",
    store: "tech",
    cjSearch: "keyboard wrist rest memory foam ergonomic",
    costMin: 5,
    costMax: 9,
    sellPrice: 24.99,
    shippingEst: 3,
    notes: "Pairs well with laptop stand for desk bundle ads.",
  },
];

export function calcMargin(
  sellPrice: number,
  productCost: number,
  shippingCost: number,
  paymentFeeRate = 0.034,
) {
  const paymentFee = sellPrice * paymentFeeRate;
  const totalCost = productCost + shippingCost + paymentFee;
  const profit = sellPrice - totalCost;
  const marginPct = sellPrice > 0 ? (profit / sellPrice) * 100 : 0;
  return { totalCost, profit, marginPct, paymentFee };
}
