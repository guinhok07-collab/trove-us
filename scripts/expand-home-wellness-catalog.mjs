/**
 * Add vetted Home + Wellness products — PID-verified only.
 * Usage: node --env-file=.env.local scripts/expand-home-wellness-catalog.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { naturalSocialProof } from "./social-proof.mjs";
import {
  MAX_RETAIL,
  MIN_IMAGES,
  assignId,
  auditMedia,
  buildProductBlock,
  buildVariantsFromData,
  cjMatchesListing,
  compareAt,
  extractVideo,
  getToken,
  queryPid,
  retailPrice,
  supplierImages,
} from "./lib/cj-catalog-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const key = process.env.CJ_API_KEY;
if (!key) throw new Error("Set CJ_API_KEY");

const productsPath = resolve(__dirname, "../src/data/products.ts");
const variantsPath = resolve(__dirname, "../src/data/product-variants.json");
const huntPath = resolve(__dirname, "hunt-home-wellness-pids-results.json");

const LONG = {
  "bamboo-cutting-board":
    "Prep vegetables, fruit, and meat on a bamboo board with a built-in tray that catches juices and crumbs. Smooth surface is gentle on knife edges and rinses clean after every meal. Ships from our US warehouse in 3–5 business days.",
  "silicone-oven-mitts":
    "Pull casseroles and sheet pans from the oven with thick heat-resistant mitts that grip securely. Cotton lining adds comfort for longer baking sessions and hanging loops keep them within reach. Ships from our US warehouse in 3–5 business days.",
  "cascading-clothes-hangers":
    "Free up closet rod space by hanging multiple shirts from one cascading hook. Sturdy folding design keeps outfits visible and wrinkle-free in small bedrooms and apartments. Ships from our US warehouse in 3–5 business days.",
  "wall-toothbrush-holder":
    "Mount brushes and toothpaste beside the sink with a wall holder that includes UV sterilization and a dispenser squeeze slot. Keeps bathroom counters clear for families sharing one vanity. Ships from our US warehouse in 3–5 business days.",
  "countertop-dish-drying-rack":
    "Air-dry plates, bowls, and utensils on a folding rack that sits beside the sink and stores flat when not in use. Open design drains water fast in small kitchens and RVs. Ships from our US warehouse in 3–5 business days.",
  "ab-roller-wheel":
    "Strengthen your core with a dual-wheel roller that targets abs and obliques from the floor. Automatic rebound assist helps beginners control the movement and a knee pad cushions workouts. Ships from our US warehouse in 3–5 business days.",
  "pilates-ring":
    "Add gentle resistance to Pilates, yoga, and barre routines with a flexible ring that tones thighs, arms, and core. Foam grips stay comfortable during longer home sessions. Ships from our US warehouse in 3–5 business days.",
  "time-marker-water-bottle":
    "Hit daily hydration goals with a 1L bottle printed with hourly time markers and a leak-proof flip lid. Tritan plastic handles gym sessions, desk work, and commuting without odd tastes. Ships from our US warehouse in 3–5 business days.",
  "fabric-hip-resistance-band":
    "Activate glutes and legs before squats with mini loop bands that add light to medium resistance. Compact set fits in a gym bag for home workouts, travel, and warmups. Ships from our US warehouse in 3–5 business days.",
  "yoga-stretching-strap":
    "Reach deeper into hamstring and shoulder stretches with an adjustable cotton strap and metal buckle. Helps beginners and rehab patients improve flexibility safely on the mat. Ships from our US warehouse in 3–5 business days.",
};

const hunted = JSON.parse(readFileSync(huntPath, "utf8"));
const PICKS = Object.values(hunted).map((h) => ({
  ...h,
  longDescription: LONG[h.slug],
  tags: ["time-marker-water-bottle", "ab-roller-wheel", "countertop-dish-drying-rack"].includes(h.slug)
    ? ["bestseller"]
    : [],
}));

// Honest names for CJ reality
const NAME_FIX = {
  "wall-toothbrush-holder": "UV Toothbrush Holder & Dispenser",
  "fabric-hip-resistance-band": "Booty Resistance Band Set",
};
for (const p of PICKS) {
  if (NAME_FIX[p.slug]) p.name = NAME_FIX[p.slug];
}

let source = readFileSync(productsPath, "utf8");
const existingSlugs = new Set([...source.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]));
const usedVids = new Set([...source.matchAll(/cjVid: "([^"]+)"/g)].map((m) => m[1]));

const token = await getToken(key);
const toAdd = [];
let fail = 0;

for (const item of PICKS) {
  if (existingSlugs.has(item.slug)) {
    console.log("SKIP exists", item.slug);
    continue;
  }

  const data = await queryPid(token, item.pid);
  if (!data?.variants?.length) {
    fail++;
    console.log("FAIL query", item.slug);
    continue;
  }

  const cjName = data.productNameEn || "";
  const match = cjMatchesListing(item.slug, item.name, item.desc, item.features, cjName);
  if (!match.ok || match.nameScore < 0.18) {
    fail++;
    console.log("FAIL match", item.slug, Math.round(match.nameScore * 100) + "%");
    continue;
  }

  const variant = data.variants.find((v) => Number(v.variantSellPrice) > 0) || data.variants[0];
  if (!variant?.vid || usedVids.has(variant.vid)) {
    fail++;
    console.log("FAIL vid", item.slug);
    continue;
  }

  const cost = Number(variant.variantSellPrice ?? data.sellPrice ?? 0);
  const images = supplierImages(data, variant);
  if (images.length < MIN_IMAGES) {
    fail++;
    console.log("FAIL images", item.slug);
    continue;
  }

  const price = retailPrice(cost, item.ship);
  if (price > MAX_RETAIL) {
    fail++;
    console.log("FAIL price", item.slug, price);
    continue;
  }

  const video = extractVideo(data);
  const variants = buildVariantsFromData(data, item.ship);
  const defaultVariant = variants.find((v) => v.cjVid === variant.vid) || variants[0];
  const audit = auditMedia({ slug: item.slug, images: defaultVariant?.images ?? images, video, variantCount: variants.length, cjName });
  if (audit?.level === "error") {
    fail++;
    console.log("FAIL media", item.slug);
    continue;
  }

  const social = naturalSocialProof(item.slug, Number(data.listedNum || 0));
  usedVids.add(variant.vid);

  toAdd.push({
    ...item,
    description: item.desc,
    image: defaultVariant?.image ?? images[0],
    images: defaultVariant?.images ?? images,
    video,
    price,
    compareAtPrice: compareAt(price),
    supplierSku: data.productSku,
    cjVid: variant.vid,
    cjSku: variant.variantSku,
    variants,
    defaultVariantId: defaultVariant?.id,
    ...social,
  });
  console.log("OK", item.store, item.slug, `$${price.toFixed(2)}`);
}

if (!toAdd.length) {
  console.log(`Nothing new (${fail} failed).`);
  process.exit(0);
}

const blocks = [];
let idSource = source;
for (const entry of toAdd) {
  const id = assignId(idSource, entry.store);
  idSource += `\nid: "${id}"`;
  blocks.push(buildProductBlock(entry, id));
}

source = source.replace(/\n\];\n\nexport function getProductBySlug/, `,\n${blocks.join(",\n")}\n];\n\nexport function getProductBySlug`);
writeFileSync(productsPath, source);

const variantCatalog = JSON.parse(readFileSync(variantsPath, "utf8"));
for (const entry of toAdd) {
  variantCatalog[entry.slug] = { defaultVariantId: entry.defaultVariantId || entry.cjVid, variants: entry.variants };
}
writeFileSync(variantsPath, JSON.stringify(variantCatalog, null, 2));

const byStore = { home: 0, wellness: 0 };
for (const e of toAdd) byStore[e.store]++;
console.log(`\nAdded ${toAdd.length}`, byStore, "total:", [...source.matchAll(/slug: "/g)].length);
execSync("node scripts/relabel-variants.mjs", { cwd: resolve(__dirname, ".."), stdio: "inherit" });
