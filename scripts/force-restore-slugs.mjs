/**
 * Force-restore copy for slugs whose metadata got corrupted.
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { replaceProductBlock } from "./lib/cj-catalog-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const productsPath = resolve(__dirname, "../src/data/products.ts");
const copyPath = resolve(__dirname, "product-copy.json");

const copy = JSON.parse(readFileSync(copyPath, "utf8"));
const SLUGS = [
  "back-posture-trainer",
  "sd-card-reader-usb",
  "smartwatch-band-silicone",
  "cable-management-box",
  "vacuum-storage-bags",
  "essential-oil-diffuser",
];

let source = readFileSync(productsPath, "utf8");

for (const slug of SLUGS) {
  const c = copy[slug];
  if (!c) continue;
  source = replaceProductBlock(source, slug, (block) => {
    let b = block;
    b = b.replace(/name: "[^"]+"/, `name: ${JSON.stringify(c.name)}`);
    b = b.replace(/description: "[^"]+"/, `description: ${JSON.stringify(c.description)}`);
    b = b.replace(
      /longDescription:\s*\n\s*"[^"]*"/,
      `longDescription:\n      ${JSON.stringify(c.longDescription)}`,
    );
    b = b.replace(/features: \[[\s\S]*?\]/, `features: ${JSON.stringify(c.features)}`);
    return b;
  });
  console.log("Fixed copy:", slug);
}

writeFileSync(productsPath, source);
