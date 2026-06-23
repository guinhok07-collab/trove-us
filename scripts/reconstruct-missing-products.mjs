/**
 * Re-add product blocks for slugs in product-variants.json missing from products.ts
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { naturalSocialProof } from "./social-proof.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const productsPath = resolve(__dirname, "../src/data/products.ts");
const variantsPath = resolve(__dirname, "../src/data/product-variants.json");
const copyPath = resolve(__dirname, "product-copy.json");

const STORE_BY_SLUG = {
  "jump-rope-weighted": "wellness",
  "cooling-towel-sports": "wellness",
  "resistance-loop-bands": "wellness",
  "massage-ball-set": "wellness",
  "ear-plugs-sleep": "wellness",
  "scalp-massager-brush": "wellness",
  "digital-kitchen-scale": "wellness",
  "weighted-sleep-mask": "wellness",
  "acupressure-mat-pillow": "wellness",
  "portable-blender-bottle": "wellness",
  "foam-roller-recovery": "wellness",
  "balance-pad-foam": "wellness",
  "bed-sheet-organizer": "home",
  "mason-jar-storage-lids": "home",
  "collapsible-colander": "home",
  "silicone-utensil-rest": "home",
  "over-sink-dish-rack": "home",
  "drawer-divider-expandable": "home",
  "bluetooth-keyboard-mini": "tech",
  "wireless-mouse-silent": "tech",
  "laptop-sleeve-13": "tech",
  "phone-ring-holder": "tech",
  "portable-ssd-enclosure": "tech",
  "automatic-pet-feeder": "pet",
  "pet-stairs-steps": "pet",
  "pet-nail-grinder": "pet",
  "pet-deshedding-tool": "pet",
  "cat-laser-toy": "pet",
  "pet-toothbrush-kit": "pet",
  "dog-squeaky-plush-toy": "pet",
  "cat-tunnel-toy": "pet",
  "pet-bowl-mat-silicone": "pet",
  "kitchen-sink-sponge-holder": "home",
};

const copy = JSON.parse(readFileSync(copyPath, "utf8"));
const catalog = JSON.parse(readFileSync(variantsPath, "utf8"));
let source = readFileSync(productsPath, "utf8");
const existing = new Set([...source.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]));

function assignId(src, store) {
  const prefix = store === "wellness" ? "well" : store === "tech" ? "tech" : store;
  const nums = [...src.matchAll(new RegExp(`id: "${prefix}-(\\d+)"`, "g"))].map((m) => Number(m[1]));
  return `${prefix}-${(nums.length ? Math.max(...nums) : 0) + 1}`;
}

function formatImages(images) {
  return JSON.stringify(images, null, 4)
    .split("\n")
    .map((line, idx) => (idx === 0 ? line : "      " + line.trim()))
    .join("\n");
}

function inferStore(slug) {
  if (STORE_BY_SLUG[slug]) return STORE_BY_SLUG[slug];
  if (/^(dog|cat|pet)-/.test(slug)) return "pet";
  if (/usb|bluetooth|laptop|keyboard|mouse|ssd|phone-|hub|charger|webcam|monitor|sd-card|magsafe|earbuds|speaker|tracker|screen-|cable-|smartwatch|item-finder|ring-holder|adapter|enclosure|sleeve|mouse|keyboard/.test(slug))
    return "tech";
  if (/yoga|foam|wellness|sleep|massage|grip|roller|meditation|jade|ice-roller|posture|blender|acupressure|balance|jump-rope|cooling-towel|weighted|ear-plugs|scalp|kitchen-scale|resistance|compression|mask|towel|mat-thick|water-bottle|pillow|reflexology/.test(slug))
    return "wellness";
  return "home";
}

function titleFromSlug(slug) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const blocks = [];
let idSource = source;

for (const slug of Object.keys(catalog)) {
  if (existing.has(slug)) continue;
  const entry = catalog[slug];
  const v = entry.variants.find((x) => x.id === entry.defaultVariantId) || entry.variants[0];
  if (!v) continue;

  const store = inferStore(slug);
  const c = copy[slug] || {
    name: titleFromSlug(slug),
    description: "Quality everyday essential — ships fast from our US warehouse.",
    longDescription:
      "A practical pick for daily use with reliable quality and fast US shipping. Ships from our US warehouse in 3–5 business days.",
    features: ["US warehouse", "Fast shipping", "Quality build", "Everyday use"],
  };

  const social = naturalSocialProof(slug, 100);
  const id = assignId(idSource, store);
  idSource += `\nid: "${id}"`;

  blocks.push(`  {
    id: "${id}",
    slug: "${slug}",
    name: ${JSON.stringify(c.name)},
    description: ${JSON.stringify(c.description)},
    longDescription:
      ${JSON.stringify(c.longDescription)},
    price: ${v.price.toFixed(2)},
    compareAtPrice: ${(v.compareAtPrice ?? v.price * 1.1).toFixed(2)},
    store: "${store}",
    image: ${JSON.stringify(v.image)},
    images: ${formatImages(v.images)},
    rating: ${social.rating},
    reviews: ${social.reviews},
    sold: ${social.sold},
    inStock: true,
    shippingDays: "3–5 days",
    warehouse: "US",
    tags: [],
    features: ${JSON.stringify(c.features || [])},
    supplierSku: ${JSON.stringify(v.cjSku?.replace(/[0-9A-Z]+$/i, "").slice(0, 20) || slug)},
    cjVid: ${JSON.stringify(v.cjVid)},
    cjSku: ${JSON.stringify(v.cjSku)}
  }`.replace(/\n/g, "\r\n"));
}

const closingPattern = /\r?\n\];\r?\n\r?\nexport function getProductBySlug/;

if (!blocks.length) {
  console.log("Nothing to reconstruct.");
  process.exit(0);
}

if (!closingPattern.test(source)) {
  console.error("Could not find products array closing — aborting.");
  process.exit(1);
}

source = source.replace(
  closingPattern,
  `,\r\n${blocks.join(",\r\n")}\r\n];\r\n\r\nexport function getProductBySlug`,
);

writeFileSync(productsPath, source);
console.log(`Reconstructed ${blocks.length} products → total ${existing.size + blocks.length}`);
