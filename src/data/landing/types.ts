import type { FaqItem } from "@/components/faq-list";
import type { TrustIconName } from "@/components/icons";

export interface LandingReview {
  quote: string;
  name: string;
  location: string;
  rating: number;
}

export interface LandingFeature {
  title: string;
  description: string;
}

export interface LandingSocialProofStat {
  value: string;
  label: string;
}

export interface LandingBundleOffer {
  accessorySlug: string;
  title: string;
  description: string;
  ctaLabel?: string;
}

export interface LandingExitIntent {
  couponCode: string;
  title: string;
  description: string;
  ctaLabel?: string;
}

export interface LandingPageConfig {
  /** URL segment — e.g. pulse-pro-earbuds → /lp/pulse-pro-earbuds */
  slug: string;
  /** Catalog product slug wired to cart/checkout */
  productSlug: string;
  /** Marketing name shown on the LP (can differ from catalog title) */
  displayName: string;
  meta: {
    title: string;
    description: string;
  };
  hero: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    /** Shown under price — e.g. "Only 11 left at this price" */
    stockUrgency?: string;
  };
  /** Optional extra stats beyond rating/reviews/sold/shipping from the product */
  socialProofExtras?: LandingSocialProofStat[];
  features: LandingFeature[];
  featureSection?: {
    title: string;
    subtitle?: string;
  };
  reviews: LandingReview[];
  reviewsSection?: {
    title: string;
    subtitle?: string;
  };
  bundle?: LandingBundleOffer;
  faq: FaqItem[];
  faqSectionTitle?: string;
  exitIntent: LandingExitIntent;
  trustBadges?: Array<{ icon: TrustIconName; label: string }>;
}
