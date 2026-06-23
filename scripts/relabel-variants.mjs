/**
 * Re-label variants in product-variants.json from stored variantKey (no CJ API).
 * Usage: node scripts/relabel-variants.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  enrichVariantCatalog,
  formatVariantKey,
  variantLabel,
} from "./lib/variant-label.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const variantsPath = resolve(__dirname, "../src/data/product-variants.json");
const catalog = JSON.parse(readFileSync(variantsPath, "utf8"));

let fixed = 0;

for (const [slug, entry] of Object.entries(catalog)) {
  const raw = entry.variants.map((v) => {
    const key = v.variantKey || "";
    let label = v.label;
    if (key && (label === "Default" || /^CJ[A-Z0-9]/i.test(label))) {
      label = formatVariantKey(key);
      fixed++;
    } else if (key && label.includes(" · ") === false && key.includes("-")) {
      label = formatVariantKey(key);
    }
    return { ...v, label, variantKey: key || v.variantKey };
  });
  entry.variants = enrichVariantCatalog(raw, "");
}

writeFileSync(variantsPath, JSON.stringify(catalog, null, 2));
console.log("Relabeled entries:", fixed, "products:", Object.keys(catalog).length);
