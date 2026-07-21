import type { LandingPageConfig } from "@/data/landing/types";

export const pulseProEarbudsLanding: LandingPageConfig = {
  slug: "pulse-pro-earbuds",
  productSlug: "wireless-earbuds-pro",
  displayName: "Pulse Pro Earbuds",
  meta: {
    title: "Pulse Pro Earbuds — True Wireless Sound",
    description:
      "Studio-quality true wireless earbuds with all-day battery, secure fit, and free US shipping. Ships in 3–5 business days.",
  },
  hero: {
    eyebrow: "Best seller — 153+ sold",
    headline: "Your commute has a soundtrack. Make it sound like this.",
    subheadline:
      "Pulse Pro true wireless earbuds. Immersive sound, touch controls, and a pocket-size charging case built for daily use.",
    stockUrgency: "Only 11 left at this price · Free shipping included",
  },
  socialProofExtras: [
    { value: "28 hrs", label: "Total battery with case" },
  ],
  featureSection: {
    title: "Built for the way you actually use them",
    subtitle:
      "No gimmicks — just what makes earbuds worth keeping in your ears all day.",
  },
  features: [
    {
      title: "Immersive balanced sound",
      description:
        "Clear mids and steady bass for playlists, podcasts, and calls without muddy audio.",
    },
    {
      title: "Secure in-ear fit",
      description:
        "Snug tips stay put on commutes and light workouts so you are not adjusting every block.",
    },
    {
      title: "Touch controls",
      description:
        "Skip tracks, take calls, and pause playback without pulling out your phone.",
    },
    {
      title: "Pocket-size charging case",
      description:
        "Extra power on the go — charge the case once and keep listening through the week.",
    },
  ],
  reviewsSection: {
    title: "What people are saying",
    subtitle: "Real reviews from real customers.",
  },
  reviews: [
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
  bundle: {
    accessorySlug: "usb-c-charging-cable",
    title: "Complete the set",
    description:
      "Add a reinforced USB-C fast charging cable for your case and phone — keep everything powered without hunting for a spare cord.",
    ctaLabel: "Add bundle to cart",
  },
  faqSectionTitle: "Common questions",
  faq: [
    {
      q: "How long does shipping take?",
      a: "Orders ship within 24 hours and arrive in 3–5 business days across the continental US.",
    },
    {
      q: "What if they do not fit right?",
      a: "Every order includes multiple ear tip sizes. If they still do not fit, our 30-day return policy covers you fully.",
    },
    {
      q: "Do they work with iPhone and Android?",
      a: "Yes — Bluetooth pairs with any modern phone, tablet, or laptop.",
    },
    {
      q: "Is there a warranty?",
      a: "Every pair is covered against manufacturing defects. Contact orders@trove-us.com if anything arrives damaged.",
    },
  ],
  exitIntent: {
    couponCode: "SAVE10NOW",
    title: "Take an extra 10% off",
    description:
      "Your Pulse Pro Earbuds are waiting. Use this code within the next 15 minutes at checkout.",
    ctaLabel: "Apply code & checkout",
  },
  trustBadges: [
    { icon: "lock", label: "Secure checkout" },
    { icon: "return", label: "30-day easy returns" },
    { icon: "support", label: "Real human support" },
  ],
};
