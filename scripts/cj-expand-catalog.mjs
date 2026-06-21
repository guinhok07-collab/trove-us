/**
 * Search CJ for new catalog items (US warehouse, verified vid).
 * Usage: npx vercel env run --environment=production -- node scripts/cj-expand-catalog.mjs
 */
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { naturalSocialProof } from "./social-proof.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
if (!key) throw new Error("Set CJ_API_KEY");

const TARGET_MARGIN = 0.2;
const PAYPAL_RATE = 0.034;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const newItems = [
  { slug: "closet-organizer-6-shelf", store: "home", pid: "1876836104507744257", ship: 4.5 },
  {
    slug: "hanging-closet-shelves",
    store: "home",
    q: "6 layers hanging closet organizer shelf",
    must: ["closet", "organizer"],
    ban: ["car", "vehicle", "cosmetic bag", "travel bag", "shoe rack only"],
    ship: 4,
  },
  {
    slug: "under-bed-storage-bags",
    store: "home",
    q: "under bed storage bags zippered",
    must: ["storage", "bag"],
    ban: ["vacuum", "backpack", "lunch"],
    ship: 4,
  },
  {
    slug: "reusable-silicone-lids",
    store: "home",
    q: "reusable silicone stretch lids bowl covers",
    must: ["silicone", "lid"],
    ban: ["phone", "watch"],
    ship: 3.5,
  },
  {
    slug: "automatic-pet-feeder",
    store: "pet",
    q: "automatic pet feeder timer dog cat",
    must: ["feeder"],
    ban: ["water fountain", "fountain only"],
    ship: 5,
  },
  {
    slug: "pet-hair-remover-roller",
    store: "pet",
    q: "pet hair remover roller reusable",
    must: ["hair remover", "lint roller"],
    ban: ["vacuum", "glove only"],
    ship: 3.5,
  },
  {
    slug: "cat-scratching-mat",
    store: "pet",
    q: "cat scratching mat sisal board",
    must: ["scratch"],
    ban: ["tree", "tower", "condo"],
    ship: 4,
  },
  {
    slug: "foam-roller-recovery",
    store: "wellness",
    q: "EVA foam roller yoga 45cm",
    must: ["foam roller"],
    ban: ["electric", "massage gun", "neck massager"],
    ship: 4.5,
  },
  {
    slug: "sleep-eye-mask",
    store: "wellness",
    q: "sleep mask silk light blocking",
    must: ["sleep mask", "eye mask"],
    ban: ["vr", "bluetooth"],
    ship: 3.5,
  },
  {
    slug: "portable-neck-fan",
    store: "wellness",
    q: "portable neck fan rechargeable bladeless",
    must: ["neck fan", "portable fan"],
    ban: ["ceiling", "desk lamp"],
    ship: 4,
  },
  {
    slug: "ergonomic-wrist-rest",
    store: "tech",
    q: "keyboard wrist rest memory foam gel",
    must: ["wrist rest", "wrist pad"],
    ban: ["watch", "mouse pad only"],
    ship: 3.5,
  },
  {
    slug: "adjustable-phone-stand",
    store: "tech",
    q: "adjustable phone tablet stand desk aluminum",
    must: ["phone stand", "tablet stand"],
    ban: ["car mount", "ring light"],
    ship: 3.5,
  },
];

function okName(name, must, ban) {
  const n = (name || "").toLowerCase();
  if (ban.some((b) => n.includes(b))) return false;
  return must.some((m) => n.includes(m.toLowerCase()));
}

function retailPrice(cost, shipping) {
  const base = cost + shipping;
  const raw = base / (1 - TARGET_MARGIN - PAYPAL_RATE);
  return Math.max(Math.ceil(raw) - 0.01, base + 1.5);
}

function compareAt(sell) {
  return Math.ceil(sell * 1.1) - 0.01;
}

async function getToken() {
  const auth = await fetch(`${API}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: key }),
  }).then((r) => r.json());
  if (!auth.result) throw new Error(auth.message);
  return auth.data.accessToken;
}

async function queryPid(token, pid) {
  await sleep(1300);
  const res = await fetch(`${API}/product/query?pid=${encodeURIComponent(pid)}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());
  return res.result ? res.data : null;
}

async function searchOne(token, item) {
  await sleep(1300);
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
  const hit = products.find((p) => okName(p.nameEn, item.must, item.ban));
  if (!hit?.id) return null;
  return queryPid(token, hit.id);
}

function mapProduct(slug, store, data, ship) {
  const variants = data.variants || [];
  const variant = variants.find((v) => Number(v.variantSellPrice) > 0) || variants[0];
  if (!variant?.vid) return null;

  const cost = Number(variant.variantSellPrice ?? data.sellPrice ?? 0);
  const price = retailPrice(cost, ship);
  const images = (data.productImageSet?.length ? data.productImageSet : [data.bigImage]).slice(0, 7);
  const image = variant.variantImage || images[0] || data.bigImage;
  if (image && !images.includes(image)) images.unshift(image);

  const listed = Number(data.listedNum || 0);
  const social = naturalSocialProof(slug, listed);

  return {
    slug,
    store,
    pid: data.pid,
    name: data.productNameEn,
    supplierSku: data.productSku,
    cjVid: variant.vid,
    cjSku: variant.variantSku,
    image,
    images,
    cost,
    shippingEst: ship,
    price,
    compareAtPrice: compareAt(price),
    listedNum: listed,
    ...social,
    variantLabel: variant.variantKey || variant.variantNameEn,
  };
}

const token = await getToken();
const out = {};

for (const item of newItems) {
  let data = null;
  if (item.pid) {
    data = await queryPid(token, item.pid);
  } else {
    data = await searchOne(token, item);
  }

  if (!data) {
    console.log("FAIL", item.slug);
    continue;
  }

  const mapped = mapProduct(item.slug, item.store, data, item.ship);
  if (!mapped) {
    console.log("NO VID", item.slug);
    continue;
  }

  out[item.slug] = mapped;
  console.log("OK", item.slug, `$${mapped.price}`, mapped.cjVid?.slice(0, 12));
}

writeFileSync(resolve(__dirname, "cj-expand-results.json"), JSON.stringify(out, null, 2));
console.log("Saved", Object.keys(out).length, "products");
