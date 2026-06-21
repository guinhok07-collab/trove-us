/**
 * Add 8 everyday pet impulse products (~$6–12) — US warehouse, ~20% margin
 * Usage: node --env-file=.env.local scripts/apply-pet-impulse.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { naturalSocialProof } from "./social-proof.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PAYPAL = 0.034;
const MARGIN = 0.2;

const ITEMS = [
  {
    slug: "pet-silicone-food-mat",
    pid: "1763402968205897728",
    ship: 3.5,
    name: "Silicone Pet Food Mat",
    description: "Keeps bowls in place and catches spills on your floor.",
    longDescription:
      "Stop kibble and water from sliding across the floor at mealtime. This silicone mat grips under bowls and catches stray bits for quick cleanup. Wipe clean or rinse — perfect for dogs and cats. Ships from our US warehouse in 3–5 business days.",
    features: ["Non-slip silicone", "Spill-catching lip", "Easy wipe clean", "Fits standard bowls"],
    tags: ["bestseller"],
  },
  {
    slug: "dog-treat-pouch",
    pid: "1377182883625701376",
    ship: 3.5,
    name: "Dog Treat Training Pouch",
    description: "Clip-on pouch for treats on walks and training sessions.",
    longDescription:
      "Keep rewards handy without stuffing your pockets. This clip-on treat pouch opens wide for quick access and closes to keep snacks fresh on walks and training. Lightweight belt clip fits most leashes and waistbands. Ships from our US warehouse in 3–5 business days.",
    features: ["Quick-access opening", "Belt clip", "Lightweight", "Training-friendly"],
    tags: ["bestseller"],
  },
  {
    slug: "cat-feather-teaser",
    pid: "1392428662283964416",
    ship: 3.5,
    name: "Cat Feather Teaser Wand",
    description: "Interactive wand toy that keeps cats active and entertained.",
    longDescription:
      "Give indoor cats a fun way to chase and pounce. The feather teaser wand mimics prey movement to spark natural play — great for bonding and daily exercise. Replaceable feather head for ongoing fun. Ships from our US warehouse in 3–5 business days.",
    features: ["Feather teaser head", "Flexible wand", "Indoor play", "Bonding time"],
    tags: ["bestseller"],
  },
  {
    slug: "portable-pet-water-bottle",
    pid: "1651788214971146240",
    ship: 4,
    name: "Portable Pet Water Bottle",
    description: "Walk-friendly bottle with built-in bowl for dogs on the go.",
    longDescription:
      "Hydrate your dog on walks, hikes, and road trips without carrying a separate bowl. Squeeze or flip to dispense water into the attached drinking tray — less mess, less bulk in your bag. Leak-resistant cap for everyday carry. Ships from our US warehouse in 3–5 business days.",
    features: ["Built-in drinking tray", "Leak-resistant", "One-hand use", "Travel ready"],
    tags: [],
  },
  {
    slug: "pet-stainless-bowl-set",
    pid: "1846398052585066496",
    ship: 4,
    name: "Stainless Steel Pet Bowl Set",
    description: "Rust-resistant bowls for daily food and water.",
    longDescription:
      "Upgrade mealtime with stainless steel bowls that resist rust and rinse clean in seconds. Stable base helps prevent tipping during eager eating. Suitable for dogs and cats — use one for food, one for water. Ships from our US warehouse in 3–5 business days.",
    features: ["Stainless steel", "Rust resistant", "Easy rinse", "Stable base"],
    tags: [],
  },
  {
    slug: "pet-grooming-gloves",
    pid: "1932639907792334849",
    ship: 3.5,
    name: "Pet Grooming Gloves",
    description: "Massage and de-shed your pet while you pet them.",
    longDescription:
      "Turn cuddle time into grooming time. Soft rubber tips lift loose fur while you stroke your dog or cat — less stress than a brush for sensitive pets. Rinse clean after use. Ships from our US warehouse in 3–5 business days.",
    features: ["Gentle rubber tips", "De-shedding", "One size fits most", "Washable"],
    tags: ["bestseller"],
  },
  {
    slug: "dog-bandana-set",
    pid: "1463778127867154432",
    ship: 3.5,
    name: "Dog Bandana Set",
    description: "Soft bandanas for everyday walks and photos.",
    longDescription:
      "Add a little personality to every walk. Soft fabric bandanas slip over collars for a comfortable fit without extra bulk. Machine-washable for daily use. Ships from our US warehouse in 3–5 business days.",
    features: ["Soft fabric", "Collar-friendly fit", "Everyday wear", "Easy wash"],
    tags: [],
  },
  {
    slug: "pet-waste-bag-refills",
    pid: "10A2E8CF-227C-49D0-AF4E-FAE2945E2D3D",
    ship: 3.5,
    name: "Pet Waste Bag Refill Rolls",
    description: "Extra roll refills for your leash bag dispenser.",
    longDescription:
      "Never run out on a walk again. Compatibly sized refill rolls fit most standard leash dispensers — tear cleanly, strong enough for daily cleanup. Stock up and keep one in the car and one by the door. Ships from our US warehouse in 3–5 business days.",
    features: ["Standard roll size", "Strong material", "Easy tear", "Multi-pack value"],
    tags: [],
  },
];

function retailPrice(cost, ship) {
  const base = cost + ship;
  return Math.max(Math.ceil(base / (1 - MARGIN - PAYPAL)) - 0.01, base + 1.5);
}

function formatImages(images) {
  return JSON.stringify(images, null, 4)
    .split("\n")
    .map((line, idx) => (idx === 0 ? line : "      " + line.trim()))
    .join("\n");
}

function assignId(source, store) {
  const prefix = store;
  const nums = [...source.matchAll(new RegExp(`id: "${prefix}-(\\d+)"`, "g"))].map((m) => Number(m[1]));
  return `${prefix}-${(nums.length ? Math.max(...nums) : 0) + 1}`;
}

function buildBlock(entry, id) {
  return `  {
    id: "${id}",
    slug: "${entry.slug}",
    name: ${JSON.stringify(entry.name)},
    description: ${JSON.stringify(entry.description)},
    longDescription:
      ${JSON.stringify(entry.longDescription)},
    price: ${entry.price.toFixed(2)},
    compareAtPrice: ${entry.compareAtPrice.toFixed(2)},
    store: "pet",
    image: ${JSON.stringify(entry.image)},
    images: ${formatImages(entry.images)},
    rating: ${entry.rating},
    reviews: ${entry.reviews},
    sold: ${entry.sold},
    inStock: true,
    shippingDays: "3–5 days",
    warehouse: "US",
    tags: ${JSON.stringify(entry.tags)},
    features: ${JSON.stringify(entry.features)},
    supplierSku: ${JSON.stringify(entry.supplierSku)},
    cjVid: ${JSON.stringify(entry.cjVid)},
    cjSku: ${JSON.stringify(entry.cjSku)}
  }`;
}

async function cjFetch(path) {
  const res = await fetch(`${API}${path}`, {
    headers: { CJ-Access-Token: key },
    cache: "no-store",
  });
  const json = await res.json();
  if (!json.result) throw new Error(json.message || path);
  return json.data;
}

async function loadProduct(pid) {
  const data = await cjFetch(`/product/query?pid=${encodeURIComponent(pid)}`);
  const variants = data.variants || [];
  const v = variants.find((x) => x.variantSellPrice > 0) || variants[0];
  if (!v) throw new Error("no variant");
  const images = [...new Set([data.productImage, ...(data.productImages || [])].filter(Boolean))].slice(0, 8);
  return { data, v, images };
}

async function main() {
  if (!key) throw new Error("Set CJ_API_KEY");
  const path = resolve(__dirname, "../src/data/products.ts");
  let source = readFileSync(path, "utf8");

  for (const item of ITEMS) {
    if (source.includes(`slug: "${item.slug}"`)) {
      console.log("SKIP exists", item.slug);
      continue;
    }
    await sleep(400);
    const { data, v, images } = await loadProduct(item.pid);
    const cost = Number(v.variantSellPrice ?? data.sellPrice ?? 0);
    if (cost > 14) {
      console.warn("WARN high cost", item.slug, cost, data.productNameEn?.slice(0, 40));
    }
    const price = retailPrice(cost, item.ship);
    const social = naturalSocialProof(item.slug, data.listedNum ?? 0);
    const entry = {
      ...item,
      price,
      compareAtPrice: Math.ceil(price * 1.1) - 0.01,
      image: images[0],
      images,
      supplierSku: v.variantSku ?? data.productSku,
      cjVid: v.vid,
      cjSku: v.variantSku,
      rating: social.rating,
      reviews: social.reviews,
      sold: social.sold,
    };
    const id = assignId(source, "pet");
    const block = buildBlock(entry, id);
    source = source.replace(/\n\];\n\nexport function getProductBySlug/, `\n${block},\n];\n\nexport function getProductBySlug`);
    console.log("OK", item.slug, `$${cost.toFixed(2)} → $${price.toFixed(2)}`, data.productNameEn?.slice(0, 45));
  }

  writeFileSync(path, source);
  console.log("\nDone — products.ts updated");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
