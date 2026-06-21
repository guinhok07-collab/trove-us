import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { naturalSocialProof } from "./social-proof.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TARGET_MARGIN = 0.2;
const PAYPAL_RATE = 0.034;

const picks = [
  { slug: "slow-feeder-dog-bowl", store: "pet", pid: "1965609539311882242", ship: 4 },
  { slug: "foam-roller-recovery", store: "wellness", pid: "1907995653323227138", ship: 5, skip: true },
  { slug: "ergonomic-wrist-rest", store: "tech", q: "memory foam keyboard wrist rest pad", must: ["keyboard", "wrist"], ban: ["watch", "nail", "gel nail"], ship: 3.5 },
  { slug: "drawer-organizer-set", store: "home", q: "adjustable drawer organizer dividers plastic", must: ["drawer organizer"], ban: ["shoe rack", "bathroom sink"], ship: 4 },
];

function retailPrice(cost, shipping) {
  const base = cost + shipping;
  return Math.max(Math.ceil(base / (1 - TARGET_MARGIN - PAYPAL_RATE)) - 0.01, base + 1.5);
}
function compareAt(s) { return Math.ceil(s * 1.1) - 0.01; }

function okName(name, must, ban) {
  const n = (name || "").toLowerCase();
  if (ban.some((b) => n.includes(b))) return false;
  return must.every((m) => n.includes(m.toLowerCase()));
}

async function getToken() {
  const auth = await fetch(`${API}/authentication/getAccessToken`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: key }),
  }).then((r) => r.json());
  return auth.data.accessToken;
}

async function queryPid(token, pid) {
  await sleep(1300);
  const res = await fetch(`${API}/product/query?pid=${encodeURIComponent(pid)}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());
  return res.result ? res.data : null;
}

async function search(token, item) {
  await sleep(1300);
  const p = new URLSearchParams({ page: "1", size: "30", keyWord: item.q, countryCode: "US", orderBy: "1", sort: "desc" });
  const list = await fetch(`${API}/product/listV2?${p}`, { headers: { "CJ-Access-Token": token } }).then((r) => r.json());
  const prods = (list.data?.content || []).flatMap((g) => g.productList || []);
  for (const hit of prods) {
    if (!okName(hit.nameEn, item.must, item.ban)) continue;
    const data = await queryPid(token, hit.id);
    if (data?.variants?.[0]?.vid) return data;
  }
  return null;
}

function map(slug, store, data, ship) {
  const v = data.variants.find((x) => Number(x.variantSellPrice) > 0) || data.variants[0];
  const cost = Number(v.variantSellPrice ?? data.sellPrice ?? 0);
  const price = retailPrice(cost, ship);
  const images = (data.productImageSet?.length ? data.productImageSet : [data.bigImage]).slice(0, 7);
  const image = v.variantImage || images[0];
  if (image && !images.includes(image)) images.unshift(image);
  const listed = Number(data.listedNum || 0);
  return {
    slug, store, pid: data.pid, name: data.productNameEn, supplierSku: data.productSku,
    cjVid: v.vid, cjSku: v.variantSku, image, images, cost, shippingEst: ship, price,
    compareAtPrice: compareAt(price), listedNum: listed, ...naturalSocialProof(slug, listed),
    variantLabel: v.variantKey || v.variantNameEn,
  };
}

const token = await getToken();
const existing = JSON.parse(readFileSync(resolve(__dirname, "cj-expand-results.json"), "utf8"));

for (const item of picks) {
  if (item.skip) continue;
  const data = item.pid ? await queryPid(token, item.pid) : await search(token, item);
  if (!data) { console.log("FAIL", item.slug); continue; }
  const mapped = map(item.slug, item.store, data, item.ship);
  existing[item.slug] = mapped;
  console.log("OK", item.slug, mapped.name.slice(0, 60));
}

writeFileSync(resolve(__dirname, "cj-expand-results.json"), JSON.stringify(existing, null, 2));
