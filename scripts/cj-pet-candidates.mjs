/**
 * Search CJ for 8 pet impulse products — outputs JSON for apply-pet-impulse.mjs
 */
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PAYPAL = 0.034;
const MARGIN = 0.2;

const SEARCH = [
  { slug: "pet-silicone-food-mat", q: "silicone pet food mat placemat bowl", must: ["mat"], ban: ["dog bed", "sofa", "car seat"], ship: 3.5 },
  { slug: "dog-treat-pouch", q: "dog treat pouch training belt clip", must: ["treat", "pouch"], ban: ["backpack", "harness set"], ship: 3.5 },
  { slug: "cat-feather-teaser", q: "cat feather teaser wand toy interactive", must: ["feather", "wand"], ban: ["dog harness"], ship: 3.5 },
  { slug: "portable-pet-water-bottle", q: "portable dog water bottle cup travel", must: ["water", "bottle"], ban: ["fountain", "dispenser 2l"], ship: 4 },
  { slug: "pet-stainless-bowl-set", q: "stainless steel pet bowl dog cat", must: ["bowl", "stainless"], ban: ["slow feeder maze only"], ship: 4 },
  { slug: "pet-grooming-gloves", q: "pet grooming glove hair remover cat dog", must: ["glove"], ban: ["shampoo", "dryer"], ship: 3.5 },
  { slug: "dog-bandana-set", q: "dog bandana adjustable collar scarf", must: ["bandana"], ban: ["christmas tree", "human"], ship: 3.5 },
  { slug: "pet-waste-bag-refills", q: "dog poop bag rolls refill biodegradable", must: ["bag", "roll"], ban: ["dispenser only", "leash"], ship: 3.5 },
];

function okName(name, must, ban) {
  const n = (name || "").toLowerCase();
  if (ban.some((b) => n.includes(b))) return false;
  return must.every((m) => n.includes(m.toLowerCase()));
}

function retailPrice(cost, ship) {
  const base = cost + ship;
  return Math.max(Math.ceil(base / (1 - MARGIN - PAYPAL)) - 0.01, base + 1.5);
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
  await sleep(900);
  const res = await fetch(`${API}/product/query?pid=${encodeURIComponent(pid)}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());
  return res.result ? res.data : null;
}

async function searchItem(token, item) {
  const seen = new Map();
  for (const page of [1, 2, 3]) {
    await sleep(900);
    const p = new URLSearchParams({ page: String(page), size: "35", keyWord: item.q, orderBy: "1", sort: "desc" });
    const list = await fetch(`${API}/product/listV2?${p}`, { headers: { "CJ-Access-Token": token } }).then((r) => r.json());
    for (const hit of (list.data?.content || []).flatMap((g) => g.productList || [])) {
      if (!okName(hit.nameEn, item.must, item.ban)) continue;
      const s = (hit.listedNum || 0) / 1000;
      if (!seen.has(hit.id) || s > seen.get(hit.id).s) seen.set(hit.id, { hit, s });
    }
  }
  for (const { hit } of [...seen.values()].sort((a, b) => b.s - a.s).slice(0, 10)) {
    const data = await queryPid(token, hit.id);
    const v = data?.variants?.find((x) => Number(x.variantSellPrice) > 0) || data?.variants?.[0];
    if (!v?.vid) continue;
    const cost = Number(v.variantSellPrice ?? data.sellPrice ?? 0);
    if (cost < 0.5 || cost > 12) continue;
    const price = retailPrice(cost, item.ship);
    if (price > 22) continue;
    const images = [...new Set([v.variantImage, data.productImage, ...(data.productImageSet || [])].filter(Boolean))].slice(0, 8);
    return {
      slug: item.slug,
      pid: data.pid,
      ship: item.ship,
      cost,
      price,
      cjName: data.productNameEn,
      supplierSku: data.productSku,
      cjVid: v.vid,
      cjSku: v.variantSku,
      image: images[0],
      images,
      listedNum: data.listedNum,
    };
  }
  return null;
}

if (!key) throw new Error("Set CJ_API_KEY");
const token = await getToken();
const out = {};
for (const item of SEARCH) {
  const found = await searchItem(token, item);
  if (found) {
    out[item.slug] = found;
    console.log("OK", item.slug, `$${found.cost.toFixed(2)} → $${found.price.toFixed(2)}`, found.cjName.slice(0, 50));
  } else {
    console.log("FAIL", item.slug);
  }
}
writeFileSync(resolve(__dirname, "cj-pet-candidates.json"), JSON.stringify(out, null, 2));
console.log("Wrote cj-pet-candidates.json", Object.keys(out).length, "items");
