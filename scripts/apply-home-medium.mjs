/**
 * Add 5 medium-ticket Home products ($11–$20)
 * Usage: node --env-file=.env.local scripts/apply-home-medium.mjs
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
    slug: "lazy-susan-turntable",
    pid: "2408230816271625700",
    ship: 4,
    name: "Lazy Susan Turntable",
    description: "Spinning tray keeps spices, sauces, and pantry items within easy reach.",
    longDescription:
      "Stop digging through deep cabinets with a smooth-rotating turntable that brings everything to the front. Works in pantries, fridges, under sinks, and on countertops. Non-slip base stays put while you spin. Ships from our US warehouse in 3–5 business days.",
    features: ["360° smooth rotation", "Non-slip base", "Pantry and fridge friendly", "Easy wipe clean"],
    tags: ["new"],
  },
  {
    slug: "fridge-produce-containers",
    pid: "1418133527236579328",
    ship: 4,
    name: "Fridge Produce Storage Containers",
    description: "Ventilated containers keep fruits and veggies fresher longer in the fridge.",
    longDescription:
      "Extend the life of produce with containers designed for airflow and easy stacking. Clear design lets you see what's inside without opening every bin. Ideal for berries, greens, chopped veggies, and meal-prep portions. Ships from our US warehouse in 3–5 business days.",
    features: ["Ventilated freshness design", "Stackable in fridge", "Clear visibility", "Meal-prep friendly"],
    tags: [],
  },
  {
    slug: "silicone-dish-drying-mat",
    pid: "2020074613444993025",
    ship: 4,
    name: "Silicone Dish Drying Mat",
    description: "Heat-resistant mat protects counters while dishes air dry.",
    longDescription:
      "Give wet dishes a dedicated drying zone without soaking your countertops. Textured silicone grips plates and glasses while water drains away. Rolls up for drawer storage when not in use. Ships from our US warehouse in 3–5 business days.",
    features: ["Heat resistant silicone", "Non-slip textured surface", "Counter protection", "Rolls up for storage"],
    tags: [],
  },
  {
    slug: "pot-lid-organizer-rack",
    pid: "2049755567741509633",
    ship: 4.5,
    name: "Expandable Pot & Lid Rack",
    description: "Vertical rack stores pot lids and pans neatly inside cabinets.",
    longDescription:
      "Reclaim cabinet space with an adjustable rack that holds lids upright and easy to grab. Expandable width fits most standard kitchen cabinets. Keeps matching lids with the right pots without stacking chaos. Ships from our US warehouse in 3–5 business days.",
    features: ["Expandable width", "Vertical lid storage", "Cabinet-friendly size", "Easy assembly"],
    tags: [],
  },
  {
    slug: "automatic-soap-dispenser",
    pid: "1628204613260292096",
    ship: 4,
    name: "Automatic Soap Dispenser",
    description: "Touchless dispenser for kitchen or bathroom — hands-free and hygienic.",
    longDescription:
      "Reduce mess around the sink with an infrared sensor that dispenses soap without touching the pump. Works with liquid soap and sanitizer for kitchens, bathrooms, and laundry rooms. USB rechargeable for everyday use. Ships from our US warehouse in 3–5 business days.",
    features: ["Touchless infrared sensor", "USB rechargeable", "Kitchen and bath ready", "Adjustable dispense amount"],
    tags: ["bestseller", "free-shipping"],
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
  const nums = [...source.matchAll(new RegExp(`id: "${store}-(\\d+)"`, "g"))].map((m) => Number(m[1]));
  return `${store}-${(nums.length ? Math.max(...nums) : 0) + 1}`;
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

function rankImages(urls) {
  const unique = [...new Set(urls.filter(Boolean))];
  return unique.sort((a, b) => {
    const score = (u) => (/\.jpe?g$/i.test(u) && !u.includes("_trans") ? 2 : 0) + (u.includes("oss-cf") ? 1 : 0);
    return score(b) - score(a);
  });
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
  if (!res.result) throw new Error(`${pid}: ${JSON.stringify(res)}`);
  return res.data;
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
  const tags = [...(item.tags || [])];
  if (price >= 35 && !tags.includes("free-shipping")) tags.push("free-shipping");
  toAdd.push({
    ...item,
    tags,
    image: images[0],
    images,
    price,
    compareAtPrice: Math.ceil(price * 1.12) - 0.01,
    supplierSku: data.productSku,
    cjVid: v.vid,
    cjSku: v.variantSku,
    ...naturalSocialProof(item.slug, listed),
  });
  console.log("OK", item.slug, "$" + cost.toFixed(2), "→", "$" + price.toFixed(2), data.productNameEn.slice(0, 50));
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
console.log(`\nAdded ${toAdd.length}. Catalog: ${[...source.matchAll(/slug: "/g)].length} products`);
