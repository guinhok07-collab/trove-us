/**
 * Merge cj-bulk-catalog.json into src/data/products.ts
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const bulk = JSON.parse(readFileSync(resolve(__dirname, "cj-bulk-catalog.json"), "utf8"));
const path = resolve(__dirname, "../src/data/products.ts");
let source = readFileSync(path, "utf8");

const existingSlugs = new Set([...source.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]));

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

function nextId(store) {
  const prefix = store === "wellness" ? "well" : store === "tech" ? "tech" : store;
  const nums = [...source.matchAll(new RegExp(`id: "${prefix}-(\\d+)"`, "g"))].map((m) => Number(m[1]));
  const max = nums.length ? Math.max(...nums) : 0;
  return `${prefix}-${max + 1}`;
}

function buildBlock(entry) {
  const id = nextId(entry.store);
  source.match(new RegExp(`id: "${id}"`)); // bump counter by mutating via nextId reading source each time - fix below
  return `  {
    id: "${id}",
    slug: "${entry.slug}",
    name: ${JSON.stringify(truncateName(entry.name))},
    description: ${JSON.stringify(entry.description)},
    longDescription:
      ${JSON.stringify(entry.longDescription)},
    price: ${entry.price.toFixed(2)},
    compareAtPrice: ${entry.compareAtPrice.toFixed(2)},
    store: "${entry.store}",
    image: ${JSON.stringify(entry.image)},
    images: ${formatImages(entry.images)},
    rating: ${entry.rating},
    reviews: ${entry.reviews},
    sold: ${entry.sold},
    inStock: true,
    shippingDays: "3–5 days",
    warehouse: "US",
    tags: ${JSON.stringify(entry.tags || [])},
    features: ${JSON.stringify(entry.features || [])},
    supplierSku: ${JSON.stringify(entry.supplierSku)},
    cjVid: ${JSON.stringify(entry.cjVid)},
    cjSku: ${JSON.stringify(entry.cjSku)}
  }`;
}

const byStore = { pet: [], home: [], wellness: [], tech: [] };
for (const entry of Object.values(bulk)) {
  if (!entry?.cjVid || existingSlugs.has(entry.slug)) continue;
  byStore[entry.store]?.push(entry);
}

const idCounters = { pet: 0, home: 0, wellness: 0, tech: 0 };
function assignId(store) {
  const prefix = store === "wellness" ? "well" : store === "tech" ? "tech" : store;
  const nums = [...source.matchAll(new RegExp(`id: "${prefix}-(\\d+)"`, "g"))].map((m) => Number(m[1]));
  idCounters[store] = (idCounters[store] || 0) + 1;
  const base = nums.length ? Math.max(...nums) : 0;
  return `${prefix}-${base + idCounters[store]}`;
}

function buildBlockFixed(entry) {
  const prefix = entry.store === "wellness" ? "well" : entry.store === "tech" ? "tech" : entry.store;
  const id = assignId(entry.store);
  return `  {
    id: "${id}",
    slug: "${entry.slug}",
    name: ${JSON.stringify(truncateName(entry.name))},
    description: ${JSON.stringify(entry.description)},
    longDescription:
      ${JSON.stringify(entry.longDescription)},
    price: ${entry.price.toFixed(2)},
    compareAtPrice: ${entry.compareAtPrice.toFixed(2)},
    store: "${entry.store}",
    image: ${JSON.stringify(entry.image)},
    images: ${formatImages(entry.images)},
    rating: ${entry.rating},
    reviews: ${entry.reviews},
    sold: ${entry.sold},
    inStock: true,
    shippingDays: "3–5 days",
    warehouse: "US",
    tags: ${JSON.stringify(entry.tags || [])},
    features: ${JSON.stringify(entry.features || [])},
    supplierSku: ${JSON.stringify(entry.supplierSku)},
    cjVid: ${JSON.stringify(entry.cjVid)},
    cjSku: ${JSON.stringify(entry.cjSku)}
  }`;
}

const newPet = byStore.pet.map(buildBlockFixed).join(",\n");
const newHome = byStore.home.map(buildBlockFixed).join(",\n");
const newWell = byStore.wellness.map(buildBlockFixed).join(",\n");
const newTech = byStore.tech.map(buildBlockFixed).join(",\n");

if (newPet) {
  source = source.replace(
    /(\n  \{\n    id: "pet-7")/,
    `,\n${newPet}$1`,
  );
}
if (newHome) {
  source = source.replace(
    /(\n  \{\n    id: "home-4")/,
    `,\n${newHome}$1`,
  );
}
if (newWell) {
  source = source.replace(
    /(\n  \{\n    id: "well-1")/,
    `,\n${newWell}$1`,
  );
}
if (newTech) {
  source = source.replace(
    /(\n  \{\n    id: "tech-8")/,
    `,\n${newTech}$1`,
  );
}

source = source.replace(/\},\s*,\s*\{/g, "},\n  {");
source = source.replace(/\}\s*\n\s*\{/g, "},\n  {");

writeFileSync(path, source);
const added = Object.values(byStore).flat().length;
const total = [...source.matchAll(/slug: "/g)].length;
console.log(`Merged ${added} products. Total catalog: ${total}`);
