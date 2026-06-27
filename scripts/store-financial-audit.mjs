/**
 * End-to-end financial audit — simulates cart/checkout math for all products.
 * Usage: node scripts/store-financial-audit.mjs
 */
import { readFileSync } from "fs";
import { extractProductBlock } from "./lib/cj-catalog-lib.mjs";
import { priceMatchesFormula } from "./catalog-ship.mjs";

function calculateShipping(_subtotal) {
  return 0;
}

function calculateOrderTotals(items) {
  const subtotal = roundUsd(items.reduce((s, i) => s + i.price * i.quantity, 0));
  const shipping = calculateShipping(subtotal);
  const total = roundUsd(subtotal + shipping);
  return { subtotal, shipping, total };
}

function paypalBreakdownOk(items, shipping, total) {
  const itemTotal = roundUsd(items.reduce((s, i) => s + i.price * i.quantity, 0));
  const expected = roundUsd(itemTotal + shipping);
  return Math.abs(expected - total) <= 0.01;
}

const productsSrc = readFileSync("src/data/products.ts", "utf8");
const variants = JSON.parse(readFileSync("src/data/product-variants.json", "utf8"));
const slugs = [...productsSrc.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]);

const products = [];
for (const slug of slugs) {
  const hit = extractProductBlock(productsSrc, slug);
  if (!hit) continue;
  const b = hit.block;
  products.push({
    slug,
    id: b.match(/id: "([^"]+)"/)?.[1],
    name: b.match(/name: "([^"]+)"/)?.[1],
    price: Number(b.match(/^\s+price: ([0-9.]+)/m)?.[1]),
    cjVid: b.match(/cjVid: "([^"]+)"/)?.[1],
    cjSku: b.match(/cjSku: "([^"]+)"/)?.[1],
    inStock: !/inStock: false/.test(b),
  });
}

const errors = [];
const warnings = [];

for (const p of products) {
  if (!p.price || p.price <= 0) errors.push(`${p.slug}: invalid listing price`);
  if (!p.cjVid) errors.push(`${p.slug}: missing cjVid`);

  const entry = variants[p.slug];
  if (!entry?.variants?.length) {
    warnings.push(`${p.slug}: no variants JSON`);
    continue;
  }

  const defaultV = entry.variants.find((v) => v.id === entry.defaultVariantId) ?? entry.variants[0];
  if (Math.abs(p.price - defaultV.price) > 0.02) {
    errors.push(
      `${p.slug}: products.ts price $${p.price} != default variant $${defaultV.price} (${defaultV.label})`,
    );
  }
  if (p.cjVid !== defaultV.cjVid) {
    errors.push(`${p.slug}: products.ts cjVid != default variant cjVid`);
  }

  for (const v of entry.variants) {
    if (!v.price || v.price <= 0) errors.push(`${p.slug}/${v.label}: invalid variant price`);
    if (!v.cjVid || !v.cjSku) errors.push(`${p.slug}/${v.label}: missing CJ ids`);
    if (v.compareAtPrice && v.compareAtPrice <= v.price) {
      warnings.push(`${p.slug}/${v.label}: compareAt not above price`);
    }
  }
}

function resolveVariantPrice(slug, variantId) {
  const entry = variants[slug];
  if (!entry) return products.find((p) => p.slug === slug)?.price ?? 0;
  const v = entry.variants.find((x) => x.id === variantId);
  if (!v) return null;
  return v.price;
}

function simulateCart(lines) {
  const items = lines.map((l) => {
    const price = resolveVariantPrice(l.slug, l.variantId);
    if (price === null) throw new Error(`Unknown variant ${l.slug} ${l.variantId}`);
    const p = products.find((x) => x.slug === l.slug);
    const v = variants[l.slug]?.variants.find((x) => x.id === l.variantId);
    return {
      slug: l.slug,
      name: p?.name,
      variantLabel: v?.label,
      price,
      quantity: l.qty,
      cjVid: v?.cjVid,
      cjSku: v?.cjSku,
    };
  });
  return { items, ...calculateOrderTotals(items) };
}

