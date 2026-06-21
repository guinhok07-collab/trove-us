/**
 * Add 4 impulse Home products (~$7–8) — trust-building low-risk picks
 * Usage: node --env-file=.env.local scripts/apply-home-impulse.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { naturalSocialProof } from "./social-proof.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PAYPAL = 0.034;
const MARGIN = 0.2;

const ITEMS = [
  {
    slug: "silicone-stove-gap-cover",
    pid: "97EC8D74-CB0F-4516-B2F0-6865C7453621",
    ship: 3.5,
    name: "Silicone Stove Gap Cover",
    description: "Seals the gap between stove and counter so crumbs and spills stay put.",
    longDescription:
      "Stop food and grease from falling into that hard-to-clean gap beside your range. Flexible silicone fits most stove-to-counter spaces and wipes clean in seconds. Heat-resistant for everyday cooking. Ships from our US warehouse in 3–5 business days.",
    features: ["Flexible silicone fit", "Heat resistant", "Easy wipe clean", "Trim-to-fit length"],
    tags: ["bestseller"],
  },
  {
    slug: "sink-splash-guard-mat",
    pid: "1538428019357003776",
    ship: 3.5,
    name: "Sink Splash Guard Mat",
    description: "Catches faucet splash and keeps countertops dry around the sink.",
    longDescription:
      "Keep water off your counters with a silicone mat that sits behind the faucet and along the backsplash. Absorbent surface catches splashes from washing dishes and produce. Rinse and reuse — no more puddles on the counter. Ships from our US warehouse in 3–5 business days.",
    features: ["Splash-catching design", "Silicone and absorbent layer", "Fits most faucets", "Washable and reusable"],
    tags: ["bestseller"],
  },
  {
    slug: "handheld-bag-sealer",
    pid: "1718960813723103232",
    ship: 3.5,
    name: "Handheld Bag Sealer",
    description: "Reseals chip bags and snack pouches in seconds — less waste, fresher food.",
    longDescription:
      "Close open bags without clips or rubber bands. This compact heat sealer works on plastic snack bags, cereal pouches, and more so snacks stay crisp. Battery-powered and small enough for a kitchen drawer. Ships from our US warehouse in 3–5 business days.",
    features: ["Heat-seal in seconds", "Portable handheld size", "Keeps snacks fresh", "Battery powered"],
    tags: ["bestseller"],
  },
  {
    slug: "kitchen-drawer-organizer",
    pid: "BB9C2683-C089-4FBE-B6EB-CE8217C40E31",
    ship: 4,
    name: "Kitchen Drawer Organizer Tray",
    description: "Adjustable tray keeps utensils, forks, and gadgets sorted in drawers.",
    longDescription:
      "Turn messy junk drawers into usable storage with a divider tray that expands to fit most kitchen drawers. Separate forks, spoons, spatulas, and small tools so everything has a spot. Easy to rinse clean after daily use. Ships from our US warehouse in 3–5 business days.",
    features: ["Expandable divider slots", "Utensil-friendly compartments", "Easy to clean", "Fits standard drawers"],
    tags: [],
  },
];

function retailPrice(cost, ship) {
  const base = cost + ship;
  return Math.max(Math.ceil(base / (1 - MARGIN - PAYPAL)) - 0.01, base + 1.5);
}

function formatImages(images) {
  return JSON.stringify(images, null, 4)
    .split("\n")
    .map((line, idx) => (idx === 0 ? line : "      " + line.trim()))
    .join("\n");
}

function assignId(source, store) {
  const prefix = store;
  const nums = [...source.matchAll(new RegExp(`id: "${prefix}-(\\d+)"`, "g"))].map((m) => Number(m[1]));
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
    store: "home",
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

async function queryPid(token, pid) {
  await sleep(1100);
  const res = await fetch(`${API}/product/query?pid=${encodeURIComponent(pid)}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());
  if (!res.result) throw new Error(JSON.stringify(res));
  return res.data;
}

function rankImages(urls) {
  const unique = [...new Set(urls.filter(Boolean))];
  return unique.sort((a, b) => {
    const score = (u) => (/\.jpe?g$/i.test(u) && !u.includes("_trans") ? 2 : 0) + (u.includes("oss-cf") ? 1 : 0);
    return score(b) - score(a);
  });
}

const token = await getToken();
const productsPath = resolve(__dirname, "../src/data/products.ts");
let source = readFileSync(productsPath, "utf8");
const existing = new Set([...source.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]));

const toAdd = [];
for (const item of ITEMS) {
  if (existing.has(item.slug)) {
    console.log("SKIP exists", item.slug);
    continue;
  }
  const data = await queryPid(token, item.pid);
  const v = data.variants?.find((x) => Number(x.variantSellPrice) > 0) || data.variants?.[0];
  if (!v?.vid) throw new Error(`No vid for ${item.slug}`);
  const cost = Number(v.variantSellPrice ?? data.sellPrice ?? 0);
  const images = rankImages([v.variantImage, data.bigImage, ...(data.productImageSet || [])]).slice(0, 8);
  const price = retailPrice(cost, item.ship);
  const listed = Number(data.listedNum || 0);
  const social = naturalSocialProof(item.slug, listed);
  toAdd.push({
    ...item,
    image: images[0],
    images,
    price,
    compareAtPrice: Math.ceil(price * 1.12) - 0.01,
    supplierSku: data.productSku,
    cjVid: v.vid,
    cjSku: v.variantSku,
    ...social,
  });
  console.log("OK", item.slug, "$" + cost.toFixed(2), "→", "$" + price.toFixed(2));
}

if (!toAdd.length) {
  console.log("Nothing to add.");
  process.exit(0);
}

const blocks = [];
let idSource = source;
for (const entry of toAdd) {
  const id = assignId(idSource, "home");
  idSource += `\nid: "${id}"`;
  blocks.push(buildBlock(entry, id));
}

source = source.replace(/\n\];\n\nexport function getProductBySlug/, `,\n${blocks.join(",\n")}\n];\n\nexport function getProductBySlug`);
writeFileSync(productsPath, source);
console.log(`Added ${toAdd.length}. Catalog: ${[...source.matchAll(/slug: "/g)].length} products`);
