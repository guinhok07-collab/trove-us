/**
 * Add pet walk extras: bag refills + treat pouch
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { naturalSocialProof } from "./social-proof.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const productsPath = resolve(__dirname, "../src/data/products.ts");
const dataPath = resolve(__dirname, "cj-pet-walk-extras.json");

const COPY = {
  "pet-waste-bag-refills": {
    name: "Dog Poop Bag Rolls — 270 Count",
    description: "Thick biodegradable waste bags — months of daily walks in one box.",
    longDescription:
      "Stock up on sturdy poop bags so you never run out mid-walk. This 270-count pack uses thick, leak-resistant material that handles daily routes with confidence. Fits standard dispensers and stores easily in a pantry or leash bag. Ships from our US warehouse in 3–5 business days.",
    features: ["270 bags included", "Thick leak-resistant", "Biodegradable material", "Fits most dispensers"],
    tags: ["bestseller"],
  },
  "dog-treat-pouch": {
    name: "Dog Training Treat Pouch",
    description: "Clip-on silicone pouch for treats on walks and training sessions.",
    longDescription:
      "Keep rewards within reach during training with a soft silicone treat pouch that clips to your belt or leash. Food-grade material wipes clean fast and opens with one hand while you hold the leash. Perfect for daily walks, puppy training, and park visits. Ships from our US warehouse in 3–5 business days.",
    features: ["Food-grade silicone", "Belt & leash clip", "One-hand open", "Easy to clean"],
    tags: [],
  },
};

function formatImages(images) {
  return JSON.stringify(images, null, 4)
    .split("\n")
    .map((line, idx) => (idx === 0 ? line : "      " + line.trim()))
    .join("\n");
}

function assignId(source, store) {
  const nums = [...source.matchAll(new RegExp(`id: "${store}-(\\d+)"`, "g"))].map((m) => Number(m[1]));
  return `${store}-${(nums.length ? Math.max(...nums) : 0) + 1}`;
}

function buildBlock(entry, id, copy) {
  const sp = naturalSocialProof(entry.slug, entry.listedNum || 0);
  return `  {
    id: "${id}",
    slug: "${entry.slug}",
    name: ${JSON.stringify(copy.name)},
    description: ${JSON.stringify(copy.description)},
    longDescription:
      ${JSON.stringify(copy.longDescription)},
    price: ${entry.price.toFixed(2)},
    compareAtPrice: ${entry.compareAtPrice.toFixed(2)},
    store: "pet",
    image: ${JSON.stringify(entry.image)},
    images: ${formatImages(entry.images)},
    rating: ${sp.rating},
    reviews: ${sp.reviews},
    sold: ${sp.sold},
    inStock: true,
    shippingDays: "3–5 days",
    warehouse: "US",
    tags: ${JSON.stringify(copy.tags)},
    features: ${JSON.stringify(copy.features)},
    supplierSku: ${JSON.stringify(entry.supplierSku)},
    cjVid: ${JSON.stringify(entry.cjVid)},
    cjSku: ${JSON.stringify(entry.cjSku)}
  }`;
}

const curated = JSON.parse(readFileSync(dataPath, "utf8"));
let src = readFileSync(productsPath, "utf8");
const blocks = [];

for (const slug of Object.keys(curated)) {
  if (src.includes(`slug: "${slug}"`)) {
    console.log("SKIP exists", slug);
    continue;
  }
  const entry = curated[slug];
  const id = assignId(src, "pet");
  blocks.push(buildBlock(entry, id, COPY[slug]));
  console.log("ADD", slug, entry.price);
}

if (blocks.length) {
  src = src.replace(/,?\s*\n\];\n\nexport function getProductBySlug/, `,\n${blocks.join(",\n")}\n];\n\nexport function getProductBySlug`);
  writeFileSync(productsPath, src);
}

console.log("Done");
