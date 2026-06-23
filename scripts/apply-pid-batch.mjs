/**
 * Add vetted CJ products by PID (when search is unreliable).
 * Usage: node --env-file=.env.local scripts/apply-pid-batch.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { naturalSocialProof } from "./social-proof.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
if (!key) throw new Error("Set CJ_API_KEY");

const PAYPAL = 0.034;
const MARGIN = 0.2;
const MAX_RETAIL = 39.99;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BATCH = [
  {
    slug: "jump-rope-weighted",
    store: "wellness",
    pid: "2502140221331605800",
    ship: 3.5,
    name: "Adjustable Speed Jump Rope",
    description: "Cardio anywhere — adjustable length for HIIT, boxing, and home workouts.",
    longDescription:
      "Burn calories in small spaces with a tangle-free jump rope built for fast spins and daily training. Foam grips stay comfortable during longer sessions and the length adjusts for different heights. Fits in a gym bag for travel workouts. Ships from our US warehouse in 3–5 business days.",
    features: ["Ball-bearing handles", "Adjustable length", "Foam grips", "Tangle-resistant cord"],
    tags: [],
  },
  {
    slug: "cooling-towel-sports",
    store: "wellness",
    pid: "1952288555873259522",
    ship: 3.5,
    name: "Instant Cooling Sports Towel",
    description: "Wet, snap, and cool down fast after workouts or hot days.",
    longDescription:
      "Beat heat during runs, yard work, or gym sessions with a microfiber towel that stays cool for hours after a quick soak and snap. Re-wet anytime to refresh. Clips to a gym bag or golf cart — a summer essential. Ships from our US warehouse in 3–5 business days.",
    features: ["Instant chill tech", "Reusable microfiber", "Neck friendly size", "Machine washable"],
    tags: ["new"],
  },
  {
    slug: "dog-squeaky-plush-toy",
    store: "pet",
    pid: "1878724591728087042",
    ship: 3.5,
    name: "Squeaky Plush Dog Toy",
    description: "Soft squeaker toy for fetch, cuddles, and solo play.",
    longDescription:
      "Keep dogs entertained with a plush toy that squeaks during fetch and couch time. Fun shape and texture encourage daily play habits. An affordable add-on to any pet order — great for puppies and small to medium dogs. Ships from our US warehouse in 3–5 business days.",
    features: ["Built-in squeaker", "Soft plush", "Interactive shape", "Fetch friendly"],
    tags: [],
  },
  {
    slug: "cat-tunnel-toy",
    store: "pet",
    pid: "1993555922728558593",
    ship: 4.5,
    name: "Collapsible Cat Play Tunnel",
    description: "Peekaboo tunnel with soft bed for hide-and-pounce indoor play.",
    longDescription:
      "Indoor cats love darting through a plush tunnel with a cozy bed section for naps and ambush play. Collapsible design stores flat when not in use and sets up in seconds for daily enrichment. Pairs well with feather toys for exercise. Ships from our US warehouse in 3–5 business days.",
    features: ["Tunnel + bed combo", "Soft plush", "Collapsible", "Indoor enrichment"],
    tags: ["new"],
  },
  {
    slug: "pet-bowl-mat-silicone",
    store: "pet",
    pid: "1387639463303319552",
    ship: 3.5,
    name: "Silicone Pet Bowl Mat",
    description: "Waterproof mat catches spills around food and water bowls.",
    longDescription:
      "Protect floors from kibble crumbs and water splashes with a silicone mat that stays put under bowls. Waterproof surface wipes clean after every meal. Fits single or double bowl setups in kitchen or laundry room feeding zones. Ships from our US warehouse in 3–5 business days.",
    features: ["Waterproof silicone", "Non-slip base", "Easy wipe clean", "Bowl zone size"],
    tags: ["bestseller"],
  },
];

function retailPrice(cost, ship) {
  const base = cost + ship;
  return Math.min(Math.max(Math.ceil(base / (1 - MARGIN - PAYPAL)) - 0.01, base + 1.5), MAX_RETAIL);
}

function formatImages(images) {
  return JSON.stringify(images, null, 4)
    .split("\n")
    .map((line, idx) => (idx === 0 ? line : "      " + line.trim()))
    .join("\n");
}

function assignId(src, store) {
  const prefix = store === "wellness" ? "well" : store === "tech" ? "tech" : store;
  const nums = [...src.matchAll(new RegExp(`id: "${prefix}-(\\d+)"`, "g"))].map((m) => Number(m[1]));
  return `${prefix}-${(nums.length ? Math.max(...nums) : 0) + 1}`;
}

function buildBlock(entry, id) {
  return `  {
    id: "${id}",
    slug: "${entry.slug}",
    name: ${JSON.stringify(entry.name)},
    description: ${JSON.stringify(entry.description)},
    longDescription:
      ${JSON.stringify(entry.longDescription)},
    price: ${entry.price.toFixed(2)},
    compareAtPrice: ${entry.compareAtPrice.toFixed(2)},
    store: "${entry.store}",
    image: ${JSON.stringify(entry.image)},
    images: ${formatImages(entry.images)},
    rating: ${entry.rating},
    reviews: ${entry.reviews},
    sold: ${entry.sold},
    inStock: true,
    shippingDays: "3–5 days",
    warehouse: "US",
    tags: ${JSON.stringify(entry.tags || [])},
    features: ${JSON.stringify(entry.features)},
    supplierSku: ${JSON.stringify(entry.supplierSku)},
    cjVid: ${JSON.stringify(entry.cjVid)},
    cjSku: ${JSON.stringify(entry.cjSku)}
  }`;
}

async function getToken() {
  const auth = await fetch(`${API}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: key }),
  }).then((r) => r.json());
  return auth.data.accessToken;
}

const productsPath = resolve(__dirname, "../src/data/products.ts");
let source = readFileSync(productsPath, "utf8");
const existing = new Set([...source.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]));

const token = await getToken();
const toAdd = [];

for (const item of BATCH) {
  if (existing.has(item.slug)) {
    console.log("SKIP", item.slug);
    continue;
  }
  await sleep(1200);
  const res = await fetch(`${API}/product/query?pid=${encodeURIComponent(item.pid)}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());
  if (!res.result) {
    console.log("FAIL query", item.slug);
    continue;
  }
  const data = res.data;
  const v = data.variants?.find((x) => Number(x.variantSellPrice) > 0) || data.variants?.[0];
  if (!v?.vid) {
    console.log("FAIL vid", item.slug);
    continue;
  }
  const cost = Number(v.variantSellPrice ?? 0);
  const images = [...new Set([v.variantImage, data.bigImage, ...(data.productImageSet || [])].filter(Boolean))].slice(0, 8);
  const price = retailPrice(cost, item.ship);
  const listed = Number(data.listedNum || 0);
  const social = naturalSocialProof(item.slug, listed);
  toAdd.push({
    ...item,
    image: images[0],
    images,
    price,
    compareAtPrice: Math.ceil(price * 1.1) - 0.01,
    supplierSku: data.productSku,
    cjVid: v.vid,
    cjSku: v.variantSku,
    ...social,
  });
  console.log("OK", item.slug, `$${price.toFixed(2)}`, data.productNameEn?.slice(0, 45));
}

if (!toAdd.length) {
  console.log("Nothing to add.");
  process.exit(0);
}

const blocks = [];
let idSrc = source;
for (const entry of toAdd) {
  const id = assignId(idSrc, entry.store);
  idSrc += `\nid: "${id}"`;
  blocks.push(buildBlock(entry, id));
}

source = source.replace(
  /\n\];\n\nexport function getProductBySlug/,
  `,\n${blocks.join(",\n")}\n];\n\nexport function getProductBySlug`,
);
writeFileSync(productsPath, source);
console.log(`Added ${toAdd.length}. Total: ${[...source.matchAll(/slug: "/g)].length}`);
