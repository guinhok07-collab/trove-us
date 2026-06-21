/**
 * Apply product copy, remove bad matches, update corrected CJ data.
 * Usage: node scripts/apply-catalog-review.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const path = resolve(__dirname, "../src/data/products.ts");
let source = readFileSync(path, "utf8");

const copy = JSON.parse(readFileSync(resolve(__dirname, "product-copy.json"), "utf8"));
const fix = JSON.parse(readFileSync(resolve(__dirname, "cj-fix-results.json"), "utf8"));
const pid = JSON.parse(readFileSync(resolve(__dirname, "cj-pid-updates.json"), "utf8"));

const REMOVE = new Set([
  "cat-window-perch",
  "ice-cube-tray-silicone",
  "door-draft-stopper",
  "bed-sheet-organizer",
  "meditation-cushion",
  "jade-roller-gua-sha",
  "muscle-roller-stick",
  "webcam-cover-slide",
  "monitor-light-bar",
  "silicone-food-storage-bags",
  "tablet-stand-adjustable",
]);

const dataUpdates = { ...fix, ...pid };
delete dataUpdates["spice-rack-organizer"];
delete dataUpdates["silicone-food-storage-bags"];
Object.assign(dataUpdates, pid);

function findObjectBounds(text, slug) {
  const slugIdx = text.indexOf(`slug: "${slug}"`);
  if (slugIdx === -1) return null;
  const objStart = text.lastIndexOf("{", slugIdx);
  let depth = 0;
  let i = objStart;
  for (; i < text.length; i++) {
    if (text[i] === "{") depth++;
    if (text[i] === "}") {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    }
  }
  return { objStart, objEnd: i };
}

function formatImages(images) {
  return JSON.stringify(images, null, 4)
    .split("\n")
    .map((line, idx) => (idx === 0 ? line : "      " + line.trim()))
    .join("\n");
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Remove bad products
for (const slug of REMOVE) {
  const bounds = findObjectBounds(source, slug);
  if (!bounds) continue;
  let end = bounds.objEnd;
  if (source[end] === ",") end++;
  while (source[end] === "\n" || source[end] === "\r") end++;
  source = source.slice(0, bounds.objStart) + source.slice(end);
}

// Strip CJ boilerplate globally
source = source.replace(
  /\. Ships from US warehouse in 3–5 business days\. Popular pick with strong seller volume on CJ \([^)]+\)\./g,
  ".",
);
source = source.replace(/ Ships from US warehouse in 3–5 business days\./g, "");
source = source.replace(/ Ships from US warehouse in 3–5 days\./g, "");
source = source.replace(/\},\s*,\s*\{/g, "},\n  {");
source = source.replace(/\}\s*\n\s*\{/g, "},\n  {");

const slugs = [...source.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]);

for (const slug of slugs) {
  const bounds = findObjectBounds(source, slug);
  if (!bounds) continue;
  let block = source.slice(bounds.objStart, bounds.objEnd);
  const c = copy[slug];
  const d = dataUpdates[slug];

  if (c) {
    block = block.replace(/name: "[^"]*",/, `name: ${JSON.stringify(c.name)},`);
    block = block.replace(/description: "[^"]*",/, `description: ${JSON.stringify(c.description)},`);
    block = block.replace(
      /longDescription:\s*\n\s*"[^"]*",/,
      `longDescription:\n      ${JSON.stringify(c.longDescription)},`,
    );
    block = block.replace(/features: \[[^\]]*\],/, `features: ${JSON.stringify(c.features)},`);
  }

  if (d) {
    block = block.replace(/price: [\d.]+,/, `price: ${d.price.toFixed(2)},`);
    block = block.replace(/compareAtPrice: [\d.]+,/, `compareAtPrice: ${d.compareAtPrice.toFixed(2)},`);
    block = block.replace(/image: "[^"]+",/, `image: ${JSON.stringify(d.image)},`);
    block = block.replace(/images: \[[\s\S]*?\],/, `images: ${formatImages(d.images)},`);
    block = block.replace(/rating: [\d.]+,/, `rating: ${d.rating},`);
    block = block.replace(/reviews: \d+,/, `reviews: ${d.reviews},`);
    block = block.replace(/sold: \d+,/, `sold: ${d.sold},`);
    block = block.replace(/supplierSku: "[^"]*",/, `supplierSku: ${JSON.stringify(d.supplierSku)},`);
    block = block.replace(/cjVid: "[^"]*",/, `cjVid: ${JSON.stringify(d.cjVid)},`);
    block = block.replace(/cjSku: "[^"]*",/, `cjSku: ${JSON.stringify(d.cjSku)},`);
  }

  source = source.slice(0, bounds.objStart) + block + source.slice(bounds.objEnd);
}

source = source.replace(
  /\/\*\*[\s\S]*?\*\/\n\nexport const storeLabels/,
  `/**\n * Catalog — CJ-sourced products with verified variant IDs and US shipping.\n * Product copy reviewed for clear US English.\n */\n\nexport const storeLabels`,
);

writeFileSync(path, source);
const remaining = [...source.matchAll(/slug: "/g)].length;
console.log(`Applied copy to ${Object.keys(copy).length} products. Removed ${REMOVE.size} bad matches. Catalog: ${remaining} products.`);
