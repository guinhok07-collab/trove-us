/**
 * Align products.ts listing fields with default variant from product-variants.json.
 * Usage: node scripts/sync-default-variant-to-products.mjs [--write]
 */
import { readFileSync, writeFileSync } from "fs";
import { extractProductBlock, formatImages, replaceProductBlock } from "./lib/cj-catalog-lib.mjs";

const write = process.argv.includes("--write");
const productsPath = "src/data/products.ts";
const variantsPath = "src/data/product-variants.json";

let source = readFileSync(productsPath, "utf8");
const variants = JSON.parse(readFileSync(variantsPath, "utf8"));
const slugs = [...source.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]);

const fixes = [];

for (const slug of slugs) {
  const entry = variants[slug];
  if (!entry?.variants?.length) continue;

  const defaultV =
    entry.variants.find((v) => v.id === entry.defaultVariantId) ?? entry.variants[0];

  const hit = extractProductBlock(source, slug);
  if (!hit) continue;
  const b = hit.block;

  const price = Number(b.match(/^\s+price: ([0-9.]+)/m)?.[1]);
  const cjVid = b.match(/cjVid: "([^"]+)"/)?.[1];
  const compareAt = Number(b.match(/compareAtPrice: ([0-9.]+)/)?.[1]);

  const priceDiff = Math.abs(price - defaultV.price) > 0.02;
  const vidDiff = cjVid !== defaultV.cjVid;
  const compareDiff =
    defaultV.compareAtPrice &&
    Math.abs(compareAt - defaultV.compareAtPrice) > 0.02;

  if (!priceDiff && !vidDiff && !compareDiff) continue;

  fixes.push({
    slug,
    from: { price, cjVid },
    to: { price: defaultV.price, cjVid: defaultV.cjVid, label: defaultV.label },
  });

  if (!write) continue;

  source = replaceProductBlock(source, slug, (block) => {
    let next = block;
    next = next.replace(/cjVid: "[^"]+"/, `cjVid: ${JSON.stringify(defaultV.cjVid)}`);
    next = next.replace(/cjSku: "[^"]+"/, `cjSku: ${JSON.stringify(defaultV.cjSku)}`);
    next = next.replace(/price: [\d.]+/, `price: ${defaultV.price.toFixed(2)}`);
    if (defaultV.compareAtPrice) {
      next = next.replace(
        /compareAtPrice: [\d.]+/,
        `compareAtPrice: ${defaultV.compareAtPrice.toFixed(2)}`,
      );
    }
    if (defaultV.image) {
      next = next.replace(/image: "[^"]+"/, `image: ${JSON.stringify(defaultV.image)}`);
    }
    if (defaultV.images?.length) {
      next = next.replace(/images: \[[\s\S]*?\]/, `images: ${formatImages(defaultV.images)}`);
    }
    return next;
  });
}

console.log(`\nDefault variant sync — ${fixes.length} product(s) need update\n`);
fixes.forEach((f) => {
  console.log(
    `  ${f.slug}: $${f.from.price} → $${f.to.price} (${f.to.label}), cjVid ${f.from.cjVid === f.to.cjVid ? "OK" : "fixed"}`,
  );
});

if (fixes.length && !write) {
  console.log("\nDry run — pass --write to apply\n");
  process.exit(1);
}

if (write && fixes.length) {
  writeFileSync(productsPath, source);
  console.log(`\nWrote ${fixes.length} fix(es) to products.ts\n`);
} else if (!fixes.length) {
  console.log("All products already aligned.\n");
}
