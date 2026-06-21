export const brand = {
  name: "Trove",
  shortName: "Trove",
  tagline: "Life's essentials, in one place",
  description:
    "Everyday products for home, pets, wellness, and work — curated with care, delivered fast across the United States.",
  supportEmail: "orders@trove-us.com",
  locationLine: "Delivering to all 50 states",
  shippingLine: "Ships from US warehouses · Free delivery over $35",
  deliveryLine: "Most orders arrive in 3–5 business days",
  supportLine: "Real support at orders@trove-us.com",
  trustLine: "Secure checkout · Easy 30-day returns · Real human support",
  suggestedDomain: "trove-us.com",
} as const;

export const domainGuide = {
  best: [".com"],
  good: [".shop", ".store"],
  ok: [".co"],
  avoid: [".xyz", ".top", ".click", ".info"],
  nameTips: [
    "One short word sticks best (like Trove, Apple, Target)",
    "Easy to spell when you hear it",
    "Check .com availability before you commit",
  ],
  examples: [
    "trove-us.com",
    "shoptrove.com",
    "gettrove.com",
    "trove.co",
  ],
} as const;

export const copy = {
  heroBadge: "US shipping · Curated essentials · Real support",
  promoBadge: "This week's pick",
  promoTitle: "Mini massage gun — recovery under $15 delivered",
  promoText:
    "Deep percussion relief after workouts, without the $60+ price tag. Pair it with our Recovery Duo kit or add any second item to unlock free shipping.",
  bundlesTitle: "Curated kits",
  bundlesSub:
    "Save on shipping with ready-made bundles — pet walks, desk setup, and recovery.",
  heroCta: "Start Shopping",
  heroSecondary: "Shop kits",
  shopDepartments: "Shop by Department",
  shopDepartmentsSub:
    "Home, pets, wellness, and everyday gear — all in one place.",
  departmentCta: "Shop now",
  whyShopTitle: "Why shop with Trove",
  whyShop: [
    {
      icon: "badge-check" as const,
      title: "Simple, honest shopping",
      text: "Clear prices in USD. No hidden fees at checkout.",
    },
    {
      icon: "truck" as const,
      title: "Ships from the US",
      text: "Most orders leave our US warehouse and arrive in 3–5 business days.",
    },
    {
      icon: "support" as const,
      title: "Real human support",
      text: "Email us anytime — we reply within 24 hours, no bots.",
    },
    {
      icon: "return" as const,
      title: "Easy 30-day returns",
      text: "Not satisfied? Full refund or exchange — no hassle.",
    },
  ],
  trustStrip: [
    { icon: "lock" as const, label: "SSL Secure Checkout" },
    { icon: "credit-card" as const, label: "PayPal & Cards Accepted" },
    { icon: "credit-card" as const, label: "Pay in 4 — orders $30+" },
    { icon: "package" as const, label: "Free Shipping $35+" },
    { icon: "return" as const, label: "30-Day Returns" },
    { icon: "map-pin" as const, label: "All 50 States" },
  ],
  aboutTitle: "Essentials worth keeping",
  aboutText:
    "Trove started with a simple idea: life is busy, and finding quality everyday products shouldn't be hard. We curate items for your home, your pets, and yourself — useful things at fair prices, backed by support you can actually reach.",
  aboutPoints: [
    "Hand-picked products — quality over quantity",
    "Transparent pricing, no surprises",
    "Order tracking sent to your email",
    "Friendly support — real humans, not bots",
  ],
  guaranteeTitle: "Our satisfaction guarantee",
  guaranteeText:
    "If your order isn't right, we'll fix it. Contact us within 30 days for a refund or replacement. No runaround, no fine print games.",
  contactHelpIntro:
    "We're here to help with orders, shipping, and returns.",
  contactHelpResponse: "We aim to respond within one business day.",
  promiseTitle: "Shop with confidence",
  promiseText:
    "Useful products for real life — your home, your pets, your health, and your daily routine. One checkout, one team, one promise to take care of you.",
  bestSellers: "Customer Favorites",
  bestSellersSub: "Most-loved picks this season",
  emptyCart: "Your cart is waiting — find something you'll love.",
  productDelivery: "Delivery in 3–5 business days",
  productShipsUs: "Ships anywhere in the US",
  checkoutSecure: "Secure checkout — your information is protected",
  checkoutPayment: "Pay safely with PayPal, card, or Pay in 4 (on eligible orders)",
  payLaterBelowMinimum:
    "Pay in 4 is available on orders $30+. Add an item to unlock installments at checkout.",
  marketingOptInLabel:
    "Send me occasional deals and new arrivals. Unsubscribe anytime.",
  newsletterTitle: "Deals & new arrivals",
  newsletterText:
    "Get pet, home, and wellness picks — plus early access to bundles and sales.",
  newsletterPlaceholder: "Your email",
  newsletterButton: "Join",
  newsletterSuccess: "You're on the list. Watch your inbox for Trove deals.",
  newsletterFinePrint:
    "Occasional emails only. Unsubscribe anytime from any message.",
  dealsPageTitle: "Get Trove deals & news",
  dealsPageText:
    "Want promos, new products, and bundle offers in your inbox? Join our list — occasional emails only, no spam.",
  dealsPageButton: "Join the list",
  dealsPageSuccess:
    "You're in! Watch your inbox for Trove deals, new arrivals, and early access to sales.",
  dealsPageUnsubscribeHint: "Already on the list and want to stop?",
  dealsPageUnsubscribeLink: "Unsubscribe here",
  unsubscribeTitle: "Email preferences",
  unsubscribeText:
    "Enter your email to stop promotional messages. Order confirmations and shipping updates are separate.",
  unsubscribeButton: "Unsubscribe",
  unsubscribeSuccess:
    "Done — you won't receive promotional emails from Trove anymore. You can still shop anytime.",
} as const;
