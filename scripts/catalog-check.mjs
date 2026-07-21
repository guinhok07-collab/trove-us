/**
 * Pre-deploy catalog gate — run before every catalog commit/deploy.
 * Usage:
 *   node scripts/catalog-check.mjs           # fast (local only)
 *   node --env-file=.env.local scripts/catalog-check.mjs --cj   # + CJ price audit
 */
import { existsSync, readFileSync } from "fs";
import { spawnSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { extractProductBlock } from "./lib/cj-catalog-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const withCj = process.argv.includes("--cj");
const productsSrc = readFileSync(resolve(root, "src/data/products.ts"), "utf8");
const variants = JSON.parse(
  readFileSync(resolve(root, "src/data/product-variants.json"), "utf8"),
);
const slugs = [...productsSrc.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]);

const errors = [];
const warnings = [];

/** UI surfaces that must use CatalogImage (never bare next/image for products). */
const CATALOG_IMAGE_SURFACES = [
  "src/app/cart/page.tsx",
  "src/app/checkout/page.tsx",
  "src/app/order/success/page.tsx",
  "src/components/product-card.tsx",
  "src/components/product-gallery.tsx",
  "src/components/bundle-card.tsx",
  "src/components/promo-banner.tsx",
];

const fallbackPath = resolve(root, "public/product-image-fallback.svg");
if (!existsSync(fallbackPath)) {
  errors.push("missing public/product-image-fallback.svg — cart/product photos need a brand fallback");
}

for (const rel of CATALOG_IMAGE_SURFACES) {
  const full = resolve(root, rel);
  if (!existsSync(full)) {
    errors.push(`${rel}: file missing`);
    continue;
  }
  const src = readFileSync(full, "utf8");
  if (!src.includes("CatalogImage")) {
    errors.push(`${rel}: must use CatalogImage (never bare next/image for product photos)`);
  }
  if (/from ["']next\/image["']/.test(src) && !src.includes("catalog-image")) {
    errors.push(`${rel}: imports next/image directly — use CatalogImage instead`);
  }
}

for (const slug of slugs) {
  const hit = extractProductBlock(productsSrc, slug);
  if (!hit) {
    errors.push(`${slug}: product block not extractable (fix indent/braces)`);
    continue;
  }
  const name = hit.block.match(/name: "([^"]+)"/)?.[1];
  if (!name || name.length < 3) errors.push(`${slug}: missing/invalid name`);

  const image = hit.block.match(/image:\s*"(https:[^"]+)"/)?.[1];
  if (!image) {
    errors.push(`${slug}: missing primary image (https URL required)`);
  } else if (!/cjdropshipping\.com/i.test(image) && !image.includes("trove-us.com")) {
    warnings.push(`${slug}: primary image is not CJ CDN — verify it loads`);
  }

  const imagesMatch = hit.block.match(/images:\s*\[([\s\S]*?)\]/);
  const gallery = imagesMatch
    ? [...imagesMatch[1].matchAll(/"(https:[^"]+)"/g)].map((m) => m[1])
    : [];
  if (gallery.length < 1) {
    errors.push(`${slug}: images[] empty — need gallery alternates for cart fallback`);
  } else if (gallery.length < 3) {
    warnings.push(`${slug}: only ${gallery.length} gallery image(s) — prefer 4+`);
  }

  const entry = variants[slug];
  if (!entry?.variants?.length) {
    warnings.push(`${slug}: no variants in product-variants.json`);
  } else {
    let badLabel = false;
    let optionN = false;
    for (const v of entry.variants) {
      if (!v.cjVid || !v.cjSku || !v.price) {
        errors.push(`${slug}: variant missing cjVid, cjSku, or price`);
        break;
      }
      if (!v.image?.startsWith("https://")) {
        errors.push(`${slug}: variant "${v.label ?? v.id}" missing image URL`);
        break;
      }
      const label = String(v.label || "");
      if (/^(default|as picture|as shown)$/i.test(label.trim()) || /\.\s*$/.test(label)) {
        badLabel = true;
      }
      for (const key of Object.keys(v.optionValues || {})) {
        if (/^Option \d+$/i.test(key)) optionN = true;
      }
    }
    if (badLabel) {
      warnings.push(`${slug}: variant label needs cleanup (Default / As picture / trailing punctuation)`);
    }
    if (optionN) {
      warnings.push(`${slug}: has "Option N" groups — run: node scripts/normalize-variant-labels.mjs`);
    }
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
