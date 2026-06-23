/**
 * Restore product name/description/features from product-copy.json
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { extractProductBlock } from "./lib/cj-catalog-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const productsPath = resolve(__dirname, "../src/data/products.ts");
const copyPath = resolve(__dirname, "product-copy.json");

const copy = JSON.parse(readFileSync(copyPath, "utf8"));
let source = readFileSync(productsPath, "utf8");
let fixed = 0;

for (const [slug, c] of Object.entries(copy)) {
  const hit = extractProductBlock(source, slug);
  if (!hit) continue;

  let block = hit.block;
  const before = block;
  block = block.replace(/name: "[^"]+"/, `name: ${JSON.stringify(c.name)}`);
  block = block.replace(/description: "[^"]+"/, `description: ${JSON.stringify(c.description)}`);
  block = block.replace(
    /longDescription:\s*\n\s*"[^"]*"/,
    `longDescription:\n      ${JSON.stringify(c.longDescription)}`,
  );
  if (c.features?.length) {
    block = block.replace(/features: \[[\s\S]*?\]/, `features: ${JSON.stringify(c.features)}`);
  }

  if (block !== before) {
    source = source.slice(0, hit.start) + block + source.slice(hit.end);
    fixed++;
  }
}

writeFileSync(productsPath, source);
console.log(`Restored copy for ${fixed} products`);
