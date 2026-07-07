/**
 * Trove social content playbook — problem → solution → CTA.
 * Feed posts, Stories, Meta Ads, email. Used by organic copy + Aria brain.
 */

const SITE = "https://trove-us.com";
const BIO = "Link in bio · arrives in 3–5 days";

/** @type {Record<string, { name: string, priceLabel: string, url: string, imageHint: string }>} */
export const BUNDLES = {
  "pet-walk-kit": {
    name: "Pet Walk Kit",
    priceLabel: "Retractable leash + 270 bag rolls + portable walk cup",
    url: `${SITE}/#bundles`,
    imageHint: "Pet Walk Kit flat lay — leash, bag rolls, walk cup",
  },
  "recovery-duo": {
    name: "Recovery Duo",
    priceLabel: "under $26 delivered",
    url: `${SITE}/#bundles`,
    imageHint: "Mini massage gun + resistance bands side by side",
  },
  "desk-setup": {
    name: "Desk Setup",
    priceLabel: "laptop stand + USB-C cable + cable organizer",
    url: `${SITE}/#bundles`,
    imageHint: "Clean desk with laptop stand, cable, and cable box",
  },
};

export const CONTENT_RULES = `
## Trove social copy rules (Instagram · Facebook · Ads)
- Pattern: **problem → solution → direct CTA** (impulse-friendly, low ticket).
- Tone: conversational US English, no corporate fluff, no fake urgency countdowns.
- Always: free shipping all 50 states, 3–5 business days, price on page = final price.
- Hashtags: mix #ShopTrove #TroveUS with niche tags (max ~8–12 on feed).
- New account (@shoptrove.us): alternate **product posts** with **behind-the-scenes / unboxing** when available — not only a product shelf.
- Paid ads: run variations A (shipping), B (kit price), C (trust) in parallel 3–5 days; keep best CTR.
- Never claim "official Meta partner" or use phishing-style violation language.
`.trim();

export const FEED_POSTS = [
  {
    id: "pet-walk-kit",
    bundleSlug: "pet-walk-kit",
    emoji: "🐾",
  },
  {
    id: "recovery-duo",
    bundleSlug: "recovery-duo",
    emoji: "💪",
  },
  {
    id: "desk-setup",
    bundleSlug: "desk-setup",
    emoji: "🖥️",
  },
];

export const STORY_TEMPLATES = [
  {
    id: "pet-poll",
    sticker: "Poll",
    question: "Does your dog lose it on walk day too? 🐶",
    options: ["Yes!", "Mine's picky"],
    cta: "Full walk kit — free shipping. Swipe up / link in bio.",
    bundleSlug: "pet-walk-kit",
  },
  {
    id: "recovery-poll",
    sticker: "Poll",
    question: "Favorite post-workout pain? 😅",
    options: ["Back", "Legs"],
    cta: "Mini massage gun under $15 delivered — link in bio.",
    productSlug: "percussion-massage-gun",
  },
];

export const META_AD_VARIATIONS = [
  {
    id: "A",
    angle: "free-shipping",
    headline: "Free shipping on everything — all 50 states",
    primaryText:
      "Home, pet, wellness, and desk essentials — delivered with no extra shipping fee. Arrives in 3–5 days.",
    cta: "Shop Now",
  },
  {
    id: "B",
    angle: "kit-price",
    headline: "Curated kits from $25.98",
    primaryText:
      "Stop buying one random item at a time. Ready-made kits for pets, recovery, and home office — free shipping included.",
    cta: "See Kits",
  },
  {
    id: "C",
    angle: "trust",
    headline: "30-day guarantee · real human support",
    primaryText:
      "If it's not what you expected, we'll make it right. No fine print, no bot runaround.",
    cta: "Meet Trove",
  },
];

export const WELCOME_EMAIL = {
  subject: "Welcome to Trove 🎉",
  body: `Hi — glad you're here.

Trove exists to simplify that running list of small things your home, your pet, and you actually need — without hunting across ten different stores.

Free shipping on every order, delivery in 3–5 days, and if something isn't right, you have 30 days to sort it out with us.

See what's trending → ${SITE}/products`,
};

const FEED_COPY = {
  "pet-walk-kit": {
    hook: "Walk day, handled the practical way",
    problem: "Leash, bags, and water — three things you always forget until you're already at the door.",
    solution:
      "Retractable leash + 270 bag rolls + portable walk cup in one kit. Free shipping to all 50 states.",
    hashtags: "#petkit #dogwalk #petessentials #ShopTrove #TroveUS #DogMom #DogDad #FreeShipping",
  },
  "recovery-duo": {
    hook: "Your body will thank you after training",
    problem: "Sore muscles shouldn't mean a $60 gadget or a pile of single-use fixes.",
    solution:
      "Mini massage gun + resistance bands — Recovery Duo for under $26, delivered to your door with free shipping.",
    hashtags: "#recovery #wellness #homegym #ShopTrove #TroveUS #FitnessTok #SelfCare #FreeShipping",
  },
  "desk-setup": {
    hook: "Your desk deserves the upgrade",
    problem: "Bad posture, cable chaos, and one more dongle you can't find — sound familiar?",
    solution:
      "Laptop stand + USB-C cable + cable organizer. Full desk kit, free shipping, ships fast from our US warehouse.",
    hashtags: "#deskessentials #homeoffice #WFH #ShopTrove #TroveUS #DeskSetup #Productivity #FreeShipping",
  },
};

/**
 * @param {{ bundleSlug?: string, id?: string }} ref
 */
