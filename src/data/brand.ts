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
  aboutFaqTitle: "Frequently asked questions",
  aboutFaq: [
    {
      q: "How long does delivery take?",
      a: "Most orders ship from our US warehouse and arrive in 3–5 business days. You'll get a tracking link by email as soon as your package is on the way.",
    },
    {
      q: "Do you offer free shipping?",
      a: "Yes — standard shipping is free on orders of $35 or more. Single-item orders under $10 ship for $3.19; other orders under $35 are $4.99 flat at checkout.",
    },
    {
      q: "Where do you ship?",
      a: "We deliver to all 50 US states. Every product page shows estimated delivery so you know what to expect before you buy.",
    },
    {
      q: "How do returns work?",
      a: "You have 30 days from delivery to request a return or exchange. Items should be unused and in original packaging. Start at our Returns page or email us with your order number — refunds are processed within 5–7 business days after approval.",
    },
    {
      q: "What payment methods do you accept?",
      a: "We accept PayPal, major credit and debit cards, and Pay in 4 on eligible orders of $30 or more. All prices are in USD with no hidden fees at checkout.",
    },
    {
      q: "How do I track my order?",
      a: "After your order ships, we email a tracking number and link. You can also use our Track Order page with your order number and email.",
    },
    {
      q: "Is checkout secure?",
      a: "Yes. Checkout is SSL-encrypted and processed through PayPal's secure payment system. We never store your full card details on our servers.",
    },
    {
      q: "What if my item arrives damaged or wrong?",
      a: "Email us at orders@trove-us.com with your order number and a photo. We'll send a replacement or issue a full refund — whichever you prefer.",
    },
    {
      q: "How fast do you reply to support emails?",
      a: "Real humans read every message — no bots. We aim to respond within one business day, often sooner.",
    },
    {
      q: "Why Trove instead of a big marketplace?",
      a: "We curate useful everyday products at fair prices — pets, home, wellness, and desk gear in one place, with transparent pricing and support you can actually reach.",
    },
  ],
  promiseTitle: "Shop with confidence",
  promiseText:
    "Useful products for real life — your home, your pets, your health, and your daily routine. One checkout, one team, one promise to take care of you.",
  bestSellers: "Customer Favorites",
  bestSellersSub: "Most-loved picks this season",
  shopMoreTitle: "Shop more picks",
  shopMoreSub: "Everyday essentials at impulse-friendly prices — scroll and add to cart",
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
