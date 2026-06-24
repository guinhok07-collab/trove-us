/**
 * Restore Trove names/descriptions for placeholder products (copy only — no CJ relink).
 * Seeds: apply-balance-catalog TARGETS + product-copy.json
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { extractProductBlock } from "./lib/cj-catalog-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const productsPath = resolve(__dirname, "../src/data/products.ts");
const copyPath = resolve(__dirname, "product-copy.json");
const seedsPath = resolve(__dirname, "apply-balance-catalog.mjs");

const PLACEHOLDER = "Quality everyday essential — ships fast from our US warehouse.";
const copy = JSON.parse(readFileSync(copyPath, "utf8"));

const seedSource = readFileSync(seedsPath, "utf8");
const start = seedSource.indexOf("const TARGETS = [");
const end = seedSource.indexOf("];\n\nfunction retailPrice", start);
const TARGETS = Function(`return ${seedSource.slice(start + "const TARGETS = ".length, end + 1)}`)();
const seeds = Object.fromEntries(TARGETS.map((t) => [t.slug, t]));

let source = readFileSync(productsPath, "utf8");
let fixed = 0;

for (const hit of [...source.matchAll(/slug: "([^"]+)"/g)]) {
  const slug = hit[1];
  const blockHit = extractProductBlock(source, slug);
  if (!blockHit?.block.includes(PLACEHOLDER)) continue;

  const c = copy[slug] || seeds[slug];
  if (!c?.name) continue;

  let block = blockHit.block;
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
    source = source.slice(0, blockHit.start) + block + source.slice(blockHit.end);
    fixed++;
    console.log("COPY", slug, "→", c.name);
  }
}

writeFileSync(productsPath, source);
console.log(`Restored copy for ${fixed} placeholder products`);
