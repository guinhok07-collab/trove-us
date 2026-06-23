/**
 * Find duplicate slugs, CJ VIDs, SKUs, names, and images in products.ts
 * Usage: node scripts/check-duplicates.mjs
 */
import { readFileSync } from "fs";

const src = readFileSync("src/data/products.ts", "utf8");
const blocks = src.split(/(?=\n  \{\n    id:)/).slice(1);

const bySlug = new Map();
const byCjVid = new Map();
const byCjSku = new Map();
const byName = new Map();
const byImage = new Map();
const products = [];

for (const b of blocks) {
  const slug = b.match(/slug: "([^"]+)"/)?.[1];
  const name = b.match(/name: "([^"]+)"/)?.[1];
  const cjVid = b.match(/cjVid: "([^"]+)"/)?.[1];
  const cjSku = b.match(/cjSku: "([^"]+)"/)?.[1];
  const image = b.match(/^\s+image: "([^"]+)"/m)?.[1];
  const store = b.match(/store: "([^"]+)"/)?.[1];
  const price = b.match(/^\s+price: ([0-9.]+)/m)?.[1];
  const id = b.match(/id: "([^"]+)"/)?.[1];
  const hidden = /catalogHidden:\s*true/.test(b);
  if (!slug) continue;

  products.push({ slug, name, cjVid, cjSku, image, store, price, id, hidden });

  for (const [map, key] of [
    [bySlug, slug],
    [byCjVid, cjVid],
    [byCjSku, cjSku],
  ]) {
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(slug);
  }

  const normName = (name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (normName) {
    if (!byName.has(normName)) byName.set(normName, []);
    byName.get(normName).push(slug);
  }
  if (image) {
    if (!byImage.has(image)) byImage.set(image, []);
    byImage.get(image).push(slug);
  }
}

function dups(map) {
  return [...map.entries()].filter(([, v]) => v.length >= 2);
}

// Similar names: same first 5 words
const byNamePrefix = new Map();
for (const p of products) {
  const prefix = (p.name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .join(" ");
  if (!byNamePrefix.has(prefix)) byNamePrefix.set(prefix, []);
  byNamePrefix.get(prefix).push(p.slug);
}

console.log("TOTAL", products.length);
console.log("VISIBLE", products.filter((p) => !p.hidden).length);

console.log("\n=== DUPLICATE SLUGS ===");
const slugDups = dups(bySlug);
if (!slugDups.length) console.log("(none)");
else slugDups.forEach(([k, v]) => console.log(k, "->", v.join(", ")));

console.log("\n=== DUPLICATE cjVid (same CJ product shipped twice) ===");
const vidDups = dups(byCjVid);
if (!vidDups.length) console.log("(none)");
else
  vidDups.forEach(([k, v]) => {
    const info = v.map((s) => {
      const p = products.find((x) => x.slug === s);
      return `${s} (${p?.name?.slice(0, 40)})`;
    });
    console.log(k, "->", info.join(" | "));
  });

console.log("\n=== DUPLICATE cjSku ===");
const skuDups = dups(byCjSku);
if (!skuDups.length) console.log("(none)");
else skuDups.forEach(([k, v]) => console.log(k, "->", v.join(", ")));

console.log("\n=== DUPLICATE exact name ===");
const nameDups = dups(byName);
if (!nameDups.length) console.log("(none)");
else nameDups.forEach(([k, v]) => console.log(`"${k}" ->`, v.join(", ")));

console.log("\n=== DUPLICATE hero image ===");
const imageDups = dups(byImage);
if (!imageDups.length) console.log("(none)");
else
  imageDups.forEach(([k, v]) => {
    console.log(v.join(" <-> "));
    console.log("  ", k.slice(0, 80));
  });

console.log("\n=== SIMILAR names (first 5 words match) ===");
const prefixDups = dups(byNamePrefix).filter(([, v]) => {
  const names = v.map((s) => products.find((p) => p.slug === s)?.name);
  return new Set(names).size > 1 || v.length > 1;
});
const realPrefixDups = [...byNamePrefix.entries()].filter(([, v]) => v.length >= 2);
if (!realPrefixDups.length) console.log("(none)");
else
  realPrefixDups.forEach(([k, v]) => {
    if (v.length < 2) return;
    const uniqueNames = new Set(v.map((s) => products.find((p) => p.slug === s)?.name));
    if (uniqueNames.size === 1 && v.length > 1) {
      console.log(`[SAME NAME] "${k}..." ->`, v.join(", "));
    } else if (v.length >= 2) {
      const lines = v.map((s) => {
        const p = products.find((x) => x.slug === s);
        return `  - ${s}: ${p?.name}`;
      });
      if (uniqueNames.size < v.length || k.length > 10) {
        console.log(`[SIMILAR] "${k}..."`);
        lines.forEach((l) => console.log(l));
      }
    }
  });

// Same image + same store = likely duplicate listing
console.log("\n=== SAME IMAGE + SAME STORE (likely duplicate) ===");
const imgStore = new Map();
for (const p of products) {
  if (!p.image || !p.store) continue;
  const k = `${p.store}::${p.image}`;
  if (!imgStore.has(k)) imgStore.set(k, []);
  imgStore.get(k).push(p.slug);
}
const imgStoreDups = dups(imgStore);
if (!imgStoreDups.length) console.log("(none)");
else
  imgStoreDups.forEach(([k, v]) => {
    const [store] = k.split("::");
    console.log(`[${store}]`, v.join(" <-> "));
  });
