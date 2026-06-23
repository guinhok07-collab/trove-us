/**
 * Fix cat-scratching-mat CJ mapping + find 2 more pet products.
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

const productsPath = resolve(__dirname, "../src/data/products.ts");
let source = readFileSync(productsPath, "utf8");
const usedVids = new Set([...source.matchAll(/cjVid: "([^"]+)"/g)].map((m) => m[1]));

const auth = await fetch(`${API}/authentication/getAccessToken`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ apiKey: key }),
}).then((r) => r.json());
const token = auth.data.accessToken;

async function queryPid(pid) {
  await sleep(1200);
  const res = await fetch(`${API}/product/query?pid=${encodeURIComponent(pid)}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());
  return res.result ? res.data : null;
}

async function findOne(q, mustAll, ban) {
  for (const page of [1, 2, 3, 4]) {
    await sleep(1200);
    const p = new URLSearchParams({ page: String(page), size: "40", keyWord: q, countryCode: "US", orderBy: "1", sort: "desc" });
    const list = await fetch(`${API}/product/listV2?${p}`, { headers: { "CJ-Access-Token": token } }).then((r) => r.json());
    for (const hit of (list.data?.content || []).flatMap((g) => g.productList || [])) {
      const n = (hit.nameEn || "").toLowerCase();
      if (ban.some((b) => n.includes(b))) continue;
      if (!mustAll.every((m) => n.includes(m))) continue;
      const data = await queryPid(hit.id);
      if (!data) continue;
      const name = (data.productNameEn || "").toLowerCase();
      if (ban.some((b) => name.includes(b))) continue;
      if (!mustAll.every((m) => name.includes(m))) continue;
      const v = data.variants?.find((x) => Number(x.variantSellPrice) > 0) || data.variants?.[0];
      if (!v?.vid || usedVids.has(v.vid)) continue;
      const imgs = [...new Set([v.variantImage, data.bigImage, ...(data.productImageSet || [])].filter(Boolean))];
      const cost = Number(v.variantSellPrice ?? 0);
      if (imgs.length < 4 || cost > 28) continue;
      usedVids.add(v.vid);
      return { data, v, imgs: imgs.slice(0, 8), cost, listed: hit.listedNum || 0 };
    }
  }
  return null;
}

function retail(cost, ship) {
  const base = cost + ship;
  return Math.min(Math.max(Math.ceil(base / (1 - MARGIN - PAYPAL)) - 0.01, base + 1.5), 39.99);
}

function formatImages(images) {
  return JSON.stringify(images, null, 4)
    .split("\n")
    .map((line, idx) => (idx === 0 ? line : "      " + line.trim()))
    .join("\n");
}

function assignId(src) {
  const nums = [...src.matchAll(/id: "pet-(\d+)"/g)].map((m) => Number(m[1]));
  return `pet-${(nums.length ? Math.max(...nums) : 0) + 1}`;
}

function buildBlock(entry) {
  return `  {
    id: "${entry.id}",
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

// Fix cat-scratching-mat CJ mapping
const mat = await findOne(
  "sisal cat scratching mat pad flat",
  ["sisal", "scratch"],
  ["car seat", "tree", "condo", "tower", "post tall"],
);

if (mat) {
  const price = retail(mat.cost, 4);
  const social = naturalSocialProof("cat-scratching-mat", mat.listed);
  const blockStart = source.indexOf('slug: "cat-scratching-mat"');
  if (blockStart > -1) {
    const before = source.slice(0, blockStart);
    const after = source.slice(blockStart);
    const patched = after
      .replace(/price: [\d.]+/, `price: ${price.toFixed(2)}`)
      .replace(/compareAtPrice: [\d.]+/, `compareAtPrice: ${(Math.ceil(price * 1.1) - 0.01).toFixed(2)}`)
      .replace(/image: "[^"]+"/, `image: ${JSON.stringify(mat.imgs[0])}`)
      .replace(/images: \[[\s\S]*?\n      \]/, `images: ${formatImages(mat.imgs)}`)
      .replace(/supplierSku: "[^"]+"/, `supplierSku: ${JSON.stringify(mat.data.productSku)}`)
      .replace(/cjVid: "[^"]+"/, `cjVid: ${JSON.stringify(mat.v.vid)}`)
      .replace(/cjSku: "[^"]+"/, `cjSku: ${JSON.stringify(mat.v.variantSku)}`)
      .replace(/rating: [\d.]+/, `rating: ${social.rating}`)
      .replace(/reviews: \d+/, `reviews: ${social.reviews}`)
      .replace(/sold: \d+/, `sold: ${social.sold}`);
    source = before + patched;
    writeFileSync(productsPath, source);
    console.log("FIX MAT", mat.data.productNameEn.slice(0, 65));
  }
}

// Add 2 more if found
const ADDS = [
  {
    slug: "pet-car-seat-cover",
    q: "dog car back seat cover waterproof oxford",
    mustAll: ["car", "seat cover"],
    ban: ["baby", "vevor", "scratch", "organizer tray"],
    ship: 5.5,
    name: "Waterproof Dog Car Seat Cover",
    description: "Back-seat cover protects upholstery from fur, mud, and scratches.",
    longDescription:
      "Keep your back seat clean on road trips with a waterproof cover that blocks claws, drool, and muddy paws. Adjustable straps hook to headrests for a secure fit in most sedans and SUVs. Wipe down between adventures. Ships from our US warehouse in 3–5 business days.",
    features: ["Waterproof oxford", "Headrest straps", "Universal fit", "Easy wipe clean"],
    tags: [],
  },
  {
    slug: "pet-deshedding-tool",
    q: "pet shedding brush undercoat dematting rake",
    mustAll: ["shedding", "brush"],
    ban: ["glove", "vacuum", "mitt", "steam"],
    ship: 3.5,
    name: "Pet De-Shedding Brush",
    description: "Lifts loose undercoat to reduce shedding on furniture.",
    longDescription:
      "Glide through topcoat to remove loose fur before it spreads through the house. Stainless teeth reach undercoat gently on dogs and cats with thick coats. Ergonomic handle for weekly grooming sessions at home. Ships from our US warehouse in 3–5 business days.",
    features: ["Undercoat reach", "Stainless teeth", "Ergonomic grip", "Weekly grooming"],
    tags: [],
  },
];

source = readFileSync(productsPath, "utf8");
const blocks = [];

for (const item of ADDS) {
  if (source.includes(`slug: "${item.slug}"`)) {
    console.log("SKIP exists", item.slug);
    continue;
  }
  const hit = await findOne(item.q, item.mustAll, item.ban);
  if (!hit) {
    console.log("FAIL", item.slug);
    continue;
  }
  const price = retail(hit.cost, item.ship);
  const social = naturalSocialProof(item.slug, hit.listed);
  const id = assignId(source + blocks.join("\n"));
  blocks.push(
    buildBlock({
      id,
      slug: item.slug,
      name: item.name,
      description: item.description,
      longDescription: item.longDescription,
      price,
      compareAtPrice: Math.ceil(price * 1.1) - 0.01,
      image: hit.imgs[0],
      images: hit.imgs,
      tags: item.tags,
      features: item.features,
      supplierSku: hit.data.productSku,
      cjVid: hit.v.vid,
      cjSku: hit.v.variantSku,
      ...social,
    }),
  );
  console.log("ADD", item.slug, hit.data.productNameEn.slice(0, 60));
}

if (blocks.length) {
  source = readFileSync(productsPath, "utf8");
  source = source.replace(/\n\];\n\nexport function getProductBySlug/, `,\n${blocks.join(",\n")}\n];\n\nexport function getProductBySlug`);
  writeFileSync(productsPath, source);
}

const petCount = [...source.matchAll(/store: "pet"/g)].length;
console.log("PET_COUNT", petCount);
