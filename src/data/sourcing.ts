/**

 * Launch catalog — verified CJ products on Trove (see products.ts).

 * Pricing targets ~20% margin for repeat buyers / volume.

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

    costMin: 40,

    costMax: 45,

    sellPrice: 63.99,

    shippingEst: 6,

    notes: "CJ pid verified. Large orthopedic sofa bed.",

  },

  {

    slug: "no-pull-dog-harness",

    store: "pet",

    cjSearch: "no pull dog harness reflective front clip",

    costMin: 25,

    costMax: 30,

    sellPrice: 41.99,

    shippingEst: 4,

    notes: "Harness + leash set on CJ.",

  },

  {

    slug: "pet-water-fountain",

    store: "pet",

    cjSearch: "pet water fountain stainless steel automatic",

    costMin: 9,

    costMax: 12,

    sellPrice: 19.99,

    shippingEst: 5,

    notes: "Stainless steel circulation fountain.",

  },

  {

    slug: "pet-grooming-brush-set",

    store: "pet",

    cjSearch: "pet slicker grooming brush comb",

    costMin: 2,

    costMax: 4,

    sellPrice: 7.99,

    shippingEst: 3.5,

    notes: "Self-cleaning slicker brush.",

  },

  {

    slug: "portable-pet-carrier",

    store: "pet",

    cjSearch: "portable pet carrier backpack breathable",

    costMin: 5,

    costMax: 7,

    sellPrice: 13.99,

    shippingEst: 5,

    notes: "Soft-sided carrier backpack.",

  },

  {

    slug: "led-motion-night-light",

    store: "home",

    cjSearch: "LED motion sensor night light rechargeable",

    costMin: 2,

    costMax: 4,

    sellPrice: 8.99,

    shippingEst: 3.5,

    notes: "Motion sensor LED bar. Impulse-buy price point.",

  },

  {

    slug: "vacuum-storage-bags",

    store: "home",

    cjSearch: "vacuum storage bags hand pump 20 pack",

    costMin: 16,

    costMax: 20,

    sellPrice: 29.99,

    shippingEst: 4,

    notes: "20-pack with hand pump.",

  },

  {

    slug: "cordless-cabinet-light",

    store: "home",

    cjSearch: "cabinet light motion sensor rechargeable LED",

    costMin: 3,

    costMax: 5,

    sellPrice: 9.99,

    shippingEst: 3.5,

    notes: "Under-cabinet motion LED.",

  },

  {

    slug: "percussion-massage-gun",

    store: "wellness",

    cjSearch: "mini massage gun percussion deep tissue",

    costMin: 2,

    costMax: 5,

    sellPrice: 9.99,

    shippingEst: 4.5,

    notes: "Mini fascia gun — low cost, high conversion.",

  },

  {

    slug: "posture-corrector-brace",

    store: "wellness",

    cjSearch: "posture corrector back brace adjustable",

    costMin: 5,

    costMax: 8,

    sellPrice: 12.99,

    shippingEst: 3.5,

    notes: "Smart posture corrector brace.",

  },

  {

    slug: "essential-oil-diffuser",

    store: "wellness",

    cjSearch: "essential oil diffuser ultrasonic aromatherapy",

    costMin: 14,

    costMax: 18,

    sellPrice: 27.99,

    shippingEst: 4.5,

    notes: "Desktop aromatherapy diffuser.",

  },

  {

    slug: "yoga-resistance-bands",

    store: "wellness",

    cjSearch: "resistance bands set fitness loop",

    costMin: 2,

    costMax: 5,

    sellPrice: 9.99,

    shippingEst: 3.5,

    notes: "Resistance band set.",

  },

  {

    slug: "ergonomic-laptop-stand",

    store: "tech",

    cjSearch: "aluminum laptop stand adjustable ergonomic",

    costMin: 10,

    costMax: 14,

    sellPrice: 21.99,

    shippingEst: 4.5,

    notes: "Folding portable laptop stand.",

  },

  {

    slug: "usb-c-hub-7in1",

    store: "tech",

    cjSearch: "USB C hub 7 in 1 HDMI SD card",

    costMin: 22,

    costMax: 26,

    sellPrice: 36.99,

    shippingEst: 3.5,

    notes: "7-in-1 USB-C hub with HDMI.",

  },

  {

    slug: "wireless-earbuds-pro",

    store: "tech",

    cjSearch: "wireless earbuds bluetooth TWS",

    costMin: 3,

    costMax: 5,

    sellPrice: 9.99,

    shippingEst: 3.5,

    notes: "Budget TWS earbuds — entry price for repeat buyers.",

  },

  {

    slug: "magsafe-car-mount",

    store: "tech",

    cjSearch: "magnetic car phone mount holder",

    costMin: 8,

    costMax: 11,

    sellPrice: 16.99,

    shippingEst: 3.5,

    notes: "Magnetic bendable car phone holder.",

  },

  {

    slug: "cable-management-box",

    store: "tech",

    cjSearch: "cable management clip organizer desk",

    costMin: 1,

    costMax: 3,

    sellPrice: 7.99,

    shippingEst: 4.5,

    notes: "Magnetic under-desk cable clips.",

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


