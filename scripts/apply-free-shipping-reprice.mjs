/**
 * Bake ~$4 US shipping into sub-$10 retail prices; checkout shows free shipping.
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { compareAt } from "./lib/cj-catalog-lib.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const file = resolve(root, "src/data/products.ts");

/** Old price → new delivered price (shipping included in tag). */
const REPRICE = new Map([
  [5.99, 9.99],
  [6.09, 9.99],
  [6.99, 10.99],
  [7.99, 11.99],
  [8.99, 12.99],
  [9.99, 12.99],
]);

function compareAtFromRetail(sell, seed = "") {
  return compareAt(sell, seed);
}

const lines = readFileSync(file, "utf8").split("\n");
let changed = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].replace(/\r$/, "");
  const priceMatch = line.match(/^(\s*)price: (\d+\.\d+),$/);
  if (!priceMatch) continue;

  const oldPrice = Number(priceMatch[2]);
  const newPrice = REPRICE.get(oldPrice);
  if (newPrice == null) continue;

  const indent = priceMatch[1];
  lines[i] = `${indent}price: ${newPrice.toFixed(2)},`;
  changed++;

  const next = lines[i + 1]?.replace(/\r$/, "");
  const compareMatch = next?.match(/^(\s*)compareAtPrice: (\d+\.\d+),$/);
  if (compareMatch) {
    lines[i + 1] = `${compareMatch[1]}compareAtPrice: ${compareAtFromRetail(newPrice).toFixed(2)},`;
  }
}

writeFileSync(file, lines.join("\n"), "utf8");
console.log(`Updated ${changed} product prices (free shipping baked in).`);

const variantsFile = resolve(root, "src/data/product-variants.json");
const variants = JSON.parse(readFileSync(variantsFile, "utf8"));
let variantChanges = 0;

for (const entry of Object.values(variants)) {
  if (!entry?.variants?.length) continue;
  for (const variant of entry.variants) {
    const newPrice = REPRICE.get(variant.price);
    if (newPrice == null) continue;
    variant.price = newPrice;
    variant.compareAtPrice = compareAtFromRetail(newPrice);
    variantChanges++;
  }
}

writeFileSync(variantsFile, `${JSON.stringify(variants, null, 2)}\n`, "utf8");
console.log(`Updated ${variantChanges} variant prices.`);