export function buildFeedPostCopy(ref) {
  const slug = ref.bundleSlug ?? ref.id;
  const bundle = BUNDLES[slug];
  const copy = FEED_COPY[slug];
  const meta = FEED_POSTS.find((p) => p.bundleSlug === slug || p.id === slug);
  if (!bundle || !copy) return null;

  const emoji = meta?.emoji ?? "";

  const instagram = [
    `${emoji} ${copy.hook}`.trim(),
    "",
    copy.problem,
    "",
    copy.solution,
    "",
    BIO,
    bundle.url,
    "",
    copy.hashtags,
  ].join("\n");

  const facebook = [
    `${copy.hook}`,
    "",
    copy.problem,
    "",
    copy.solution,
    "",
    `Shop now: ${bundle.url}`,
    "",
    copy.hashtags,
  ].join("\n");

  return {
    id: slug,
    bundle: bundle.name,
    imageHint: bundle.imageHint,
    instagram,
    facebook,
    hook: copy.hook,
  };
}

export function buildAllFeedPosts() {
  return FEED_POSTS.map((p) => buildFeedPostCopy(p)).filter(Boolean);
}

export function pickFeedPostForDay(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((date - start) / 86400000);
  const post = FEED_POSTS[day % FEED_POSTS.length];
  return buildFeedPostCopy(post);
}

export function buildStoryScript(template) {
  const t = typeof template === "string" ? STORY_TEMPLATES.find((s) => s.id === template) : template;
  if (!t) return null;
  return {
    question: t.question,
    poll: t.options,
    cta: t.cta,
    sticker: t.sticker,
    lines: [t.question, `[Poll: ${t.options.join(" / ")}]`, "", `→ ${t.cta}`].join("\n"),
  };
}

export function buildPlaybookMarkdown() {
  const lines = [
    "# Trove — Social Content Playbook",
    "",
    "Pattern: **problem → solution → direct CTA**",
    "",
    CONTENT_RULES,
    "",
    "---",
    "",
    "## Instagram / Facebook Feed (kits)",
    "",
  ];

  for (const post of buildAllFeedPosts()) {
    lines.push(`### ${post.bundle}`, `📸 ${post.imageHint}`, "", "**Instagram**", "```", post.instagram, "```", "");
    lines.push("**Facebook**", "```", post.facebook, "```", "", "---", "");
  }

  lines.push("## Stories (poll + CTA)", "");
  for (const t of STORY_TEMPLATES) {
    const s = buildStoryScript(t);
    lines.push(`### ${t.id}`, "```", s.lines, "```", "");
  }

  lines.push("## Meta Ads — A/B/C", "");
  for (const v of META_AD_VARIATIONS) {
    lines.push(
      `### Variation ${v.id} — ${v.angle}`,
      `- **Headline:** ${v.headline}`,
      `- **Text:** ${v.primaryText}`,
      `- **CTA:** ${v.cta}`,
      "",
    );
  }

  lines.push("## Welcome email", "", `**Subject:** ${WELCOME_EMAIL.subject}`, "", "```", WELCOME_EMAIL.body, "```", "");

  lines.push(
    "## Usage notes",
    "",
    "- Run ad variations A/B/C in parallel 3–5 days; keep the best CTR.",
    "- Interleave product posts with BTS / unboxing when you have customer photos.",
    "- Reels autopilot uses the same problem→solution tone via `social-organic-copy.mjs`.",
    "",
  );

  return lines.join("\n");
}

/** Problem → solution caption for single-product Reels */
export function buildProblemSolutionReelCopy(ad) {
  const catHooks = {
    pet: "The small pet things add up fast 🐾",
    home: "Why is this always the thing you forget? 🏠",
    wellness: "Recovery shouldn't cost a fortune 💪",
    tech: "Desk chaos, solved ⚡",
  };
  const hook = catHooks[ad.category] ?? "Everyday find worth a save ✨";
  const story = ad.sub ?? ad.product;
  const priceLine = ad.compare ? `${ad.price} · ${ad.perk}` : `${ad.price} · Free shipping included`;

  const instagram = [
    hook,
    "",
    `**The problem:** another random Amazon tab, another shipping fee surprise.`,
    "",
    `**The fix:** ${ad.product} — ${story}`,
    "",
    `💰 ${priceLine}`,
    "🇺🇸 Ships from US warehouse · 3–5 business days · Free shipping every order",
    "",
    "Link in bio →",
    ad.url,
    "",
    `#ShopTrove #TroveUS #FreeShipping ${ad.category === "pet" ? "#PetParents #DogMom" : ad.category === "wellness" ? "#Recovery #Wellness" : ad.category === "tech" ? "#DeskSetup #WFH" : "#HomeFinds"}`,
  ].join("\n");

  const facebook = [
    hook,
    "",
    `${ad.product} — ${priceLine}`,
    "",
    story,
    "",
    "Free US shipping · 3–5 day delivery",
    "",
    `Shop: ${ad.url}`,
  ].join("\n");

  return { instagram, facebook, hook, title: `Trove · ${ad.product}`, slug: ad.slug, product: ad.product, price: ad.price };
}

export function playbookForAiPrompt() {
  return `${CONTENT_RULES}

Example feed hook (Pet Walk Kit): "${FEED_COPY["pet-walk-kit"].hook}" → problem → solution → link in bio.
Ad A headline: "${META_AD_VARIATIONS[0].headline}"
When suggesting Instagram/Facebook copy, follow this structure in US English.`;
}
