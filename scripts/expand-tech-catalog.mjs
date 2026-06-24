/**
 * Add vetted tech accessories — PID-verified only (no loose search).
 * Usage: node --env-file=.env.local scripts/expand-tech-catalog.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { naturalSocialProof } from "./social-proof.mjs";
import {
  MAX_RETAIL,
  MIN_IMAGES,
  assignId,
  auditMedia,
  buildProductBlock,
  buildVariantsFromData,
  cjMatchesListing,
  compareAt,
  extractVideo,
  getToken,
  queryPid,
  retailPrice,
  supplierImages,
} from "./lib/cj-catalog-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const key = process.env.CJ_API_KEY;
if (!key) throw new Error("Set CJ_API_KEY");

const productsPath = resolve(__dirname, "../src/data/products.ts");
const variantsPath = resolve(__dirname, "../src/data/product-variants.json");

/** PIDs verificados via hunt-tech-pids.mjs + busca manual */
const TECH_PICKS = [
  {
    slug: "ergonomic-keyboard-wrist-rest",
    pid: "1680750386820427776",
    ship: 3.5,
    name: "Ergonomic Keyboard Wrist Rest",
    description: "Memory foam pad supports wrists during long typing sessions.",
    longDescription:
      "Reduce wrist fatigue at your desk with a soft memory foam rest that sits in front of your keyboard. Non-slip base stays put on smooth surfaces and the breathable cover wipes clean. A simple upgrade for home offices and students. Ships from our US warehouse in 3–5 business days.",
    features: ["Memory foam cushion", "Non-slip base", "Keyboard width fit", "Easy to clean"],
    tags: ["bestseller"],
  },
  {
    slug: "laptop-cooling-pad",
    pid: "2001928008850780161",
    ship: 4,
    name: "USB Laptop Cooling Pad",
    description: "Quiet fan helps laptops run cooler during work and gaming.",
    longDescription:
      "Keep your laptop from overheating on the couch or desk with a slim pad that pulls heat away through a built-in USB fan. Adjustable tray fits most 10–15 inch notebooks and plugs into your laptop for power. Ships from our US warehouse in 3–5 business days.",
    features: ["USB powered fan", "Adjustable tray", "Quiet operation", "10–15 inch fit"],
    tags: [],
  },
  {
    slug: "capacitive-stylus-pen",
    pid: "1376140956608368640",
    ship: 3.5,
    name: "Capacitive Touch Stylus Pen",
    description: "Smooth drawing and tapping on iPad, Android tablets, and phones.",
    longDescription:
      "Take notes and sketch on touch screens without smudged fingerprints. Soft tip glides smoothly across glass and works with most capacitive displays — no pairing or batteries required. Clip attaches to cases for daily carry. Ships from our US warehouse in 3–5 business days.",
    features: ["No battery needed", "Soft capacitive tip", "Pocket clip", "Tablet & phone"],
    tags: [],
  },
  {
    slug: "bluetooth-usb-adapter-pc",
    pid: "0BB6DC25-E462-4DB0-9C6E-5AE2F8CE1FF6",
    ship: 3.5,
    name: "Bluetooth USB Adapter for PC",
    description: "Adds Bluetooth to desktops and laptops for earbuds and mice.",
    longDescription:
      "Pair wireless earbuds, speakers, and keyboards with older PCs that lack built-in Bluetooth. Plug-and-play dongle installs in seconds on common Windows setups. Tiny profile stays out of the way on laptops. Ships from our US warehouse in 3–5 business days.",
    features: ["Plug and play", "Bluetooth receiver", "Compact dongle", "PC & laptop fit"],
    tags: [],
  },
  {
    slug: "phone-tablet-stand",
    pid: "3052B795-EB62-41A2-8B3D-F97948B20132",
    ship: 3.5,
    name: "Adjustable Phone & Tablet Stand",
    description: "Stable desk stand for video calls, recipes, and streaming.",
    longDescription:
      "Prop your phone or tablet at a comfortable viewing angle on desks, kitchen counters, and nightstands. Rotating base switches between portrait and landscape for FaceTime and shows. Compact footprint fits small workspaces. Ships from our US warehouse in 3–5 business days.",
    features: ["360° rotation", "Phone & tablet fit", "Stable base", "Desk friendly"],
    tags: ["bestseller"],
  },
  {
    slug: "usb-hub-4port",
    pid: "1437661943715467264",
    ship: 3.5,
    name: "4-Port USB 3.0 Hub",
    description: "Adds four USB ports when your laptop runs out of sockets.",
    longDescription:
      "Connect a mouse, keyboard, flash drive, and webcam from one compact hub. USB 3.0 speeds help with everyday file transfers and peripherals on busy desks. Slim design travels well in laptop bags. Ships from our US warehouse in 3–5 business days.",
    features: ["4 USB ports", "USB 3.0 speed", "Compact body", "Plug and play"],
    tags: [],
  },
  {
    slug: "metal-phone-stand-desk",
    pid: "1735490206582710272",
    ship: 3.5,
    name: "Metal Desk Phone Stand",
    description: "Heavy-duty holder keeps phones upright while you work.",
    longDescription:
      "Aluminum stand holds your phone at eye level for notifications, timers, and video calls. Weighted base resists tipping and the open design fits most cases. A clean upgrade for WFH desks and kitchen counters. Ships from our US warehouse in 3–5 business days.",
    features: ["Aluminum build", "Weighted base", "Case friendly", "Portrait mode"],
    tags: [],
  },
  {
    slug: "magnetic-cable-clips",
    pid: "1965621056973606913",
    ship: 3.5,
    name: "Magnetic Cable Organizer Clips",
    description: "Keeps charging cables tidy on desks and nightstands.",
    longDescription:
      "Stop hunting for fallen USB cables with adhesive magnetic clips that hold cords in place on desks, headboards, and car dashboards. Six-pack covers phone chargers, earbuds, and laptop leads. Peel-and-stick install takes seconds. Ships from our US warehouse in 3–5 business days.",
    features: ["6-pack clips", "Magnetic hold", "Adhesive mount", "Desk & nightstand"],
    tags: ["bestseller"],
  },
];

