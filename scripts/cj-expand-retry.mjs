/** Retry failed / wrong CJ product searches with stricter matching. */
import { writeFileSync, readFileSync } from "fs";
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

const retries = [
  {
    slug: "drawer-organizer-set",
    store: "home",
    q: "bamboo drawer organizer adjustable dividers kitchen",
    must: ["drawer organizer", "drawer dividers"],
    ban: ["sock", "underwear only", "makeup bag"],
    ship: 4,
  },
  {
    slug: "slow-feeder-dog-bowl",
    store: "pet",
    q: "slow feeder dog bowl anti choke maze",
    must: ["slow feeder", "dog bowl"],
    ban: ["cat tree", "automatic feeder"],
    ship: 4,
  },
  {
    slug: "foam-roller-recovery",
    store: "wellness",
    q: "high density foam roller 45cm yoga muscle",
    must: ["foam roller"],
    ban: ["gun", "electric", "vibration", "ball set only"],
    ship: 4.5,
  },
  {
    slug: "ergonomic-wrist-rest",
    store: "tech",
    q: "ergonomic keyboard wrist rest pad memory foam",
    must: ["wrist rest"],
    ban: ["mouse pad large", "gaming desk", "watch"],
    ship: 3.5,
  },
  {
    slug: "mini-bluetooth-speaker",
    store: "tech",
    q: "mini bluetooth speaker portable wireless waterproof",
    must: ["bluetooth speaker", "speaker"],
    ban: ["earbuds", "headphone", "soundbar"],
    ship: 3.5,
  },
  {
    slug: "resistance-loop-bands",
    store: "wellness",
    q: "resistance loop bands set fitness booty",
    must: ["resistance band", "loop band"],
    ban: ["yoga mat only", "pull up bar"],
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
    size: "50",
    keyWord: item.q,
    countryCode: "US",
    orderBy: "1",
    sort: "desc",
  });
  const list = await fetch(`${API}/product/listV2?${params}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());
  const products = (list.data?.content || []).flatMap((g) => g.productList || []);
  for (const p of products) {
    if (!okName(p.nameEn, item.must, item.ban)) continue;
    const data = await queryPid(token, p.id);
    const v = data?.variants?.find((x) => Number(x.variantSellPrice) > 0) || data?.variants?.[0];
    if (data && v?.vid) return data;
  }
  return null;
}

function mapProduct(slug, store, data, ship) {
  const variant = data.variants?.find((v) => Number(v.variantSellPrice) > 0) || data.variants?.[0];
  if (!variant?.vid) return null;
  const cost = Number(variant.variantSellPrice ?? data.sellPrice ?? 0);
  const price = retailPrice(cost, ship);
  const images = (data.productImageSet?.length ? data.productImageSet : [data.bigImage]).slice(0, 7);
  const image = variant.variantImage || images[0] || data.bigImage;
  if (image && !images.includes(image)) images.unshift(image);
  const listed = Number(data.listedNum || 0);
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
    ...naturalSocialProof(slug, listed),
    variantLabel: variant.variantKey || variant.variantNameEn,
  };
}

const token = await getToken();
const existing = JSON.parse(readFileSync(resolve(__dirname, "cj-expand-results.json"), "utf8"));

for (const item of retries) {
  const data = await searchOne(token, item);
  if (!data) {
    console.log("FAIL", item.slug);
    continue;
  }
  const mapped = mapProduct(item.slug, item.store, data, item.ship);
  existing[item.slug] = mapped;
  console.log("OK", item.slug, mapped.name.slice(0, 55));
}

delete existing["hanging-closet-shelves"];
delete existing["reusable-silicone-lids"];
delete existing["portable-neck-fan"];

writeFileSync(resolve(__dirname, "cj-expand-results.json"), JSON.stringify(existing, null, 2));
console.log("Total", Object.keys(existing).length);
