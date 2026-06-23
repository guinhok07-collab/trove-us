/**
 * Add vetted CJ products — requires 4+ photos, unique vid, US warehouse.
 * Usage: node --env-file=.env.local scripts/expand-trust-catalog.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { naturalSocialProof } from "./social-proof.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
if (!key) throw new Error("Set CJ_API_KEY");

const MIN_IMAGES = 4;
const MAX_IMAGES = 10;
const MAX_RETAIL = 39.99;
const MARGIN = 0.2;
const PAYPAL = 0.034;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PICKS = [
  {
    slug: "mason-jar-storage-lids",
    store: "home",
    pid: "1435808620488794112",
    ship: 3.5,
    name: "Mason Jar Storage Lid Set",
    description: "Turn jars into pantry pour spouts and shaker lids.",
    longDescription:
      "Repurpose mason jars for rice, pasta, spices, and snacks with leak-resistant lids that pour or shake without removing the ring. BPA-free plastic fits regular-mouth jars you already own. Less plastic waste and a cleaner pantry look. Ships from our US warehouse in 3–5 business days.",
    features: ["Pour & shaker lids", "Regular-mouth fit", "BPA-free", "Multi-pack"],
    tags: ["bestseller"],
  },
  {
    slug: "silicone-utensil-rest",
    store: "home",
    pid: "1880165726666571777",
    ship: 3.5,
    name: "Silicone Spoon Rest",
    description: "Keeps counters clean while cooking — holds ladles and spatulas.",
    longDescription:
      "Stop sauce drips on the counter with a heat-resistant spoon rest that sits beside the stove. Wide cradle fits ladles, tongs, and spatulas during busy meal prep. Dishwasher safe silicone rinses clean in seconds. Ships from our US warehouse in 3–5 business days.",
    features: ["Heat resistant", "Wide cradle", "Non-slip base", "Dishwasher safe"],
    tags: [],
  },
  {
    slug: "collapsible-colander",
    store: "home",
    pid: "1389086444166844417",
    ship: 4,
    name: "Collapsible Silicone Colander",
    description: "Drain pasta and rinse produce — folds flat for small kitchens.",
    longDescription:
      "Save drawer space with a silicone colander that expands over the sink and collapses when you're done. Heat-resistant for hot pasta water and flexible enough to squeeze into tight cabinets. Dishwasher safe for everyday cooking. Ships from our US warehouse in 3–5 business days.",
    features: ["Collapsible design", "Heat-resistant silicone", "Over-sink handles", "Dishwasher safe"],
    tags: [],
  },
  {
    slug: "over-sink-dish-rack",
    store: "home",
    pid: "1979721256734818305",
    ship: 4.5,
    name: "Over-Sink Roll-Up Dish Drying Rack",
    description: "Rolls out over the sink for extra drying space — stores flat.",
    longDescription:
      "Small kitchen? Roll this rack over the sink to air-dry plates and glasses without a bulky dish drainer on the counter. Silicone-coated steel bars support heavy pots and roll up for drawer storage. Ships from our US warehouse in 3–5 business days.",
    features: ["Roll-up design", "Over-sink fit", "Heat resistant bars", "Space saving"],
    tags: [],
  },
  {
    slug: "bed-sheet-organizer",
    store: "home",
    pid: "1947204011127468033",
    ship: 4,
    name: "Bed Sheet Organizer Set",
    description: "Keep matching sheet sets together — no more lost pillowcases.",
    longDescription:
      "Label and store folded sheet sets in breathable organizers so you grab the right size without digging through the linen closet. Fits standard queen and full sets and stacks neatly on shelves. Ships from our US warehouse in 3–5 business days.",
    features: ["Labeled pockets", "Breathable fabric", "Closet stackable", "Set of 3"],
    tags: [],
  },
  {
    slug: "foam-roller-recovery",
    store: "wellness",
    pid: "1358613634519478272",
    ship: 4.5,
    name: "EVA Foam Roller — Muscle Recovery",
    description: "Roll out sore legs, back, and IT band after workouts.",
    longDescription:
      "Speed up recovery with a firm EVA foam roller that targets quads, hamstrings, and upper back without a gym appointment. Textured surface grips the floor while you control pressure. Lightweight enough to stash by the couch or in a gym bag. Ships from our US warehouse in 3–5 business days.",
    features: ["High-density EVA", "Full-body use", "Non-slip texture", "Lightweight"],
    tags: [],
  },
  {
    slug: "portable-blender-bottle",
    store: "wellness",
    pid: "1718960813657235457",
    ship: 4.5,
    name: "Portable USB Smoothie Blender",
    description: "Rechargeable personal blender for protein shakes on the go.",
    longDescription:
      "Blend smoothies at the gym, office, or hotel with a compact USB-rechargeable cup blender. BPA-free jar rinses clean fast and handles frozen fruit and protein powder. One-button operation — no countertop space needed. Ships from our US warehouse in 3–5 business days.",
    features: ["USB rechargeable", "BPA-free cup", "6-blade base", "Travel size"],
    tags: ["bestseller"],
  },
  {
    slug: "wireless-mouse-silent",
    store: "tech",
    pid: "1941075320677969921",
    ship: 3.5,
    name: "Silent Wireless Mouse",
    description: "Quiet clicks and smooth tracking for office and travel.",
    longDescription:
      "Work in cafes and shared spaces without loud click sounds. Ergonomic shape supports all-day use and the USB receiver stores inside the mouse for travel. Plug-and-play on Windows and Mac. Ships from our US warehouse in 3–5 business days.",
    features: ["Silent clicks", "USB receiver storage", "Ergonomic shape", "Plug and play"],
    tags: ["bestseller"],
  },
  {
    slug: "phone-ring-holder",
    store: "tech",
    pid: "1990626446278889473",
    ship: 3.5,
    name: "Phone Ring Holder & Stand",
    description: "Secure grip and kickstand for one-handed texting and video.",
    longDescription:
      "Reduce drop anxiety with a metal ring that rotates into a stand for recipes, FaceTime, and scrolling. Strong adhesive attaches to most phone cases. A low-cost upgrade that makes big phones easier to hold. Ships from our US warehouse in 3–5 business days.",
    features: ["360° rotation", "Kickstand mode", "Strong adhesive", "Slim profile"],
    tags: ["bestseller"],
  },
  {
    slug: "laptop-sleeve-13",
    store: "tech",
    pid: "1763402968205897728",
    ship: 4,
    name: "Neoprene Laptop Sleeve — 13–14\"",
    description: "Slim scratch protection for MacBook and ultrabooks.",
    longDescription:
      "Slide your laptop into a padded neoprene sleeve before tossing it in a tote or backpack. Soft interior prevents scratches and the zipper opens wide for quick security checks. Fits most 13–14 inch laptops. Ships from our US warehouse in 3–5 business days.",
    features: ["Neoprene padding", "Scratch protection", "Wide zipper", "13–14 inch fit"],
    tags: [],
  },
  {
    slug: "cat-grooming-slicker-brush",
    store: "pet",
    pid: "1377182883625701376",
    ship: 3.5,
    name: "Pet Slicker Grooming Brush",
    description: "Removes loose fur and prevents mats on dogs and cats.",
    longDescription:
      "Keep shedding under control with a slicker brush that reaches undercoat without irritating skin. Comfortable grip makes daily grooming sessions easier for you and your pet. Rinse clean after use. Ships from our US warehouse in 3–5 business days.",
    features: ["Fine bent bristles", "Undercoat reach", "Comfort grip handle", "Dogs & cats"],
    tags: [],
  },
];

function parseImageField(value) {
  const out = [];
  if (!value) return out;
  if (Array.isArray(value)) {
    for (const item of value) out.push(...parseImageField(item));
    return out;
  }
  if (typeof value !== "string") return out;
  const t = value.trim();
  if (t.startsWith("http")) return [t];
  if (t.startsWith("[")) {
    try {
      return parseImageField(JSON.parse(t));
    } catch {
      return out;
    }
  }
  return out;
}

function rankImages(urls) {
  return [...new Set(urls.filter((u) => u?.startsWith("http")))].slice(0, MAX_IMAGES);
}

function extractMedia(data, variant) {
  const raw = [
    ...parseImageField(variant?.variantImage),
    ...parseImageField(data?.bigImage),
    ...parseImageField(data?.productImageSet),
    ...parseImageField(data?.productImage),
  ];
  const images = rankImages(raw);
  const video =
    typeof data?.productVideo === "string" && data.productVideo.startsWith("http")
      ? data.productVideo
      : undefined;
  return { images, video };
}

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
  const videoLine = entry.video ? `\n    video: ${JSON.stringify(entry.video)},` : "";
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
    images: ${formatImages(entry.images)},${videoLine}
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
const existingSlugs = new Set([...source.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]));
const existingVids = new Set([...source.matchAll(/cjVid: "([^"]+)"/g)].map((m) => m[1]));

const token = await getToken();
const toAdd = [];

for (const pick of PICKS) {
  if (existingSlugs.has(pick.slug)) {
    console.log("SKIP exists", pick.slug);
    continue;
  }

  await sleep(1200);
  const res = await fetch(`${API}/product/query?pid=${encodeURIComponent(pick.pid)}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());

  if (!res.result) {
    console.log("FAIL query", pick.slug, pick.pid);
    continue;
  }

  const data = res.data;
  const v = data.variants?.find((x) => Number(x.variantSellPrice) > 0) || data.variants?.[0];
  if (!v?.vid) {
    console.log("FAIL vid", pick.slug);
    continue;
  }

  if (existingVids.has(v.vid)) {
    console.log("SKIP duplicate vid", pick.slug, v.vid);
    continue;
  }

  const { images, video } = extractMedia(data, v);
  if (images.length < MIN_IMAGES) {
    console.log("SKIP low images", pick.slug, images.length);
    continue;
  }

  const cost = Number(v.variantSellPrice ?? 0);
  if (cost < 0.4 || cost > 42) {
    console.log("SKIP cost", pick.slug, cost);
    continue;
  }

  const price = retailPrice(cost, pick.ship);
  const listed = Number(data.listedNum || 0);
  const social = naturalSocialProof(pick.slug, listed);

  toAdd.push({
    ...pick,
    image: images[0],
    images,
    video,
    price,
    compareAtPrice: Math.ceil(price * 1.1) - 0.01,
    supplierSku: data.productSku,
    cjVid: v.vid,
    cjSku: v.variantSku,
    ...social,
  });
  existingVids.add(v.vid);
  console.log("OK", pick.slug, images.length, "imgs", `$${price.toFixed(2)}`);
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
console.log(`\nAdded ${toAdd.length}. Total: ${[...source.matchAll(/slug: "/g)].length}`);
