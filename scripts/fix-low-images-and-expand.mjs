/**
 * Fix products with <4 images + add vetted picks from search (strict name check).
 * Usage: node --env-file=.env.local scripts/fix-low-images-and-expand.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { naturalSocialProof } from "./social-proof.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
const MARGIN = 0.2;
const PAYPAL = 0.034;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const FIX_SLUGS = [
  { slug: "sleep-eye-mask", q: "3d contoured sleep eye mask blackout", must: ["sleep mask", "eye mask"], ban: ["wireless", "bluetooth", "cream"] },
  { slug: "gaming-mouse-pad-large", q: "large gaming mouse pad desk mat xl", must: ["mouse pad"], ban: ["mouse only"] },
  { slug: "smartwatch-band-silicone", q: "silicone smart watch band sport", must: ["watch band"], ban: ["smart watch device"] },
  { slug: "silicone-stove-gap-cover", q: "silicone stove gap cover counter", must: ["gap cover", "stove"], ban: ["phone"] },
];

const ADD = [
  {
    slug: "kitchen-sink-sponge-holder",
    store: "home",
    pid: "2057741404649218050",
    ship: 3.5,
    name: "Kitchen Sink Sponge & Soap Holder",
    description: "Drain rack keeps sponges, soap, and brushes tidy by the sink.",
    longDescription:
      "Clear counter clutter with a sink-side caddy that drains water away from sponges and dish soap. Holds brushes and scrubbers in one spot for faster cleanup after meals. Rust-resistant finish suits everyday kitchen use. Ships from our US warehouse in 3–5 business days.",
    features: ["Drain tray design", "Sponge & soap slots", "Rust resistant", "Compact sink fit"],
    tags: [],
  },
  {
    slug: "pet-self-cleaning-slicker",
    store: "pet",
    pid: "1555107261428736000",
    ship: 3.5,
    name: "Self-Cleaning Pet Slicker Brush",
    description: "One-button clean removes trapped fur from the brush instantly.",
    longDescription:
      "Groom dogs and cats faster with a slicker brush that releases collected hair at the push of a button. Fine bristles reach undercoat while rounded tips protect skin. A daily essential for shedding season. Ships from our US warehouse in 3–5 business days.",
    features: ["Self-clean button", "Undercoat bristles", "Skin-safe tips", "Dogs & cats"],
    tags: ["bestseller"],
  },
];

function parseImages(data, variant) {
  const raw = [];
  const push = (v) => {
    if (!v) return;
    if (Array.isArray(v)) return v.forEach(push);
    if (typeof v === "string") {
      if (v.startsWith("http")) raw.push(v);
      else if (v.startsWith("[")) {
        try {
          push(JSON.parse(v));
        } catch {
          /* ignore */
        }
      }
    }
  };
  push(variant?.variantImage);
  push(data?.bigImage);
  push(data?.productImageSet);
  push(data?.productImage);
  return [...new Set(raw.filter((u) => u.startsWith("http")))].slice(0, 10);
}

function okName(name, must, ban) {
  const n = (name || "").toLowerCase();
  if (ban.some((b) => n.includes(b))) return false;
  return must.some((m) => n.includes(m.toLowerCase()));
}

function formatImages(images) {
  return JSON.stringify(images, null, 4)
    .split("\n")
    .map((line, idx) => (idx === 0 ? line : "      " + line.trim()))
    .join("\n");
}

function patchMedia(block, { image, images, video }) {
  let b = block.replace(/image: "[^"]+"/, `image: ${JSON.stringify(image)}`);
  b = b.replace(/images: \[[\s\S]*?\]/, `images: ${formatImages(images)}`);
  if (video) {
    if (/video: /.test(b)) b = b.replace(/video: "[^"]+"/, `video: ${JSON.stringify(video)}`);
    else b = b.replace(/(images: \[[\s\S]*?\],)\n/, `$1\n    video: ${JSON.stringify(video)},\n`);
  }
  return b;
}

function retail(cost, ship) {
  const base = cost + ship;
  return Math.max(Math.ceil(base / (1 - MARGIN - PAYPAL)) - 0.01, base + 1.5);
}

function assignId(src, store) {
  const prefix = store === "wellness" ? "well" : store === "tech" ? "tech" : store;
  const nums = [...src.matchAll(new RegExp(`id: "${prefix}-(\\d+)"`, "g"))].map((m) => Number(m[1]));
  return `${prefix}-${(nums.length ? Math.max(...nums) : 0) + 1}`;
}

function buildBlock(entry, id) {
  const videoLine = entry.video ? `\n    video: ${JSON.stringify(entry.video)},` : "";
  return `  {
    id: "${id}",
    slug: "${entry.slug}",
    name: ${JSON.stringify(entry.name)},
    description: ${JSON.stringify(entry.description)},
    longDescription:
      ${JSON.stringify(entry.longDescription)},
    price: ${entry.price.toFixed(2)},
    compareAtPrice: ${entry.compareAtPrice.toFixed(2)},
    store: "${entry.store}",
    image: ${JSON.stringify(entry.image)},
    images: ${formatImages(entry.images)},${videoLine}
    rating: ${entry.rating},
    reviews: ${entry.reviews},
    sold: ${entry.sold},
    inStock: true,
    shippingDays: "3–5 days",
    warehouse: "US",
    tags: ${JSON.stringify(entry.tags || [])},
    features: ${JSON.stringify(entry.features)},
    supplierSku: ${JSON.stringify(entry.supplierSku)},
    cjVid: ${JSON.stringify(entry.cjVid)},
    cjSku: ${JSON.stringify(entry.cjSku)}
  }`;
}

