/**
 * Normalize shopper-facing variant labels + option groups across the catalog.
 * - Title-case / alias cleanup
 * - Drop singleton dimensions (e.g. "Scratch Resistant" on every SKU)
 * - Never leave "Option N" group names
 *
 * Usage: node scripts/normalize-variant-labels.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { enrichVariantCatalog } from "./lib/variant-label.mjs";
import { extractProductBlock } from "./lib/cj-catalog-lib.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const variantsPath = resolve(root, "src/data/product-variants.json");
const productsPath = resolve(root, "src/data/products.ts");

const productsSrc = readFileSync(productsPath, "utf8");
const catalog = JSON.parse(readFileSync(variantsPath, "utf8"));

let productsTouched = 0;
let variantsTouched = 0;
let optionNBefore = 0;
let optionNAfter = 0;

function hasOptionN(entry) {
  return (entry.variants || []).some((v) =>
    Object.keys(v.optionValues || {}).some((k) => /^Option \d+$/i.test(k)),
  );
}

for (const [slug, entry] of Object.entries(catalog)) {
  if (!entry?.variants?.length) continue;
  if (hasOptionN(entry)) optionNBefore++;

  const hit = extractProductBlock(productsSrc, slug);
  const productName = hit?.block.match(/name: "([^"]+)"/)?.[1] || slug;

  const before = JSON.stringify(entry.variants);
  entry.variants = enrichVariantCatalog(entry.variants, productName);
  const after = JSON.stringify(entry.variants);

  if (before !== after) {
    productsTouched++;
    variantsTouched += entry.variants.length;
  }
  if (hasOptionN(entry)) optionNAfter++;
}

writeFileSync(variantsPath, JSON.stringify(catalog, null, 2) + "\n");

console.log(`Normalized ${productsTouched} products (${variantsTouched} variants).`);
console.log(`Products with "Option N": ${optionNBefore} → ${optionNAfter}`);

const sample = catalog["cat-scratching-mat"];
if (sample) {
  console.log("\ncat-scratching-mat sample:");
  for (const v of sample.variants.slice(0, 5)) {
    console.log(`  ${v.label} | ov=${JSON.stringify(v.optionValues || null)}`);
  }
  console.log(`  … ${sample.variants.length} total`);
}
