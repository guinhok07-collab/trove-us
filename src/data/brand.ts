export const brand = {
  name: "Trove",
  shortName: "Trove",
  tagline: "Life's essentials, in one place",
  description:
    "Everyday products for home, pets, wellness, and work — curated with care, delivered fast across the United States.",
  supportEmail: "orders@trove-us.com",
  instagramUrl: "https://www.instagram.com/shoptrove.us/",
  instagramHandle: "@shoptrove.us",
  locationLine: "Delivering to all 50 states",
  shippingLine: "Free US delivery on every order · Ships from US warehouses",
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
  heroBadge: "Free US delivery · Curated essentials · Real support",
  promoBadge: "This week's pick",
  promoTitle: "Mini massage gun — recovery under $15 delivered",
  promoText:
    "Deep percussion relief after workouts, without the $60+ price tag. Price includes delivery — no shipping fee at checkout.",
  bundlesTitle: "Curated kits",
  bundlesSub:
    "Ready-made kits for pet walks, desk setup, and recovery — every order ships free.",
  heroCta: "Start Shopping",
  heroSecondary: "Shop kits",
  freeShippingBannerBadge: "Always included",
  freeShippingBannerTitle: "Free shipping on every order",
  freeShippingBannerHighlight: "Every product. Every state. Zero delivery fee.",
  freeShippingBannerSub:
    "The price on the page is the price at checkout — delivered to your door with no shipping surprise.",
  freeShippingBannerCta: "Shop with free delivery",
  freeShippingBannerPerks: [
    "All 50 US states",
    "Ships in 3–5 days",
    "No hidden fees",
  ] as const,
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
    { icon: "credit-card" as const, label: "Cards & PayPal Accepted" },
    { icon: "credit-card" as const, label: "Pay in 4 — orders $30+" },
    { icon: "package" as const, label: "Free Shipping" },
    { icon: "return" as const, label: "30-Day Returns" },
    { icon: "map-pin" as const, label: "All 50 States" },
  ],
  aboutTitle: "Useful stuff, one place",
  aboutLead:
    "Trove is a tight catalog of everyday essentials for home, pets, wellness, and work — curated with care, priced honestly, and shipped free across the US.",
  aboutStoryTitle: "It started with an annoying little problem",
  aboutStoryText:
    "Every home has that running list of small things we always forget to buy — a phone stand, an LED light for the closet, a new toy for the dog, a resistance band after the gym. None of it is expensive. None of it is hard to find. But pulling it all together in one place, at a fair price, without the runaround? That was more annoying than it should be.\n\nTrove exists to fix exactly that: a lean catalog of useful products — without spammy marketing, without ten thousand lookalike options, and without fine-print shipping tricks.",
  aboutCurationTitle: "How we choose what to sell",
  aboutCurationIntro: "We don't sell everything. Every product in the catalog passes a simple filter:",
  aboutCurationPoints: [
    "Solves a real everyday problem — not just another item on a shelf",
    "Has consistent reviews — we look at sales history and ratings before listing",
    "Honest pricing — no fake \"was $200, now $20\" discounts",
    "Truly free shipping — built into the price, no checkout surprise",
  ],
  aboutHowTitle: "How we work",
  aboutHowText:
    "We're a small team and we own the process end to end: product curation, customer support, and order follow-through. If something arrives wrong, defective, or simply isn't what you expected, you have 30 days to sort it out with us — refund or exchange, no bureaucratic games.",
  aboutExpectTitle: "What you can expect from Trove",
  aboutPoints: [
    "Products organized by real need — Pet, Home, Wellness, Desk & Tech",
    "Free shipping to all 50 US states",
    "Order tracking sent straight to your email",
    "Support from real people — no generic bot stalling you",
  ],
  aboutEarlyTitle: "Still early, but focused on what matters",
  aboutEarlyText:
    "Trove is still building its track record — and we're transparent about that. Our focus right now is simple: every order that leaves here should leave the customer satisfied, full stop. That's how a new brand earns trust — deliver, keep the promise, earn the repeat.",
  aboutText:
    "Every home has that running list of small things we always forget to buy. Trove brings useful everyday products together in one place — fair prices, free US shipping, and support you can actually reach.",
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
      a: "Yes — every order includes free standard US delivery. The price you see is what you pay at checkout (no shipping line added).",
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
      a: "We accept major credit and debit cards (no PayPal account required), PayPal, and Pay in 4 on eligible orders of $30 or more. All prices are in USD with no hidden fees at checkout.",

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
  checkoutPayment: "Secure checkout powered by PayPal.",
  checkoutProgress: ["Cart", "Shipping", "Payment"] as const,
  checkoutAlmostDone: "Complete shipping above to unlock payment.",
  checkoutUsOnly: "US shipping addresses only · Free delivery included in price",
  checkoutTrust: [
    { title: "Free US shipping", detail: "Included in every price" },
    { title: "Secure payment", detail: "PayPal encrypted checkout" },
    { title: "Fast delivery", detail: "3–5 business days" },
  ] as const,
  cartTrust: "Free US shipping · Secure PayPal checkout · 30-day returns",

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
