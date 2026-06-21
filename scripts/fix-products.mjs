/** Fix syntax + recompute social proof for every product in products.ts */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { naturalSocialProof } from "./social-proof.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sync = JSON.parse(readFileSync(resolve(__dirname, "cj-catalog-sync.json"), "utf8"));
const expand = JSON.parse(readFileSync(resolve(__dirname, "cj-expand-results.json"), "utf8"));
const listedBySlug = {};
for (const [slug, d] of Object.entries({ ...sync, ...expand })) {
  if (d?.listedNum != null) listedBySlug[slug] = d.listedNum;
}

const path = resolve(__dirname, "../src/data/products.ts");
let source = readFileSync(path, "utf8");

source = source.replace(/\},\s*,\s*\{/g, "},\n  {");
source = source.replace(/\}\s*\n\s*\{/g, "},\n  {");
source = source.replace(/,\s*,/g, ",");

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

const slugs = [...source.matchAll(/slug: "([^"]+)"/g)].map((x) => x[1]);

for (const slug of [...slugs].reverse()) {
  const bounds = findObjectBounds(source, slug);
  if (!bounds) continue;
  const social = naturalSocialProof(slug, listedBySlug[slug] ?? 0);
  let block = source.slice(bounds.objStart, bounds.objEnd);
  block = block.replace(/rating: [\d.]+,/, `rating: ${social.rating},`);
  block = block.replace(/reviews: \d+,/, `reviews: ${social.reviews},`);
  block = block.replace(/sold: \d+,/, `sold: ${social.sold},`);
  source = source.slice(0, bounds.objStart) + block + source.slice(bounds.objEnd);
}

writeFileSync(path, source);
console.log("OK —", slugs.length, "products");
