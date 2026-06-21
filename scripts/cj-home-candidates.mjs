/**
 * Harvest Home category candidates — cost + margin check, skip existing slugs/themes
 * Usage: node --env-file=.env.local scripts/cj-home-candidates.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PAYPAL = 0.034;
const MARGIN = 0.2;

const SEARCH = [
  { theme: "drawer-divider-bamboo", q: "bamboo drawer divider adjustable kitchen", must: ["drawer"], ban: ["makeup", "cosmetic", "luggage", "travel bag", "pill"], ship: 4 },
  { theme: "pot-lid-organizer", q: "pot lid organizer rack cabinet kitchen", must: ["lid"], ban: ["tumbler", "trash can", "smart trash"], ship: 4 },
  { theme: "fridge-organizer-bins", q: "refrigerator organizer bins stackable", must: ["refrigerator", "fridge"], ban: ["egg only", "dog"], ship: 4 },
  { theme: "dish-drying-rack-roll", q: "roll up dish drying rack sink", must: ["drying", "rack"], ban: ["dog bath", "pet"], ship: 4 },
  { theme: "silicone-stove-gap-cover", q: "silicone stove gap cover counter", must: ["stove", "gap"], ban: ["phone"], ship: 3.5 },
  { theme: "under-shelf-basket", q: "under shelf storage basket hanging", must: ["shelf", "basket"], ban: ["pet", "dog"], ship: 4 },
  { theme: "mason-jar-lids-storage", q: "mason jar storage lids pantry", must: ["jar"], ban: ["ring light", "lamp"], ship: 3.5 },
  { theme: "reusable-produce-bags", q: "reusable mesh produce bags grocery", must: ["produce", "bag"], ban: ["dog poop", "pet"], ship: 3.5 },
  { theme: "cabinet-door-organizer", q: "cabinet door organizer spice rack inside", must: ["cabinet", "door"], ban: ["car door"], ship: 4 },
  { theme: "sink-splash-guard", q: "kitchen sink splash guard silicone", must: ["sink", "splash"], ban: ["pet", "dog bath"], ship: 3.5 },
  { theme: "pan-organizer-rack", q: "pan organizer rack vertical cabinet", must: ["pan", "organizer"], ban: ["air fryer machine"], ship: 5 },
  { theme: "cutting-board-set", q: "cutting board set plastic kitchen", must: ["cutting board"], ban: ["cheese board gift"], ship: 4.5 },
  { theme: "dish-soap-dispenser", q: "automatic dish soap dispenser kitchen", must: ["soap", "dispenser"], ban: ["hand sanitizer wall"], ship: 4 },
  { theme: "towel-rack-adhesive", q: "towel rack adhesive bathroom wall", must: ["towel"], ban: ["car", "pet"], ship: 4 },
  { theme: "lazy-susan-cabinet", q: "lazy susan turntable cabinet pantry", must: ["lazy susan", "turntable"], ban: ["toy", "pet"], ship: 4.5 },
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

function scoreName(name, must) {
  const n = (name || "").toLowerCase();
  return must.filter((m) => n.includes(m.toLowerCase())).length;
}

async function getToken() {
  const auth = await fetch(`${API}/authentication/getAccessToken`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: key }),
  }).then((r) => r.json());
  return auth.data.accessToken;
}

async function queryPid(token, pid) {
  await sleep(1000);
  const res = await fetch(`${API}/product/query?pid=${encodeURIComponent(pid)}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());
  return res.result ? res.data : null;
}

async function searchItem(token, item) {
  const seen = new Map();
  for (const page of [1, 2, 3]) {
    await sleep(1000);
    const p = new URLSearchParams({ page: String(page), size: "35", keyWord: item.q, orderBy: "1", sort: "desc" });
    const list = await fetch(`${API}/product/listV2?${p}`, { headers: { "CJ-Access-Token": token } }).then((r) => r.json());
    for (const hit of (list.data?.content || []).flatMap((g) => g.productList || [])) {
      if (!okName(hit.nameEn, item.must, item.ban)) continue;
      const s = scoreName(hit.nameEn, item.must) + (hit.listedNum || 0) / 10000;
      if (!seen.has(hit.id) || s > seen.get(hit.id).s) seen.set(hit.id, { hit, s });
    }
  }
  const ranked = [...seen.values()].sort((a, b) => b.s - a.s);
  for (const { hit } of ranked.slice(0, 8)) {
    const data = await queryPid(token, hit.id);
    const v = data?.variants?.find((x) => Number(x.variantSellPrice) > 0) || data?.variants?.[0];
    if (!v?.vid) continue;
    const cost = Number(v.variantSellPrice ?? data.sellPrice ?? 0);
    if (cost < 0.8 || cost > 14) continue;
    const price = retailPrice(cost, item.ship);
    if (price > 35) continue;
    const images = (data.productImageSet?.length ? data.productImageSet : [data.bigImage]).slice(0, 8);
    const image = v.variantImage || images[0];
    return {
      theme: item.theme,
      pid: data.pid,
      cjName: data.productNameEn,
      supplierSku: data.productSku,
      cjVid: v.vid,
      cjSku: v.variantSku,
      image,
      images,
      cost,
      ship: item.ship,
      price,
      compareAtPrice: Math.ceil(price * 1.12) - 0.01,
      listedNum: Number(data.listedNum || 0),
    };
  }
  return null;
}

const productsText = readFileSync(resolve(__dirname, "../src/data/products.ts"), "utf8");
const existingNames = [...productsText.matchAll(/name: "([^"]+)"/g)].map((m) => m[1].toLowerCase());
const existingSlugs = new Set([...productsText.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]));

const token = await getToken();
const found = [];
const failed = [];

for (const item of SEARCH) {
  if (existingSlugs.has(item.theme)) {
    console.log("SKIP exists", item.theme);
    continue;
  }
  const mapped = await searchItem(token, item);
  if (mapped) {
    found.push(mapped);
    console.log("OK", item.theme, "$" + mapped.cost.toFixed(2), "→", "$" + mapped.price.toFixed(2), mapped.cjName.slice(0, 50));
  } else {
    failed.push(item.theme);
    console.log("FAIL", item.theme);
  }
}

writeFileSync(resolve(__dirname, "cj-home-candidates.json"), JSON.stringify({ found, failed }, null, 2));
console.log(`\n${found.length} candidates saved to scripts/cj-home-candidates.json`);
