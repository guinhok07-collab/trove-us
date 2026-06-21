/**
 * Patch products.ts: varied social proof + append new CJ products.
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { naturalSocialProof } from "./social-proof.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sync = JSON.parse(readFileSync(resolve(__dirname, "cj-catalog-sync.json"), "utf8"));
const expand = JSON.parse(readFileSync(resolve(__dirname, "cj-expand-results.json"), "utf8"));
const path = resolve(__dirname, "../src/data/products.ts");
let source = readFileSync(path, "utf8");

const SKIP_EXPAND = new Set(["resistance-loop-bands"]);

function truncateName(name) {
  const clean = (name || "").trim();
  return clean.length <= 72 ? clean : clean.slice(0, 69) + "…";
}

function findObjectBounds(text, slug) {
  const slugIdx = text.indexOf(`slug: "${slug}"`);
  if (slugIdx === -1) return null;
  const objStart = text.lastIndexOf("{", slugIdx);
  let depth = 0;
  let i = objStart;
  for (; i < text.length; i++) {
    if (text[i] === "{") depth++;
    if (text[i] === "}") {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    }
  }
  return { objStart, objEnd: i };
}

function formatImages(images) {
  return JSON.stringify(images, null, 4)
    .split("\n")
    .map((line, idx) => (idx === 0 ? line : "      " + line.trim()))
    .join("\n");
}

// Update social proof on existing products
for (const [slug, data] of Object.entries(sync)) {
  if (!data?.cjVid) continue;
  const bounds = findObjectBounds(source, slug);
  if (!bounds) continue;
  const social = naturalSocialProof(slug, data.listedNum || 0);
  let block = source.slice(bounds.objStart, bounds.objEnd);
  block = block.replace(/rating: [\d.]+,/, `rating: ${social.rating},`);
  block = block.replace(/reviews: \d+,/, `reviews: ${social.reviews},`);
  block = block.replace(/sold: \d+,/, `sold: ${social.sold},`);
  source = source.slice(0, bounds.objStart) + block + source.slice(bounds.objEnd);
}

const existingSlugs = new Set([...source.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]));

const productMeta = {
  "closet-organizer-6-shelf": {
    id: "home-1", store: "home",
    description: "Maximize closet space with sturdy hanging shelves.",
    longDescription: "Breathable non-woven shelves hang from any closet rod. Holds sweaters, shoes, and accessories without bulky furniture.",
    tags: ["bestseller"],
    features: ["5-tier hanging design", "Reinforced hooks", "Breathable fabric", "No tools needed"],
  },
  "under-bed-storage-bags": {
    id: "home-2", store: "home",
    description: "Foldable zippered bags for seasonal clothes & bedding.",
    longDescription: "Large-capacity under-bed storage with reinforced handles and dust-proof zippers. Folds flat when empty.",
    tags: ["free-shipping"],
    features: ["3 size set", "Zippered closure", "Reinforced handles", "Folds flat"],
  },
  "under-sink-organizer": {
    id: "home-3", store: "home",
    description: "Pull-out 2-tier organizer for kitchen or bathroom cabinets.",
    longDescription: "Sliding under-sink caddy brings bottles and supplies to you. Adjustable dividers fit most cabinet widths.",
    tags: ["new"],
    features: ["2-tier pull-out", "Sliding track", "Adjustable width", "Easy install"],
  },
  "pet-hair-remover-roller": {
    id: "pet-4", store: "pet",
    description: "Reusable lint roller for pet hair on furniture & clothes.",
    longDescription: "Self-cleaning brush picks up dog and cat fur in one swipe. No sticky sheets to replace — empty the chamber and reuse.",
    tags: ["bestseller"],
    features: ["Self-cleaning chamber", "Reusable", "Works on upholstery", "Portable size"],
  },
  "slow-feeder-dog-bowl": {
    id: "pet-6", store: "pet",
    description: "Puzzle bowl slows eating to reduce choking & bloating.",
    longDescription: "Maze design makes dogs work for kibble, extending mealtime and supporting healthier digestion. Non-slip base.",
    tags: ["new"],
    features: ["Anti-choke maze", "Non-slip base", "Dishwasher safe", "All breed sizes"],
  },
  "sleep-eye-mask": {
    id: "well-3", store: "wellness",
    description: "Silk-feel sleep mask blocks light for deeper rest.",
    longDescription: "Soft contoured mask with adjustable strap. Blocks light without pressure on eyes — ideal for travel and naps.",
    tags: [],
    features: ["Light blocking", "Adjustable strap", "Soft fabric", "Travel friendly"],
  },
  "mini-bluetooth-speaker": {
    id: "tech-4", store: "tech",
    description: "Portable magnetic Bluetooth speaker for desk or outdoors.",
    longDescription: "Compact speaker with crisp sound and magnetic mount. Pairs fast via Bluetooth for music, podcasts, and calls.",
    tags: ["new", "free-shipping"],
    features: ["Bluetooth 5.0", "Magnetic mount", "Rechargeable", "Compact design"],
  },
  "adjustable-phone-stand": {
    id: "tech-6", store: "tech",
    description: "360° rotating stand for phone and tablet on desk.",
    longDescription: "Stable aluminum stand adjusts viewing angle for video calls, recipes, and streaming. Fits phones and small tablets.",
    tags: [],
    features: ["360° rotation", "Stable base", "Phone + tablet", "Aluminum build"],
  },
};

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

const newBlocks = [];
for (const [slug, cj] of Object.entries(expand)) {
  if (SKIP_EXPAND.has(slug) || existingSlugs.has(slug) || !cj?.cjVid || !productMeta[slug]) continue;
  newBlocks.push({ store: productMeta[slug].store, block: buildProduct(slug, cj, productMeta[slug]) });
}

// Insert new products before closing ]; of products array
const insertByStore = {
  pet: newBlocks.filter((b) => b.store === "pet").map((b) => b.block),
  home: newBlocks.filter((b) => b.store === "home").map((b) => b.block),
  wellness: newBlocks.filter((b) => b.store === "wellness").map((b) => b.block),
  tech: newBlocks.filter((b) => b.store === "tech").map((b) => b.block),
};

if (insertByStore.home.length) {
  source = source.replace(
    /\/\/ ─── HOME & COZY \(8\) ───/,
    `// ─── HOME & COZY ───\n${insertByStore.home.join(",\n")},`,
  );
}
if (insertByStore.pet.length) {
  source = source.replace(
    /(\n  \{\n    id: "pet-5")/,
    `,\n${insertByStore.pet.join(",\n")}$1`,
  );
}
if (insertByStore.wellness.length) {
  source = source.replace(
    /\/\/ ─── WELLNESS HUB \(8\) ───/,
    `// ─── WELLNESS HUB ───\n${insertByStore.wellness.join(",\n")},`,
  );
}
if (insertByStore.tech.length) {
  source = source.replace(
    /(\n  \{\n    id: "tech-5")/,
    `,\n${insertByStore.tech.filter((b) => b.includes("mini-bluetooth")).join(",\n")}$1`,
  );
  const phoneStand = insertByStore.tech.find((b) => b.includes("adjustable-phone-stand"));
  if (phoneStand) {
    source = source.replace(
      /(\n  \{\n    id: "tech-8")/,
      `,\n${phoneStand}$1`,
    );
  }
}

source = source.replace(
  /\/\/ ─── PET CORNER \(8\) ───/,
  "// ─── PET CORNER ───",
);
source = source.replace(
  /\/\/ ─── SMART DESK \/ TECH \(8\) ───/,
  "// ─── SMART DESK / TECH ───",
);
source = source.replace(
  /Catalog — demo products until CJ sourcing is complete\./,
  "Catalog — CJ Dropshipping products with real photos and variant IDs.",
);

writeFileSync(path, source);
console.log("Patched products.ts");
console.log("Added:", newBlocks.map((b) => b.block.match(/slug: "([^"]+)"/)[1]).join(", "));

// Log social proof sample
for (const slug of ["no-pull-dog-harness", "pet-water-fountain", "wireless-earbuds-pro"]) {
  console.log(slug, naturalSocialProof(slug, sync[slug]?.listedNum || 0));
}
