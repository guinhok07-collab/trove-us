export const brand = {
  name: "Trove",
  shortName: "Trove",
  tagline: "Life's essentials, in one place",
  description:
    "Everyday products for home, pets, wellness, and work — curated with care, delivered fast across the United States.",
  supportEmail: "hello@trovegoods.com",
  locationLine: "Delivering to all 50 states",
  shippingLine: "Free delivery on orders over $35",
  deliveryLine: "Most orders arrive in 3–5 business days",
  trustLine: "Secure checkout · Easy 30-day returns · Real support",
  suggestedDomain: "trovegoods.com",
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
    "trovegoods.com",
    "shoptrove.com",
    "gettrove.com",
    "trove.co",
  ],
} as const;

export const copy = {
  heroBadge: "Curated essentials · Fast delivery · Easy returns",
  heroCta: "Start Shopping",
  heroSecondary: "Shop Best Sellers",
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
      title: "Fast, reliable delivery",
      text: "Most orders reach your door in 3–5 business days.",
    },
    {
      icon: "return" as const,
      title: "Easy 30-day returns",
      text: "Not satisfied? Full refund or exchange — no hassle.",
    },
    {
      icon: "support" as const,
      title: "Real people, real support",
      text: "Email us anytime — we respond within 24 hours.",
    },
  ],
  trustStrip: [
    { icon: "lock" as const, label: "SSL Secure Checkout" },
    { icon: "credit-card" as const, label: "PayPal & Cards Accepted" },
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
  promiseTitle: "Shop with confidence",
  promiseText:
    "Useful products for real life — your home, your pets, your health, and your daily routine. One checkout, one team, one promise to take care of you.",
  bestSellers: "Customer Favorites",
  bestSellersSub: "Most-loved picks this season",
  emptyCart: "Your cart is waiting — find something you'll love.",
  productDelivery: "Delivery in 3–5 business days",
  productShipsUs: "Ships anywhere in the US",
  checkoutSecure: "Secure checkout — your information is protected",
  checkoutPayment: "Pay safely with PayPal or credit card",
} as const;
