/**
 * Add hunted bestsellers from hunt-bestsellers-batch-results.json.
 * Usage: node --env-file=.env.local scripts/expand-bestsellers-batch.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
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
  getToken,
  queryPid,
  resolveProductVideo,
  retailPrice,
  supplierImages,
} from "./lib/cj-catalog-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const key = process.env.CJ_API_KEY;
if (!key) throw new Error("Set CJ_API_KEY");

const productsPath = resolve(__dirname, "../src/data/products.ts");
const variantsPath = resolve(__dirname, "../src/data/product-variants.json");
const huntPath = resolve(__dirname, "hunt-bestsellers-batch-results.json");
const copyPath = resolve(__dirname, "product-copy.json");

if (!existsSync(huntPath)) {
  throw new Error("Run hunt-bestsellers-batch.mjs first");
}

const LONG = {
  "dog-raincoat-poncho":
    "Keep walks going when the weather turns with a lightweight waterproof poncho that covers the back and chest without restricting movement. Adjustable straps fit growing dogs and reflective accents help with dusk visibility. Ships from our US warehouse in 3–5 business days.",
  "pet-drying-towel-bag":
    "After baths or rainy walks, wrap your pet in an absorbent microfiber robe that soaks up water faster than a regular towel. Soft fabric is gentle on skin and machine washable for weekly use. Ships from our US warehouse in 3–5 business days.",
  "cat-treat-dispenser-toy":
    "Turn snack time into play with a treat ball that releases kibble as cats bat and chase it. Adjustable openings slow eating and burn energy indoors. Ships from our US warehouse in 3–5 business days.",
  "dog-training-clicker":
    "Teach sit, stay, and come with a clear clicker that marks good behavior instantly. Wrist strap keeps it handy on walks and training sessions. Ships from our US warehouse in 3–5 business days.",
  "kitchen-sink-strainer-plug":
    "Stop food scraps from clogging the drain with a wide-rim stainless strainer that lifts out for quick rinsing. A simple daily fix for busy kitchens. Ships from our US warehouse in 3–5 business days.",
  "garlic-press-mincer":
    "Crush fresh garlic in one squeeze without sticky knife boards. Built-in cleaner pops residue free and the stainless body rinses clean. Ships from our US warehouse in 3–5 business days.",
  "egg-separator-tool":
    "Separate yolks from whites for baking with a food-safe tool that sits over a bowl. Less mess than shell juggling and easy to rinse. Ships from our US warehouse in 3–5 business days.",
  "shoe-horn-long-handle":
    "Slide into shoes without bending thanks to a long handle and smooth glide surface. Helpful for daily dressing and tight sneakers. Ships from our US warehouse in 3–5 business days.",
  "laundry-lint-remover":
    "Refresh sweaters and upholstery by shaving pills and lint into the catcher tray. USB rechargeable so you are not hunting batteries. Ships from our US warehouse in 3–5 business days.",
  "yoga-block-foam":
    "Support balance poses and deeper stretches with a dense foam block that will not compress under weight. Lightweight for home studios and travel mats. Ships from our US warehouse in 3–5 business days.",
  "ankle-weights-pair":
    "Tone legs and glutes on walks or mat workouts with padded ankle weights that strap securely. Pair included for balanced training. Ships from our US warehouse in 3–5 business days.",
  "pill-organizer-weekly":
    "Sort vitamins and medications into labeled day compartments so morning and night doses stay clear. Compact enough for travel bags. Ships from our US warehouse in 3–5 business days.",
  "reusable-gel-ice-pack":
    "Ease sore muscles with a flexible gel pack you freeze for cold therapy or warm for heat. Soft cover stays comfortable against skin. Ships from our US warehouse in 3–5 business days.",
  "phone-tripod-flexible":
    "Wrap flexible legs around poles, bed frames, or desk edges for hands-free photos and video calls. Universal clamp fits most phones with cases. Ships from our US warehouse in 3–5 business days.",
  "desk-mouse-pad-extended":
    "Cover your keyboard and mouse zone with a stitched desk mat that stays put and cleans easily. Smooth tracking surface for daily work. Ships from our US warehouse in 3–5 business days.",
  "laptop-privacy-screen":
    "Keep emails private on flights and cafes with a filter that darkens side angles while you see the screen clearly head-on. Peel-and-stick install for common laptop sizes. Ships from our US warehouse in 3–5 business days.",
};

const hunted = JSON.parse(readFileSync(huntPath, "utf8"));
const picks = Object.values(hunted);

let source = readFileSync(productsPath, "utf8");
const existingSlugs = new Set([...source.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]));
const usedVids = new Set([...source.matchAll(/cjVid: "([^"]+)"/g)].map((m) => m[1]));

const token = await getToken(key);
const toAdd = [];
let fail = 0;

for (const item of picks) {
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
  const match = cjMatchesListing(
    item.slug,
    item.name,
    item.description || item.desc,
    item.features,
    cjName,
  );
  if (!match.ok || match.nameScore < 0.18) {
    fail++;
    console.log("FAIL match", item.slug, Math.round(match.nameScore * 100) + "%", cjName.slice(0, 50));
    continue;
  }

  const variant =
    data.variants.find((v) => Number(v.variantSellPrice) > 0) || data.variants[0];
  if (!variant?.vid || usedVids.has(variant.vid)) {
    fail++;
    console.log("FAIL vid", item.slug);
    continue;
  }

  const cost = Number(variant.variantSellPrice ?? data.sellPrice ?? 0);
  const images = supplierImages(data, variant);
  if (images.length < MIN_IMAGES) {
    fail++;
    console.log("FAIL images", item.slug, images.length);
    continue;
  }

  const price = retailPrice(cost, item.ship, item.slug);
  if (price > MAX_RETAIL) {
    fail++;
    console.log("FAIL price", item.slug, price);
    continue;
  }

  const video = await resolveProductVideo(token, data);
  const variants = buildVariantsFromData(data, item.ship);
  const defaultVariant =
    variants.find((v) => v.cjVid === variant.vid) || variants[0];
  const audit = auditMedia({
    slug: item.slug,
    images: defaultVariant?.images ?? images,
    video,
    variantCount: variants.length,
    cjName,
  });
  if (audit?.level === "error") {
    fail++;
    console.log("FAIL media", item.slug);
    continue;
  }

  const listed = Number(data.listedNum || item.listedNum || 0);
  const social = naturalSocialProof(item.slug, listed);
  usedVids.add(variant.vid);

  const tags = [...(item.tags || [])];
  if (listed > 800 && !tags.includes("bestseller")) tags.push("bestseller");

  toAdd.push({
    slug: item.slug,
    store: item.store,
    name: item.name,
    description: item.description || item.desc,
    longDescription: LONG[item.slug] || item.description || item.desc,
    features: item.features,
    tags,
    image: defaultVariant?.image ?? images[0],
    images: defaultVariant?.images ?? images,
    video,
    price,
    compareAtPrice: compareAt(price, item.slug),
    supplierSku: data.productSku,
    cjVid: variant.vid,
    cjSku: variant.variantSku,
    variants,
    defaultVariantId: defaultVariant?.id,
    ...social,
  });
  console.log(
    "OK",
    item.store,
    item.slug,
    `$${price.toFixed(2)}`,
    video ? "VIDEO" : "no-video",
    `v${variants.length}`,
    `listed ${listed}`,
  );
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

source = source.replace(
  /\n\];\r?\n\r?\nexport function getProductBySlug/,
  `,\n${blocks.join(",\n")}\n];\n\nexport function getProductBySlug`,
);
if (!toAdd.every((e) => source.includes(`slug: "${e.slug}"`))) {
  throw new Error("Failed to append product blocks — check products.ts footer pattern");
}
writeFileSync(productsPath, source);

const variantCatalog = JSON.parse(readFileSync(variantsPath, "utf8"));
for (const entry of toAdd) {
  variantCatalog[entry.slug] = {
    defaultVariantId: entry.defaultVariantId || entry.cjVid,
    variants: entry.variants,
  };
}
writeFileSync(variantsPath, JSON.stringify(variantCatalog, null, 2) + "\n");

// Persist English copy for future relinks
let copy = {};
try {
  copy = JSON.parse(readFileSync(copyPath, "utf8"));
} catch {
  /* optional */
}
for (const entry of toAdd) {
  copy[entry.slug] = {
    name: entry.name,
    description: entry.description,
    longDescription: entry.longDescription,
    features: entry.features,
  };
}
writeFileSync(copyPath, JSON.stringify(copy, null, 2) + "\n");

const byStore = {};
for (const e of toAdd) byStore[e.store] = (byStore[e.store] || 0) + 1;
console.log(
  `\nAdded ${toAdd.length}`,
  byStore,
  "catalog slugs:",
  [...source.matchAll(/slug: "/g)].length,
);

try {
  execSync("node scripts/relabel-variants.mjs", {
    cwd: resolve(__dirname, ".."),
    stdio: "inherit",
  });
} catch {
  console.log("(relabel-variants skipped or failed — run normalize-labels next)");
}
