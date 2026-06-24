/**
 * Remove product slugs from catalog (products.ts + product-variants.json).
 * Usage: node scripts/remove-catalog-slugs.mjs slug1 slug2 ...
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { extractProductBlock } from "./lib/cj-catalog-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const slugs = process.argv.slice(2);
if (!slugs.length) {
  console.error("Usage: remove-catalog-slugs.mjs <slug>...");
  process.exit(1);
}

const productsPath = resolve(__dirname, "../src/data/products.ts");
const variantsPath = resolve(__dirname, "../src/data/product-variants.json");

let source = readFileSync(productsPath, "utf8");
const variants = JSON.parse(readFileSync(variantsPath, "utf8"));

for (const slug of slugs) {
  const hit = extractProductBlock(source, slug);
  if (!hit) {
    console.log("MISSING", slug);
    continue;
  }
  const blockEnd = hit.end + "\n  }".length;
  let removeStart = hit.start;
  let removeEnd = blockEnd;
  if (source[removeEnd] === ",") removeEnd++;
  if (removeStart > 0 && source[removeStart - 1] === ",") {
    removeStart--;
  }
  source = source.slice(0, removeStart) + source.slice(removeEnd);
  delete variants[slug];
  console.log("REMOVED", slug);
}

writeFileSync(productsPath, source);
writeFileSync(variantsPath, JSON.stringify(variants, null, 2));
console.log("Total slugs:", [...source.matchAll(/slug: "/g)].length);
