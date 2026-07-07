/**
 * Build social ad config from live catalog — hooks + copy for IG / FB / TikTok.
 * Usage: node scripts/generate-social-ads-config.mjs
 */
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadVisibleProducts } from "./lib/parse-catalog-products.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "marketing/social");
mkdirSync(outDir, { recursive: true });

const storeBadge = {
  pet: "Pet Essentials",
  home: "Home Comfort",
  wellness: "Wellness Studio",
  tech: "Desk & Tech",
};

const hooksByStore = {
  pet: [
    "Dog parents — you need this 🐾",
    "Your pet will love this ✨",
    "Pet find of the week 🐶",
    "Every dog owner needs this",
  ],
  home: [
    "Home upgrade under ${price} 🏠",
    "Why didn't I buy this sooner?",
    "Small space, big difference ✨",
    "Amazon who? Same vibe, better price",
  ],
  wellness: [
    "Recovery without the $60 price tag 💪",
    "Gym people — save this",
    "Self-care Sunday essential ✨",
    "Your muscles will thank you",
  ],
  tech: [
    "Desk glow-up for under ${price} 💻",
    "WFH essential you didn't know you needed",
    "Tech find under $20 ⚡",
    "Upgrade your setup today",
  ],
};

function pickHook(store, price, index) {
  const list = hooksByStore[store] ?? hooksByStore.home;
  const raw = list[index % list.length];
  return raw.replace("${price}", `$${price.toFixed(2)}`);
}

function shortName(name, max = 42) {
  if (name.length <= max) return name;
  return name.slice(0, max - 1).trim() + "…";
}

function selectProducts(all) {
  const scored = all.map((p) => ({
    ...p,
    score:
      (p.tags.includes("bestseller") ? 3 : 0) +
      (p.tags.includes("free-shipping") ? 1 : 0) +
      (p.price <= 25 ? 2 : p.price <= 35 ? 1 : 0),
  }));

  const byStore = { pet: [], home: [], wellness: [], tech: [] };
  for (const p of scored.sort((a, b) => b.score - a.score)) {
    if (byStore[p.store].length < 5) byStore[p.store].push(p);
  }

  const picked = [];
  for (const store of Object.keys(byStore)) {
    picked.push(...byStore[store].slice(0, 4));
  }

  // Always include massage gun if visible
  const massage = all.find((p) => p.slug === "percussion-massage-gun");
  if (massage && !picked.some((p) => p.slug === massage.slug)) {
    picked.unshift(massage);
  }

  return picked.slice(0, 16);
}

function buildCopy(p, hook, index) {
  const priceStr = `$${p.price.toFixed(2)}`;
  const badge = storeBadge[p.store] ?? "Trove";
  const perk =
    p.compareAtPrice && p.compareAtPrice > p.price
      ? `Was $${p.compareAtPrice.toFixed(2)} — now ${priceStr}`
      : "Free shipping included";

  const hashtags = {
    pet: "#dogsoftiktok #petfinds #dogmom #petlover #puppy",
    home: "#homefinds #homedecor #organization #amazonfinds #homehacks",
    wellness: "#wellness #fitness #recovery #selfcare #gymtok",
    tech: "#desksetup #techfinds #wfhlife #productivity #setupinspo",
  };

  const baseTags =
    "#trove #troveus #shoptrove #freeshipping #onlineshopping #shopnow #usdelivery";
  const extra = hashtags[p.store] ?? "";

  return {
    file: `${String(index + 1).padStart(2, "0")}-${p.slug}`,
    slug: p.slug,
    category: p.store,
    hook,
    sub: shortName(p.name),
    product: p.name,
    price: priceStr,
    compare: p.compareAtPrice ? `$${p.compareAtPrice.toFixed(2)}` : "",
    perk,
    badge,
    image: p.image,
    url: p.url,
    instagram: `${hook}\n\n${shortName(p.name, 60)} — ${priceStr} with free shipping.\n\n${p.description}\n\n✓ Ships from US warehouse (3–5 days)\n✓ Free shipping on every order\n\nShop → link in bio\n${p.url.replace("https://", "")}\n\n${baseTags} ${extra}`.trim(),
    facebook: `${hook}\n\n${p.name} — ${priceStr}\nFree shipping included · Ships in 3–5 business days\n\n${p.description}\n\nShop now: ${p.url}`.trim(),
    tiktok: `${hook} ${shortName(p.name, 50)} for ${priceStr} — free shipping 🇺🇸 Link in bio · trove-us.com\n\n${baseTags} ${extra}`.trim(),
  };
}

const products = loadVisibleProducts();
const selected = selectProducts(products);
const ads = selected.map((p, i) =>
  buildCopy(p, pickHook(p.store, p.price, i), i),
);

writeFileSync(resolve(outDir, "ads.json"), JSON.stringify(ads, null, 2), "utf8");
console.log(`Generated ${ads.length} ads → marketing/social/ads.json`);
