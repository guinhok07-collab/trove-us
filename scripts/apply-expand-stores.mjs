/**
 * Expand Home / Wellness / Tech with full CJ standard (variants + media audit).
 * Usage: node --env-file=.env.local scripts/apply-expand-stores.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { naturalSocialProof } from "./social-proof.mjs";
import {
  API,
  MAX_RETAIL,
  MIN_IMAGES,
  assignId,
  auditMedia,
  buildProductBlock,
  buildVariantsFromData,
  compareAt,
  extractVideo,
  getToken,
  okName,
  queryPid,
  retailPrice,
  sleep,
  supplierImages,
} from "./lib/cj-catalog-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const key = process.env.CJ_API_KEY;
if (!key) throw new Error("Set CJ_API_KEY in .env.local");

const productsPath = resolve(__dirname, "../src/data/products.ts");
const variantsPath = resolve(__dirname, "../src/data/product-variants.json");
const auditPath = resolve(__dirname, "../src/data/catalog-media-audit.json");

const TARGETS = [
  // HOME
  {
    slug: "bed-sheet-organizer",
    store: "home",
    pid: "2046065106086301698",
    q: "bed sheet organizer storage foldable set",
    must: ["sheet organizer", "bedding organizer", "sheet storage", "bed sheet"],
    ban: ["pillow case only", "mattress", "phone"],
    ship: 4,
    name: "Bed Sheet Organizer Set",
    description: "Keep matching sheet sets together — no more lost pillowcases.",
    longDescription:
      "Label and store folded sheet sets in breathable organizers so you grab the right size without digging through the linen closet. Fits standard queen and full sets and stacks neatly on shelves. Ships from our US warehouse in 3–5 business days.",
    features: ["Labeled pockets", "Breathful fabric", "Closet stackable", "Set of 3"],
    tags: [],
  },
  {
    slug: "mason-jar-storage-lids",
    store: "home",
    q: "mason jar storage lids pour shaker pantry",
    queries: [
      "mason jar storage lids pour shaker pantry",
      "canning jar lids pour spout storage",
      "regular mouth mason jar shaker lid",
    ],
    must: ["mason jar", "canning jar", "jar lid"],
    ban: ["ring light", "canning machine", "can opener", "electric"],
    ship: 3.5,
    name: "Mason Jar Storage Lid Set",
    description: "Turn jars into pantry pour spouts and shaker lids.",
    longDescription:
      "Repurpose mason jars for rice, pasta, spices, and snacks with leak-resistant lids that pour or shake without removing the ring. BPA-free plastic fits regular-mouth jars you already own. Ships from our US warehouse in 3–5 business days.",
    features: ["Pour & shaker lids", "Regular-mouth fit", "BPA-free", "Multi-pack"],
    tags: ["bestseller"],
  },
  {
    slug: "collapsible-colander",
    store: "home",
    q: "collapsible colander silicone strainer kitchen",
    queries: [
      "collapsible silicone colander strainer",
      "foldable colander over sink drain",
      "collapsible strainer pasta vegetables",
    ],
    must: ["colander", "strainer"],
    ban: ["laundry basket", "pet", "ladle only", "soup spoon"],
    ship: 4,
    name: "Collapsible Silicone Colander",
    description: "Drain pasta and rinse produce — folds flat for small kitchens.",
    longDescription:
      "Save drawer space with a silicone colander that expands over the sink and collapses when you're done. Heat-resistant for hot pasta water and flexible enough to squeeze into tight cabinets. Ships from our US warehouse in 3–5 business days.",
    features: ["Collapsible design", "Heat-resistant silicone", "Over-sink handles", "Dishwasher safe"],
    tags: [],
  },
  {
    slug: "silicone-utensil-rest",
    store: "home",
    pid: "E94267B1-13A3-430A-B115-24054FB706B3",
    q: "stainless steel spoon rest spatula holder",
    must: ["spoon rest", "spatula holder", "spoon holder"],
    ban: ["toothbrush", "phone stand", "exercise"],
    ship: 3.5,
    name: "Heat-Resistant Spoon Rest",
    description: "Keeps counters clean while cooking — holds ladles and spatulas.",
    longDescription:
      "Stop sauce drips on the counter with a heat-resistant spoon rest that sits beside the stove. Wide cradle fits ladles, tongs, and spatulas during busy meal prep. Dishwasher safe and easy to wipe clean. Ships from our US warehouse in 3–5 business days.",
    features: ["Heat resistant", "Wide cradle", "Non-slip base", "Easy to clean"],
    tags: [],
  },
  {
    slug: "over-sink-dish-rack",
    store: "home",
    q: "over sink dish drying rack roll up silicone",
    must: ["dish", "rack"],
    ban: ["dishwasher machine", "laundry rack"],
    ship: 4.5,
    name: "Over-Sink Roll-Up Dish Drying Rack",
    description: "Rolls out over the sink for extra drying space — stores flat.",
    longDescription:
      "Small kitchen? Roll this rack over the sink to air-dry plates and glasses without a bulky dish drainer on the counter. Silicone-coated steel bars support heavy pots and roll up for drawer storage. Ships from our US warehouse in 3–5 business days.",
    features: ["Roll-up design", "Over-sink fit", "Heat resistant bars", "Space saving"],
    tags: [],
  },
  {
    slug: "drawer-divider-expandable",
    store: "home",
    q: "expandable drawer divider adjustable bamboo",
    queries: [
      "expandable drawer divider adjustable",
      "spring loaded drawer organizer divider",
      "adjustable drawer dividers set kitchen",
    ],
    must: ["drawer divider", "drawer organizer"],
    ban: ["closet shelf hanging", "shoe rack", "makeup bag"],
    ship: 4,
    name: "Expandable Drawer Dividers",
    description: "Adjustable dividers tame junk drawers and utensil chaos.",
    longDescription:
      "Custom-fit dividers expand to separate utensils, junk drawer gadgets, and office supplies without tools. Spring-loaded ends grip drawer walls and stay put when you pull items out. Ships from our US warehouse in 3–5 business days.",
    features: ["Spring-loaded grip", "No tools needed", "Set of 4", "Adjustable width"],
    tags: [],
  },
  // WELLNESS
  {
    slug: "weighted-sleep-mask",
    store: "wellness",
    q: "weighted sleep mask blackout eye",
    must: ["sleep mask"],
    ban: ["vr", "bluetooth", "cream"],
    ship: 3.5,
    name: "Weighted Sleep Mask",
    description: "Gentle weight blocks light and eases tension for deeper sleep.",
    longDescription:
      "Fall asleep faster with a blackout mask that adds light pressure around the eyes. Soft fabric and an adjustable strap fit most head sizes. Great for travel and light-sensitive sleepers. Ships from our US warehouse in 3–5 business days.",
    features: ["Blackout coverage", "Gentle weighted feel", "Adjustable strap", "Travel friendly"],
    tags: ["bestseller"],
  },
  {
    slug: "acupressure-mat-pillow",
    store: "wellness",
    q: "acupressure mat pillow set back pain",
    queries: [
      "acupressure mat pillow set spike",
      "lotus spike mat neck pillow set",
      "acupressure massage mat pillow yoga",
    ],
    must: ["acupressure", "spike mat", "lotus mat", "massage mat"],
    ban: ["yoga mat only", "dog", "electric", "vibrating"],
    ship: 5,
    name: "Acupressure Mat & Pillow Set",
    description: "Spike mat and pillow release back and neck tension in minutes.",
    longDescription:
      "Lie down on gentle pressure points that help loosen tight muscles after desk work or workouts. Includes a matching neck pillow and carry bag. Ships from our US warehouse in 3–5 business days.",
    features: ["Mat + neck pillow", "Carry bag included", "Eco foam base", "Beginner friendly"],
    tags: ["bestseller"],
  },
  {
    slug: "portable-blender-bottle",
    store: "wellness",
    q: "portable blender usb rechargeable smoothie cup",
    must: ["blender"],
    ban: ["commercial juicer", "food processor"],
    ship: 4.5,
    name: "Portable USB Smoothie Blender",
    description: "Rechargeable personal blender for protein shakes on the go.",
    longDescription:
      "Blend smoothies at the gym, office, or hotel with a compact USB-rechargeable cup blender. BPA-free jar rinses clean fast and handles frozen fruit and protein powder. Ships from our US warehouse in 3–5 business days.",
    features: ["USB rechargeable", "BPA-free cup", "6-blade base", "Travel size"],
    tags: ["bestseller"],
  },
  {
    slug: "foam-roller-recovery",
    store: "wellness",
    pid: "1464113927901286400",
    q: "foam roller muscle relaxer fitness yoga",
    must: ["foam roller"],
    ban: ["electric", "massage gun", "vibrating", "inflatable", "air mat"],
    ship: 4.5,
    name: "EVA Foam Roller — Muscle Recovery",
    description: "Roll out sore legs, back, and IT band after workouts.",
    longDescription:
      "Speed up recovery with a firm EVA foam roller that targets quads, hamstrings, and upper back. Textured surface grips the floor while you control pressure. Ships from our US warehouse in 3–5 business days.",
    features: ["High-density EVA", "Full-body use", "Non-slip texture", "Lightweight"],
    tags: [],
  },
  {
    slug: "balance-pad-foam",
    store: "wellness",
    pid: "2406240928281612300",
    q: "non slip balance pad fitness mat",
    must: ["balance pad", "balance mat"],
    ban: ["yoga mat only", "dog bed", "treadmill", "horse", "children"],
    ship: 4.5,
    name: "Foam Balance Pad",
    description: "Improve stability for rehab, yoga, and standing desk breaks.",
    longDescription:
      "Add an unstable surface to squats, single-leg stands, and physical therapy exercises. Closed-cell foam is waterproof and wipes clean after sweat sessions. Ships from our US warehouse in 3–5 business days.",
    features: ["Closed-cell foam", "Non-slip bottom", "Rehab friendly", "Easy to clean"],
    tags: [],
  },
  // TECH
  {
    slug: "bluetooth-keyboard-mini",
    store: "tech",
    q: "bluetooth keyboard mini portable rechargeable",
    must: ["bluetooth keyboard", "wireless keyboard"],
    ban: ["mechanical gaming rgb only"],
    ship: 4,
    name: "Mini Bluetooth Keyboard",
    description: "Slim wireless keyboard for tablet, TV, and travel setups.",
    longDescription:
      "Type comfortably on an iPad, Fire TV, or phone with a rechargeable Bluetooth keyboard that pairs in seconds. Quiet keys and slim profile fit in a laptop sleeve pocket. Ships from our US warehouse in 3–5 business days.",
    features: ["Bluetooth 5.0", "Rechargeable battery", "Quiet keys", "Pocket slim"],
    tags: [],
  },
  {
    slug: "wireless-mouse-silent",
    store: "tech",
    q: "wireless mouse silent ergonomic rechargeable",
    must: ["wireless", "mouse"],
    ban: ["gaming rgb", "mouse pad only"],
    ship: 3.5,
    name: "Silent Wireless Mouse",
    description: "Quiet clicks and smooth tracking for office and travel.",
    longDescription:
      "Work in cafes and shared spaces without loud click sounds. Ergonomic shape supports all-day use and the USB receiver stores inside the mouse for travel. Ships from our US warehouse in 3–5 business days.",
    features: ["Silent clicks", "USB receiver storage", "Ergonomic shape", "Plug and play"],
    tags: ["bestseller"],
  },
  {
    slug: "laptop-sleeve-13",
    store: "tech",
    pid: "1675374281456365568",
    q: "laptop sleeve 13 14 inch case",
    must: ["laptop sleeve", "laptop case", "laptop bag", "tablet computer protective"],
    ban: ["backpack only", "phone case"],
    ship: 4,
    name: "Neoprene Laptop Sleeve — 13–14\"",
    description: "Slim scratch protection for MacBook and ultrabooks.",
    longDescription:
      "Slide your laptop into a padded neoprene sleeve before tossing it in a tote or backpack. Soft interior prevents scratches and the zipper opens wide for quick security checks. Ships from our US warehouse in 3–5 business days.",
    features: ["Neoprene padding", "Scratch protection", "Wide zipper", "13–14 inch fit"],
    tags: [],
  },
  {
    slug: "phone-ring-holder",
    store: "tech",
    q: "phone ring holder stand grip kickstand",
    must: ["ring", "phone"],
    ban: ["car mount only", "ring light"],
    ship: 3.5,
    name: "Phone Ring Holder & Stand",
    description: "Secure grip and kickstand for one-handed texting and video.",
    longDescription:
      "Reduce drop anxiety with a metal ring that rotates into a stand for recipes, FaceTime, and scrolling. Strong adhesive attaches to most phone cases. Ships from our US warehouse in 3–5 business days.",
    features: ["360° rotation", "Kickstand mode", "Strong adhesive", "Slim profile"],
    tags: ["bestseller"],
  },
  {
    slug: "portable-ssd-enclosure",
    store: "tech",
    pid: "1377829110205779968",
    q: "nvme m2 ssd enclosure usb c",
    must: ["ssd enclosure", "nvme enclosure", "m.2 enclosure", "hdd enclosure"],
    ban: ["internal ssd only", "hard drive 3.5"],
    ship: 3.5,
    name: "NVMe SSD Enclosure — USB-C",
    description: "Turn an M.2 drive into fast portable USB storage.",
    longDescription:
      "Repurpose an NVMe SSD as an external drive for photo backups and video edits on the go. Tool-free tray and aluminum housing help manage heat during large transfers. Ships from our US warehouse in 3–5 business days.",
    features: ["NVMe M.2 fit", "USB-C 10Gbps", "Tool-free install", "Aluminum heat sink"],
    tags: [],
  },
];

let source = readFileSync(productsPath, "utf8");
const existingSlugs = new Set([...source.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]));
const usedPids = new Set();
const usedVids = new Set([...source.matchAll(/cjVid: "([^"]+)"/g)].map((m) => m[1]));

const token = await getToken(key);
const toAdd = [];
const mediaWarnings = [];
let fail = 0;

async function mapHit(token, item, data, listed = 0) {
  const cjName = data.productNameEn || "";
  if (!okName(cjName, item.must, item.ban, { all: false })) return null;

  const variant = data.variants?.find((v) => Number(v.variantSellPrice) > 0) || data.variants?.[0];
  if (!variant?.vid || usedVids.has(variant.vid)) return null;

  const cost = Number(variant.variantSellPrice ?? data.sellPrice ?? 0);
  if (cost < 0.4 || cost > 42) return null;

  const images = supplierImages(data, variant);
  if (images.length < MIN_IMAGES) return null;

  const price = retailPrice(cost, item.ship);
  if (price > MAX_RETAIL) return null;

  usedPids.add(data.pid);
  usedVids.add(variant.vid);

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
  if (audit) mediaWarnings.push(audit);

  const social = naturalSocialProof(item.slug, listed || Number(data.listedNum || 0));
  const tags = [...(item.tags || [])];
  const listedNum = listed || Number(data.listedNum || 0);
  if (listedNum > 1500 && !tags.includes("bestseller")) tags.push("bestseller");

  return {
    ...item,
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
  };
}

async function searchStrict(token, item) {
  if (item.pid) {
    const data = await queryPid(token, item.pid);
    if (data) {
      const mapped = await mapHit(token, item, data, Number(data.listedNum || 0));
      if (mapped) return mapped;
    }
  }

  const queries = item.queries ?? [item.q];
  for (const q of queries) {
    for (const page of [1, 2, 3]) {
      await sleep(1100);
      const params = new URLSearchParams({
        page: String(page),
        size: "50",
        keyWord: q,
        countryCode: "US",
        orderBy: "1",
        sort: "desc",
      });
      const list = await fetch(`${API}/product/listV2?${params}`, {
        headers: { "CJ-Access-Token": token },
      }).then((r) => r.json());

      const hits = (list.data?.content || [])
        .flatMap((g) => g.productList || [])
        .sort((a, b) => (b.listedNum || 0) - (a.listedNum || 0));

      for (const hit of hits) {
        if (!hit?.id || usedPids.has(hit.id)) continue;
        if (!okName(hit.nameEn, item.must, item.ban, { all: false })) continue;

        const data = await queryPid(token, hit.id);
        if (!data) continue;
        const mapped = await mapHit(token, item, data, Number(hit.listedNum || 0));
        if (mapped) return mapped;
      }
    }
  }
  return null;
}

for (const item of TARGETS) {
  if (existingSlugs.has(item.slug)) {
    console.log("SKIP exists", item.slug);
    continue;
  }
  const hit = await searchStrict(token, item);
  if (!hit) {
    fail++;
    console.log("FAIL", item.slug);
    continue;
  }
  toAdd.push(hit);
  console.log("OK", item.store, item.slug, `$${hit.price.toFixed(2)}`, hit.images.length, "imgs", hit.variants.length, "vars");
}

if (!toAdd.length) {
  console.log(`Nothing new (${fail} failed).`);
  process.exit(0);
}

const blocks = [];
let idSource = source;
for (const entry of toAdd) {
  const id = assignId(idSource, entry.store);
  idSource += `\nid: "${id}"`;
  blocks.push(buildProductBlock(entry, id));
}

source = source.replace(
  /\n\];\n\nexport function getProductBySlug/,
  `,\n${blocks.join(",\n")}\n];\n\nexport function getProductBySlug`,
);
writeFileSync(productsPath, source);

let variantCatalog = {};
try {
  variantCatalog = JSON.parse(readFileSync(variantsPath, "utf8"));
} catch {
  variantCatalog = {};
}

for (const entry of toAdd) {
  if (entry.variants?.length) {
    variantCatalog[entry.slug] = {
      defaultVariantId: entry.defaultVariantId || entry.cjVid,
      variants: entry.variants,
    };
  }
}
writeFileSync(variantsPath, JSON.stringify(variantCatalog, null, 2));

const byStore = { pet: 0, home: 0, wellness: 0, tech: 0 };
for (const e of toAdd) byStore[e.store]++;
const total = [...source.matchAll(/slug: "/g)].length;

console.log(`\nAdded ${toAdd.length} (${fail} failed)`);
console.log("NEW_BY_STORE", byStore);
console.log("TOTAL", total);

if (mediaWarnings.length) {
  console.log("\n⚠️ MEDIA WARNINGS:");
  for (const w of mediaWarnings) {
    console.log(w.slug, "—", w.messages.join("; "));
  }
}

// Refresh full audit file
execSync("node --env-file=.env.local scripts/audit-catalog-media.mjs", {
  cwd: resolve(__dirname, ".."),
  stdio: "inherit",
});