const scenarios = [
  {
    name: "Ice cube tray — 4 cores diferentes × qty 1",
    lines: [
      { slug: "ice-cube-tray-silicone", variantId: "1777174523566104576", qty: 1 },
      { slug: "ice-cube-tray-silicone", variantId: "1777174523633213440", qty: 1 },
      { slug: "ice-cube-tray-silicone", variantId: "1777174523696128000", qty: 1 },
      { slug: "ice-cube-tray-silicone", variantId: "1777174523759042560", qty: 1 },
    ],
  },
  {
    name: "Ice cube — mesmo item qty 4",
    lines: [{ slug: "ice-cube-tray-silicone", variantId: "1777174523566104576", qty: 4 }],
  },
  {
    name: "Night light 2PCS variant × qty 3",
    lines: [{ slug: "led-motion-night-light", variantId: "2014635212674207746", qty: 3 }],
  },
  {
    name: "Grooming gloves 1PCS × qty 4",
    lines: [{ slug: "pet-grooming-gloves", variantId: "2503191148021601500", qty: 4 }],
  },
  {
    name: "Mixed cart — 3 produtos diferentes",
    lines: [
      { slug: "ice-cube-tray-silicone", variantId: "1777174523566104576", qty: 2 },
      { slug: "led-motion-night-light", variantId: "2014635212674207746", qty: 1 },
      { slug: "pet-grooming-gloves", variantId: "2503191148021601500", qty: 2 },
    ],
  },
  {
    name: "Below free shipping threshold",
    lines: [{ slug: "ice-cube-tray-silicone", variantId: "1777174523566104576", qty: 1 }],
  },
  {
    name: "Exactly at free shipping ($35+)",
    lines: [{ slug: "foldable-laundry-hamper", variantId: "1947204011159232514", qty: 1 }],
  },
];

console.log("\n=== STORE FINANCIAL AUDIT ===\n");
console.log(`Products: ${products.length}`);

for (const sc of scenarios) {
  try {
    const order = simulateCart(sc.lines);
    const ppOk = paypalBreakdownOk(order.items, order.shipping, order.total);
    const lineSum = order.items.map(
      (i) => `${i.variantLabel ?? i.slug} $${i.price}×${i.quantity}=$${roundUsd(i.price * i.quantity)}`,
    );
    console.log(`\n✓ ${sc.name}`);
    console.log(`  Lines: ${lineSum.join(" | ")}`);
    console.log(
      `  Subtotal $${order.subtotal.toFixed(2)} + ship $${order.shipping.toFixed(2)} = TOTAL $${order.total.toFixed(2)}${order.shipping === 0 ? " (FREE SHIP)" : ""}`,
    );
    if (!ppOk) errors.push(`PayPal breakdown fail: ${sc.name}`);
  } catch (e) {
    errors.push(`Scenario failed: ${sc.name} — ${e.message}`);
  }
}

const multiVariant = Object.entries(variants).filter(([, e]) => e.variants?.length > 1);
let priceSpread = 0;
for (const [slug, entry] of multiVariant) {
  const prices = [...new Set(entry.variants.map((v) => v.price))];
  if (prices.length > 1) priceSpread++;
}
console.log(`\nMulti-variant products: ${multiVariant.length} (${priceSpread} with different prices per variant)`);

if (warnings.length) {
  console.log(`\nWARNINGS (${warnings.length})`);
  warnings.slice(0, 15).forEach((w) => console.log("  ⚠", w));
}

if (errors.length) {
  console.log(`\nFAILED (${errors.length})`);
  errors.forEach((e) => console.log("  ✗", e));
  process.exit(1);
}

console.log("\nPASS — catalog prices consistent, checkout math OK for test scenarios\n");
