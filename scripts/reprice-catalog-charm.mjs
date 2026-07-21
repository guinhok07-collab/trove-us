/**
 * Naturalize catalog prices: charm endings + varied compare-at discounts.
 * Uses current price as floor (never lowers retail). Updates products.ts + product-variants.json.
 *
 * Usage: node scripts/reprice-catalog-charm.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  charmCeil,
  compareAt,
  MAX_RETAIL,
  extractProductBlock,
  replaceProductBlock,
} from "./lib/cj-catalog-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const productsPath = resolve(root, "src/data/products.ts");
const variantsPath = resolve(root, "src/data/product-variants.json");

function endingOf(price) {
  return (Math.round(price * 100) % 100) / 100;
}

function summarize(prices) {
  const byEnd = {};
  const byOff = {};
  for (const { price, compare } of prices) {
    const e = endingOf(price).toFixed(2);
    byEnd[e] = (byEnd[e] || 0) + 1;
    if (compare > price) {
      const off = Math.round((1 - price / compare) * 100);
      byOff[off] = (byOff[off] || 0) + 1;
    }
  }
  return { byEnd, byOff, n: prices.length };
}

function printSummary(label, stats) {
  console.log(`\n${label} (n=${stats.n})`);
  console.log(
    "  endings:",
    Object.entries(stats.byEnd)
      .sort((a, b) => b[1] - a[1])
      .map(([e, n]) => `${n}×.${e.slice(2)}`)
      .join("  "),
  );
  console.log(
    "  discount%:",
    Object.entries(stats.byOff)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([o, n]) => `${n}×${o}%`)
      .join("  "),
  );
}

let source = readFileSync(productsPath, "utf8");
const slugs = [...source.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]);

const before = [];
const after = [];
let productChanges = 0;

for (const slug of slugs) {
  const hit = extractProductBlock(source, slug);
  if (!hit) continue;

  const priceMatch = hit.block.match(/price: ([0-9.]+)/);
  const compareMatch = hit.block.match(/compareAtPrice: ([0-9.]+)/);
  if (!priceMatch) continue;

  const oldPrice = Number(priceMatch[1]);
  const oldCompare = compareMatch ? Number(compareMatch[1]) : oldPrice;
  before.push({ price: oldPrice, compare: oldCompare });

  const newPrice = Math.min(charmCeil(oldPrice, slug, MAX_RETAIL), MAX_RETAIL);
  let newCompare = compareAt(newPrice, slug);
  if (newCompare <= newPrice) {
    newCompare = charmCeil(newPrice / (1 - 0.22), `${slug}:was-min`, 999.99);
  }

  after.push({ price: newPrice, compare: newCompare });

  if (newPrice === oldPrice && newCompare === oldCompare) continue;

  let block = hit.block;
  block = block.replace(/price: [0-9.]+/, `price: ${newPrice.toFixed(2)}`);
  if (compareMatch) {
    block = block.replace(
      /compareAtPrice: [0-9.]+/,
      `compareAtPrice: ${newCompare.toFixed(2)}`,
    );
  } else {
    block = block.replace(
      /(price: [0-9.]+,)/,
      `$1\n    compareAtPrice: ${newCompare.toFixed(2)},`,
    );
  }
  source = replaceProductBlock(source, slug, () => block);
  productChanges++;
  console.log(
    `${slug}: $${oldPrice.toFixed(2)}→$${newPrice.toFixed(2)}  was $${oldCompare.toFixed(2)}→$${newCompare.toFixed(2)}`,
  );
}

writeFileSync(productsPath, source);

const variantsJson = JSON.parse(readFileSync(variantsPath, "utf8"));
let variantChanges = 0;

for (const [slug, entry] of Object.entries(variantsJson)) {
  if (!entry?.variants?.length) continue;
  for (const v of entry.variants) {
    const oldPrice = Number(v.price);
    const oldCompare = Number(v.compareAtPrice || oldPrice);
    if (!oldPrice) continue;

    const seed = v.cjSku || v.id || `${slug}:${v.label}`;
    const newPrice = Math.min(charmCeil(oldPrice, seed, MAX_RETAIL), MAX_RETAIL);
    let newCompare = compareAt(newPrice, seed);
    if (newCompare <= newPrice) {
      newCompare = charmCeil(newPrice / (1 - 0.22), `${seed}:was-min`, 999.99);
    }

    if (newPrice === oldPrice && newCompare === oldCompare) continue;
    v.price = Number(newPrice.toFixed(2));
    v.compareAtPrice = Number(newCompare.toFixed(2));
    variantChanges++;
  }
}

writeFileSync(variantsPath, JSON.stringify(variantsJson, null, 2) + "\n");

printSummary("BEFORE products", summarize(before));
printSummary("AFTER products", summarize(after));
console.log(`\nUpdated ${productChanges} products, ${variantChanges} variants.`);
