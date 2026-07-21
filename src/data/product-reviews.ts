import type { LandingReview } from "@/data/landing/types";

export type ProductReview = LandingReview;

/** Curated review quotes for storefront product pages (no external review app). */
export const productReviewsBySlug: Record<string, ProductReview[]> = {
  "wireless-earbuds-pro": [
    {
      quote:
        "Genuinely did not expect much at this price, but the sound quality holds up against earbuds I paid triple for.",
      name: "Jordan M.",
      location: "Texas",
      rating: 5,
    },
    {
      quote:
        "Battery life is the real winner here. I charge them maybe once every three days with regular use.",
      name: "Ariana C.",
      location: "Ohio",
      rating: 5,
    },
    {
      quote:
        "Fit is comfortable enough for long runs and they have not fallen out once. Case feels sturdy too.",
      name: "Devon R.",
      location: "Oregon",
      rating: 4,
    },
  ],
  "percussion-massage-gun": [
    {
      quote:
        "Perfect size for sore shoulders after desk work. Strong enough without feeling like a jackhammer.",
      name: "Chris L.",
      location: "Florida",
      rating: 5,
    },
    {
      quote: "I keep it in my gym bag now. Charges fast and the case is smaller than I expected.",
      name: "Morgan P.",
      location: "Georgia",
      rating: 5,
    },
  ],
  "orthopedic-dog-bed": [
    {
      quote:
        "Our older lab actually sleeps through the night now instead of shifting every hour on his old bed.",
      name: "Sarah K.",
      location: "Colorado",
      rating: 5,
    },
    {
      quote: "Cover washes easily and the foam bounced back after the first laundry cycle.",
      name: "Mike T.",
      location: "Arizona",
      rating: 4,
    },
  ],
  "no-pull-dog-harness": [
    {
      quote:
        "Walks are finally manageable with our excitable retriever. The front clip really does reduce pulling.",
      name: "Emily R.",
      location: "Virginia",
      rating: 5,
    },
    {
      quote: "Padded straps do not rub under the legs. Adjusted in two minutes.",
      name: "James W.",
      location: "Michigan",
      rating: 4,
    },
  ],
  "pet-water-fountain": [
    {
      quote:
        "Both cats drink more since we switched. Quiet enough to leave running overnight.",
      name: "Lisa H.",
      location: "California",
      rating: 5,
    },
  ],
  "ergonomic-laptop-stand": [
    {
      quote:
        "Sturdy aluminum stand that does not wobble when I type. Neck tension is noticeably better.",
      name: "Alex D.",
      location: "New York",
      rating: 5,
    },
    {
      quote: "Folds flat in my backpack. Setup at coffee shops takes seconds.",
      name: "Priya N.",
      location: "Washington",
      rating: 4,
    },
  ],
  "usb-c-charging-cable": [
    {
      quote: "Braided cable feels premium and still works after months in my travel pouch.",
      name: "Tyler B.",
      location: "Illinois",
      rating: 5,
    },
  ],
};

export function getProductReviews(slug: string): ProductReview[] {
  return productReviewsBySlug[slug] ?? [];
}

export function hasProductReviews(slug: string): boolean {
  return getProductReviews(slug).length > 0;
}