async function getToken() {
  const auth = await fetch(`${API}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: key }),
  }).then((r) => r.json());
  return auth.data.accessToken;
}

async function queryPid(token, pid) {
  await sleep(1200);
  const res = await fetch(`${API}/product/query?pid=${encodeURIComponent(pid)}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());
  return res.result ? res.data : null;
}

async function searchFix(token, item) {
  await sleep(1200);
  const params = new URLSearchParams({
    page: "1",
    size: "40",
    keyWord: item.q,
    countryCode: "US",
    orderBy: "1",
    sort: "desc",
  });
  const list = await fetch(`${API}/product/listV2?${params}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());
  const products = (list.data?.content || []).flatMap((g) => g.productList || []);
  for (const hit of products) {
    if (!okName(hit.nameEn, item.must, item.ban)) continue;
    const data = await queryPid(token, hit.id);
    if (!data) continue;
    const v = data.variants?.find((x) => Number(x.variantSellPrice) > 0) || data.variants?.[0];
    const images = parseImages(data, v);
    if (images.length < 4) continue;
    return { data, variant: v, images };
  }
  return null;
}

const path = resolve(__dirname, "../src/data/products.ts");
let source = readFileSync(path, "utf8");
const token = await getToken();
const existingVids = new Set([...source.matchAll(/cjVid: "([^"]+)"/g)].map((m) => m[1]));

for (const item of FIX_SLUGS) {
  const hit = await searchFix(token, item);
  if (!hit) {
    console.log("FIX FAIL", item.slug);
    continue;
  }
  const slugIdx = source.indexOf(`slug: "${item.slug}"`);
  const blockStart = source.lastIndexOf("\n  {", slugIdx);
  const blockEnd = source.indexOf("\n  }", slugIdx);
  const block = source.slice(blockStart, blockEnd);
  const video =
    typeof hit.data.productVideo === "string" && hit.data.productVideo.startsWith("http")
      ? hit.data.productVideo
      : undefined;
  const patched = patchMedia(block, { image: hit.images[0], images: hit.images, video });
  let withCj = patched
    .replace(/supplierSku: "[^"]+"/, `supplierSku: ${JSON.stringify(hit.data.productSku)}`)
    .replace(/cjVid: "[^"]+"/, `cjVid: ${JSON.stringify(hit.variant.vid)}`)
    .replace(/cjSku: "[^"]+"/, `cjSku: ${JSON.stringify(hit.variant.variantSku)}`);
  source = source.slice(0, blockStart) + withCj + source.slice(blockEnd);
  console.log("FIXED", item.slug, hit.images.length, "imgs");
}

const toAdd = [];
for (const pick of ADD) {
  if (source.includes(`slug: "${pick.slug}"`)) {
    console.log("SKIP exists", pick.slug);
    continue;
  }
  const data = await queryPid(token, pick.pid);
  if (!data) {
    console.log("ADD FAIL", pick.slug);
    continue;
  }
  const v = data.variants?.find((x) => Number(x.variantSellPrice) > 0) || data.variants?.[0];
  if (!v?.vid || existingVids.has(v.vid)) {
    console.log("ADD SKIP vid", pick.slug);
    continue;
  }
  const images = parseImages(data, v);
  if (images.length < 4) {
    console.log("ADD SKIP imgs", pick.slug, images.length);
    continue;
  }
  const cost = Number(v.variantSellPrice ?? 0);
  const price = retail(cost, pick.ship);
  const social = naturalSocialProof(pick.slug, Number(data.listedNum || 0));
  const video =
    typeof data.productVideo === "string" && data.productVideo.startsWith("http")
      ? data.productVideo
      : undefined;
  toAdd.push({
    ...pick,
    image: images[0],
    images,
    video,
    price,
    compareAtPrice: Math.ceil(price * 1.1) - 0.01,
    supplierSku: data.productSku,
    cjVid: v.vid,
    cjSku: v.variantSku,
    ...social,
  });
  existingVids.add(v.vid);
  console.log("ADD", pick.slug, images.length, "imgs");
}

if (toAdd.length) {
  const blocks = [];
  let idSrc = source;
  for (const e of toAdd) {
    const id = assignId(idSrc, e.store);
    idSrc += `\nid: "${id}"`;
    blocks.push(buildBlock(e, id));
  }
  source = source.replace(/\n\];\n\nexport function getProductBySlug/, `,\n${blocks.join(",\n")}\n];\n\nexport function getProductBySlug`);
}

writeFileSync(path, source);
console.log("Done. Added", toAdd.length);
