/**
 * Pre-deploy catalog gate — run before every catalog commit/deploy.
 * Usage:
 *   node scripts/catalog-check.mjs           # fast (local only)
 *   node --env-file=.env.local scripts/catalog-check.mjs --cj   # + CJ price audit
 */
import { readFileSync } from "fs";
import { spawnSync } from "child_process";
import { extractProductBlock } from "./lib/cj-catalog-lib.mjs";

const withCj = process.argv.includes("--cj");
const productsSrc = readFileSync("src/data/products.ts", "utf8");
const variants = JSON.parse(readFileSync("src/data/product-variants.json", "utf8"));
const slugs = [...productsSrc.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]);

const errors = [];
const warnings = [];

for (const slug of slugs) {
  const hit = extractProductBlock(productsSrc, slug);
  if (!hit) {
    errors.push(`${slug}: product block not extractable (fix indent/braces)`);
    continue;
  }
  const name = hit.block.match(/name: "([^"]+)"/)?.[1];
  if (!name || name.length < 3) errors.push(`${slug}: missing/invalid name`);

  const entry = variants[slug];
  if (!entry?.variants?.length) {
    warnings.push(`${slug}: no variants in product-variants.json`);
  } else if (entry.variants.some((v) => !v.cjVid || !v.cjSku || !v.price)) {
    errors.push(`${slug}: variant missing cjVid, cjSku, or price`);
  }
}

const products = [];
for (const slug of slugs) {
  const hit = extractProductBlock(productsSrc, slug);
  if (!hit) continue;
  const b = hit.block;
  products.push({
    slug,
    name: b.match(/name: "([^"]+)"/)?.[1],
    cjVid: b.match(/cjVid: "([^"]+)"/)?.[1],
    cjSku: b.match(/cjSku: "([^"]+)"/)?.[1],
  });
}

function dupes(keyFn) {
  const map = new Map();
  for (const p of products) {
    const k = keyFn(p);
    if (!k) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(p);
  }
  return [...map.entries()].filter(([, list]) => list.length >= 2);
}

for (const [vid, list] of dupes((p) => p.cjVid)) {
  errors.push(`duplicate cjVid ${vid}: ${list.map((p) => p.slug).join(", ")}`);
}
for (const [sku, list] of dupes((p) => p.cjSku)) {
  errors.push(`duplicate cjSku ${sku}: ${list.map((p) => p.slug).join(", ")}`);
}

const slugDupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
if (slugDupes.length) errors.push(`duplicate slugs: ${slugDupes.join(", ")}`);

console.log(`\nCatalog check — ${products.length} products\n`);

if (warnings.length) {
  console.log(`WARNINGS (${warnings.length})`);
  warnings.slice(0, 10).forEach((w) => console.log("  ⚠", w));
  if (warnings.length > 10) console.log(`  ... +${warnings.length - 10} more`);
}

if (errors.length) {
  console.log(`\nFAILED (${errors.length})`);
  errors.forEach((e) => console.log("  ✗", e));
  process.exit(1);
}

console.log("✓ Blocks, variants, unique CJ IDs — OK");

if (withCj) {
  console.log("\nRunning CJ pricing audit (slow)...\n");
  const r = spawnSync(
    process.execPath,
    ["scripts/audit-variant-pricing.mjs"],
    { stdio: "inherit", env: process.env, cwd: process.cwd() },
  );
  if (r.status !== 0) process.exit(r.status ?? 1);
} else {
  console.log("  (skip CJ API — run: npm run catalog:check:cj)\n");
}

console.log("PASS — safe to commit/deploy catalog changes\n");