let source = readFileSync(productsPath, "utf8");
const existingSlugs = new Set([...source.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]));
const usedVids = new Set([...source.matchAll(/cjVid: "([^"]+)"/g)].map((m) => m[1]));

const token = await getToken(key);
const toAdd = [];
let fail = 0;

for (const item of TECH_PICKS) {
  if (existingSlugs.has(item.slug)) {
    console.log("SKIP exists", item.slug);
    continue;
  }
  if (!item.pid) {
    console.log("SKIP no pid", item.slug);
    continue;
  }

  const data = await queryPid(token, item.pid);
  if (!data?.variants?.length) {
    fail++;
    console.log("FAIL query", item.slug);
    continue;
  }

  const cjName = data.productNameEn || "";
  const match = cjMatchesListing(item.slug, item.name, item.description, item.features, cjName);
  if (!match.ok || match.nameScore < 0.18) {
    fail++;
    console.log("FAIL match", item.slug, Math.round(match.nameScore * 100) + "%", cjName.slice(0, 55));
    continue;
  }

  const variant = data.variants.find((v) => Number(v.variantSellPrice) > 0) || data.variants[0];
  if (!variant?.vid || usedVids.has(variant.vid)) {
    fail++;
    console.log("FAIL vid", item.slug);
    continue;
  }

  const cost = Number(variant.variantSellPrice ?? data.sellPrice ?? 0);
  const images = supplierImages(data, variant);
  if (images.length < MIN_IMAGES) {
    fail++;
    console.log("FAIL images", item.slug, images.length);
    continue;
  }

  const price = retailPrice(cost, item.ship);
  if (price > MAX_RETAIL) {
    fail++;
    console.log("FAIL price", item.slug, price);
    continue;
  }

  const video = extractVideo(data);
  const variants = buildVariantsFromData(data, item.ship);
  const defaultVariant = variants.find((v) => v.cjVid === variant.vid) || variants[0];
  const audit = auditMedia({
    slug: item.slug,
    images: defaultVariant?.images ?? images,
    video,
    variantCount: variants.length,
    cjName,
  });
  if (audit?.level === "error") {
    fail++;
    console.log("FAIL media", item.slug, audit.messages.join("; "));
    continue;
  }

  const social = naturalSocialProof(item.slug, Number(data.listedNum || 0));
  usedVids.add(variant.vid);

  toAdd.push({
    ...item,
    store: "tech",
    image: defaultVariant?.image ?? images[0],
    images: defaultVariant?.images ?? images,
    video,
    price,
    compareAtPrice: compareAt(price),
    supplierSku: data.productSku,
    cjVid: variant.vid,
    cjSku: variant.variantSku,
    cjName,
    variants,
    defaultVariantId: defaultVariant?.id,
    ...social,
  });
  console.log("OK", item.slug, `$${price.toFixed(2)}`, cjName.slice(0, 55));
}

if (!toAdd.length) {
  console.log(`Nothing new (${fail} failed).`);
  process.exit(0);
}

const blocks = [];
let idSource = source;
for (const entry of toAdd) {
  const id = assignId(idSource, "tech");
  idSource += `\nid: "${id}"`;
  blocks.push(buildProductBlock(entry, id));
}

source = source.replace(
  /\n\];\n\nexport function getProductBySlug/,
  `,\n${blocks.join(",\n")}\n];\n\nexport function getProductBySlug`,
);
writeFileSync(productsPath, source);

const variantCatalog = JSON.parse(readFileSync(variantsPath, "utf8"));
for (const entry of toAdd) {
  variantCatalog[entry.slug] = {
    defaultVariantId: entry.defaultVariantId || entry.cjVid,
    variants: entry.variants,
  };
}
writeFileSync(variantsPath, JSON.stringify(variantCatalog, null, 2));

console.log(`\nAdded ${toAdd.length} tech (${fail} failed). Total:`, [...source.matchAll(/slug: "/g)].length);
execSync("node scripts/relabel-variants.mjs", { cwd: resolve(__dirname, ".."), stdio: "inherit" });
