/**
 * Audit catalog media + variants for admin warnings.
 * Usage: node --env-file=.env.local scripts/audit-catalog-media.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { auditMedia, MIN_IMAGES } from "./lib/cj-catalog-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const productsPath = resolve(__dirname, "../src/data/products.ts");
const variantsPath = resolve(__dirname, "../src/data/product-variants.json");
const outPath = resolve(__dirname, "../src/data/catalog-media-audit.json");

const source = readFileSync(productsPath, "utf8");
let variantCatalog = {};
try {
  variantCatalog = JSON.parse(readFileSync(variantsPath, "utf8"));
} catch {
  variantCatalog = {};
}

const slugs = [...source.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]);
const issues = [];
let ok = 0;

for (const slug of slugs) {
  const idx = source.indexOf(`slug: "${slug}"`);
  const blockStart = source.lastIndexOf("\n  {", idx);
  const blockEnd = source.indexOf("\n  }", idx);
  const block = source.slice(blockStart, blockEnd);

  const name = block.match(/name: "([^"]+)"/)?.[1] || slug;
  const imageCount = (block.match(/https:\/\//g) || []).length;
  const hasVideo = /video: "http/.test(block);
  const variantEntry = variantCatalog[slug];
  const variantCount = variantEntry?.variants?.length ?? 0;

  const imagesMatch = block.match(/images: \[([\s\S]*?)\]/);
  const images = imagesMatch
    ? [...imagesMatch[1].matchAll(/"(https:[^"]+)"/g)].map((m) => m[1])
    : [];

  const result = auditMedia({
    slug,
    images,
    video: hasVideo ? "http" : undefined,
    variantCount,
    cjName: name,
  });

  if (result) {
    issues.push({ ...result, name, imageCount: images.length, variantCount });
  } else {
    ok++;
  }
}

const summary = {
  auditedAt: new Date().toISOString(),
  total: slugs.length,
  ok,
  issueCount: issues.length,
  errors: issues.filter((i) => i.level === "error").length,
  warnings: issues.filter((i) => i.level === "warn").length,
  minImages: MIN_IMAGES,
};

writeFileSync(outPath, JSON.stringify({ summary, issues }, null, 2));

console.log("AUDIT", summary);
for (const item of issues.slice(0, 20)) {
  console.log(item.level.toUpperCase(), item.slug, "—", item.messages.join("; "));
}
if (issues.length > 20) console.log(`... +${issues.length - 20} more`);
