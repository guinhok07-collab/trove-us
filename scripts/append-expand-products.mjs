/**
 * Append new products from cj-expand-results.json (not already in catalog).
 * Usage: node scripts/append-expand-products.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const expand = JSON.parse(readFileSync(resolve(__dirname, "cj-expand-results.json"), "utf8"));
const path = resolve(__dirname, "../src/data/products.ts");
let source = readFileSync(path, "utf8");

const META = {
  "hanging-closet-shelves": {
    id: "home-imp-1",
    store: "home",
    description: "Hanging shelves that add storage without floor space.",
    longDescription:
      "Stack sweaters, shoes, and accessories on breathable hanging shelves. Hooks onto any closet rod — no tools or drilling. Ships from our US warehouse in 3–5 business days.",
    tags: ["new"],
    features: ["Hanging design", "Breathable fabric", "No tools", "Closet rod hooks"],
  },
  "reusable-silicone-lids": {
    id: "home-imp-2",
    store: "home",
    description: "Stretch silicone lids that seal bowls and containers.",
    longDescription:
      "Cover leftovers and meal prep containers without hunting for matching lids. Flexible silicone stretches to fit round and square dishes. Dishwasher safe. Ships from our US warehouse in 3–5 business days.",
    tags: ["bestseller"],
    features: ["Stretch fit", "Multiple sizes", "Dishwasher safe", "Reusable"],
  },
  "portable-neck-fan": {
    id: "well-imp-1",
    store: "wellness",
    description: "Hands-free rechargeable fan for walks and workouts.",
    longDescription:
      "Stay cool on hot days with a lightweight neck fan that rests on your shoulders. Bladeless design is safe for kids and gym sessions. USB rechargeable. Ships from our US warehouse in 3–5 business days.",
    tags: ["new"],
    features: ["Hands-free", "Rechargeable", "Bladeless", "Lightweight"],
  },
};

function truncateName(name) {
  const clean = (name || "").trim();
  return clean.length <= 72 ? clean : clean.slice(0, 69) + "…";
}

function formatImages(images) {
  return JSON.stringify(images, null, 4)
    .split("\n")
    .map((line, idx) => (idx === 0 ? line : "      " + line.trim()))
    .join("\n");
}

function buildProduct(slug, cj, meta) {
  return `  {
    id: "${meta.id}",
    slug: "${slug}",
    name: ${JSON.stringify(truncateName(cj.name))},
    description: "${meta.description}",
    longDescription:
      "${meta.longDescription}",
    price: ${cj.price.toFixed(2)},
    compareAtPrice: ${cj.compareAtPrice.toFixed(2)},
    store: "${meta.store}",
    image: ${JSON.stringify(cj.image)},
    images: ${formatImages(cj.images)},
    rating: ${cj.rating},
    reviews: ${cj.reviews},
    sold: ${cj.sold},
    inStock: true,
    shippingDays: "3–5 days",
    warehouse: "US",
    tags: ${JSON.stringify(meta.tags)},
    features: ${JSON.stringify(meta.features)},
    supplierSku: ${JSON.stringify(cj.supplierSku)},
    cjVid: ${JSON.stringify(cj.cjVid)},
    cjSku: ${JSON.stringify(cj.cjSku)}
  }`;
}

const added = [];
for (const [slug, cj] of Object.entries(expand)) {
  if (!META[slug] || !cj?.cjVid || source.includes(`slug: "${slug}"`)) continue;
  const block = buildProduct(slug, cj, META[slug]);
  added.push({ store: META[slug].store, block });
}

if (!added.length) {
  console.log("Nothing new to append.");
  process.exit(0);
}

const byStore = {
  home: added.filter((a) => a.store === "home").map((a) => a.block),
  wellness: added.filter((a) => a.store === "wellness").map((a) => a.block),
};

if (byStore.home.length) {
  source = source.replace(
    /(\n  \{\n    id: "home-)/,
    `,\n${byStore.home.join(",\n")}$1`,
  );
}
if (byStore.wellness.length) {
  source = source.replace(
    /\/\/ ─── WELLNESS HUB/,
    `// ─── WELLNESS HUB\n${byStore.wellness.join(",\n")},`,
  );
}

writeFileSync(path, source);
console.log("Added:", added.map((a) => a.block.match(/slug: "([^"]+)"/)[1]).join(", "));
