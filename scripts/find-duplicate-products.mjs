import { readFileSync } from "fs";
import { extractProductBlock } from "./lib/cj-catalog-lib.mjs";

const source = readFileSync("src/data/products.ts", "utf8");
const slugs = [...source.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]);

const products = [];
for (const slug of slugs) {
  const hit = extractProductBlock(source, slug);
  if (!hit) {
    console.warn("NO_BLOCK", slug);
    continue;
  }
  const b = hit.block;
  products.push({
    slug,
    id: b.match(/id: "([^"]+)"/)?.[1],
    name: b.match(/name: "([^"]+)"/)?.[1],
    store: b.match(/store: "([^"]+)"/)?.[1],
    cjVid: b.match(/cjVid: "([^"]+)"/)?.[1],
    cjSku: b.match(/cjSku: "([^"]+)"/)?.[1],
    image: b.match(/^\s+image: "([^"]+)"/m)?.[1],
    price: b.match(/^\s+price: ([0-9.]+)/m)?.[1],
    inStock: !/inStock: false/.test(b),
  });
}

function groupBy(keyFn) {
  const map = new Map();
  for (const p of products) {
    const k = keyFn(p);
    if (!k) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(p);
  }
  return [...map.entries()].filter(([, v]) => v.length >= 2);
}

console.log("TOTAL", products.length);

console.log("\n=== SLUG DUPLICADOS ===");
const slugDups = slugs.filter((s, i) => slugs.indexOf(s) !== i);
console.log(slugDups.length ? slugDups : "(nenhum)");

console.log("\n=== MESMO cjVid (mesmo produto CJ em 2 anúncios) ===");
for (const [vid, list] of groupBy((p) => p.cjVid)) {
  console.log(vid);
  list.forEach((p) => console.log(`  - ${p.slug} | ${p.name}`));
}

console.log("\n=== MESMO cjSku ===");
for (const [sku, list] of groupBy((p) => p.cjSku)) {
  console.log(sku);
  list.forEach((p) => console.log(`  - ${p.slug} | ${p.name}`));
}

console.log("\n=== NOME IDÊNTICO ===");
for (const [name, list] of groupBy((p) => p.name?.toLowerCase().trim())) {
  console.log(`"${list[0].name}"`);
  list.forEach((p) => console.log(`  - ${p.slug} (${p.store}) $${p.price}`));
}

console.log("\n=== MESMA FOTO + MESMA LOJA ===");
for (const [key, list] of groupBy((p) => `${p.store}::${p.image}`)) {
  console.log(`[${list[0].store}]`);
  list.forEach((p) => console.log(`  - ${p.slug} | ${p.name}`));
}

console.log("\n=== NOMES MUITO PARECIDOS (slug overlap) ===");
const seen = new Set();
for (let i = 0; i < products.length; i++) {
  for (let j = i + 1; j < products.length; j++) {
    const a = products[i];
    const b = products[j];
    const partsA = new Set(a.slug.split("-").filter((w) => w.length > 3));
    const partsB = new Set(b.slug.split("-").filter((w) => w.length > 3));
    let shared = 0;
    for (const w of partsA) if (partsB.has(w)) shared++;
    if (shared >= 2 && a.slug !== b.slug) {
      const key = [a.slug, b.slug].sort().join("|");
      if (!seen.has(key)) {
        seen.add(key);
        console.log(`  ${a.slug} <-> ${b.slug}`);
        console.log(`    ${a.name}`);
        console.log(`    ${b.name}`);
      }
    }
  }
}

const critical =
  slugDups.length ||
  groupBy((p) => p.cjVid).length ||
  groupBy((p) => p.cjSku).length;

if (critical) {
  console.error("\nFAILED — duplicate CJ IDs found. Run catalog:check before deploy.");
  process.exit(1);
}
