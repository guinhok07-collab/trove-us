/**
 * Audit product images for lifestyle / usage coverage.
 * Run: node scripts/audit-product-images.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const productsPath = join(root, "src/data/products.ts");
const hintsPath = join(root, "src/data/product-gallery-hints.ts");

const source = readFileSync(productsPath, "utf8");
const hintsSource = readFileSync(hintsPath, "utf8");

const hintedSlugs = new Set(
  [...hintsSource.matchAll(/"([a-z0-9-]+)":\s*\d+/g)].map((m) => m[1]),
);

const slugMatches = [...source.matchAll(/slug: "([^"]+)"/g)];
const rows = [];

for (const [, slug] of slugMatches) {
  const slugIndex = source.indexOf(`slug: "${slug}"`);
  const chunk = source.slice(slugIndex, slugIndex + 4000);
  const imagesBlock = chunk.match(/images:\s*\[([\s\S]*?)\]\s*,/);
  const urls = imagesBlock
    ? [...imagesBlock[1].matchAll(/https?:\/\/[^"\s]+/g)].map((m) => m[0])
    : [];
  const unique = [...new Set(urls)];
  const hasHint = hintedSlugs.has(slug);

  let status = "ok";
  if (unique.length < 2) status = "needs_more_photos";
  else if (!hasHint) status = "review_lifestyle";

  rows.push({
    slug,
    imageCount: unique.length,
    hasLifestyleHint: hasHint,
    status,
  });
}

const needsAttention = rows.filter((r) => r.status !== "ok");

console.log(`\nProduct image audit — ${rows.length} products\n`);
console.log(`OK (lifestyle hint set): ${rows.filter((r) => r.hasLifestyleHint).length}`);
console.log(`Review lifestyle hint: ${rows.filter((r) => r.status === "review_lifestyle").length}`);
console.log(`Needs more photos (<2): ${rows.filter((r) => r.status === "needs_more_photos").length}`);

if (needsAttention.length) {
  console.log("\n--- Needs attention (first 25) ---");
  for (const row of needsAttention.slice(0, 25)) {
    console.log(`  ${row.slug} — ${row.imageCount} images — ${row.status}`);
  }
}

const reportPath = join(root, "src/data/product-image-audit.json");
writeFileSync(
  reportPath,
  JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2),
);
console.log(`\nFull report: ${reportPath}\n`);
