/**
 * Second-pass harvest for failed pet slots — extra strict validation.
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const FIXED = {
  "automatic-pet-feeder": "1602564551227224064",
};

const SEARCH = [
  {
    slug: "pet-deshedding-tool",
    q: "deshedding tool pet undercoat rake fur",
    mustAll: ["deshed"],
    ban: ["vacuum", "glove", "roller lint"],
    ship: 3.5,
  },
  {
    slug: "dog-tennis-ball-set",
    q: "dog tennis ball rubber fetch 6 pack",
    mustAll: ["tennis", "ball"],
    ban: ["launcher only", "thrower only"],
    ship: 3.5,
  },
  {
    slug: "pet-food-measuring-scoop",
    q: "pet food scoop measuring cup portion kibble",
    mustAll: ["scoop"],
    ban: ["poop", "pooper", "waste", "scooper claw"],
    ship: 3.5,
  },
  {
    slug: "pet-car-seat-cover",
    q: "dog car back seat cover hammock waterproof",
    mustAll: ["seat cover"],
    ban: ["baby", "child", "steering"],
    ship: 5.5,
  },
  {
    slug: "pet-stairs-steps",
    q: "dog stairs pet steps foam bed couch climb",
    mustAll: ["stair"],
    ban: ["bird", "reptile", "bookcase"],
    ship: 6,
  },
  {
    slug: "pet-nail-grinder",
    q: "dog nail grinder electric pet claw trimmer usb",
    mustAll: ["grinder", "nail"],
    ban: ["human", "manicure"],
    ship: 4,
  },
  {
    slug: "dog-snuffle-mat",
    q: "snuffle mat dog foraging feeding nose work",
    mustAll: ["snuffle"],
    ban: ["litter", "yoga", "bath mat"],
    ship: 4,
  },
  {
    slug: "catnip-plush-mice",
    q: "catnip plush mouse toys cat set stuffed",
    mustAll: ["catnip", "mouse"],
    ban: ["electronic", "usb", "rechargeable", "automatic", "robot"],
    ship: 3.5,
  },
];

function okName(name, mustAll, ban) {
  const n = (name || "").toLowerCase();
  if (ban.some((b) => n.includes(b))) return false;
  return mustAll.every((m) => n.includes(m.toLowerCase()));
}

const src = readFileSync(resolve(__dirname, "../src/data/products.ts"), "utf8");
const existingSlugs = new Set([...src.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]));
const usedVids = new Set([...src.matchAll(/cjVid: "([^"]+)"/g)].map((m) => m[1]));

let existing = {};
try {
  existing = JSON.parse(readFileSync(resolve(__dirname, "cj-pet-expand.json"), "utf8"));
} catch {
  existing = {};
}

async function getToken() {
  const auth = await fetch(`${API}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: key }),
  }).then((r) => r.json());
  return auth.data.accessToken;
}

async function loadPid(token, pid, item) {
  await sleep(1200);
  const res = await fetch(`${API}/product/query?pid=${encodeURIComponent(pid)}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());
  if (!res.result) return null;
  const data = res.data;
  const name = data.productNameEn || "";
  const v = data.variants?.find((x) => Number(x.variantSellPrice) > 0) || data.variants?.[0];
  if (!v?.vid || usedVids.has(v.vid)) return null;
  const cost = Number(v.variantSellPrice ?? 0);
  if (cost < 0.4 || cost > 35) return null;
  const images = [...new Set([v.variantImage, data.bigImage, ...(data.productImageSet || [])].filter(Boolean))];
  if (images.length < 4) return null;
  usedVids.add(v.vid);
  return {
    slug: item.slug,
    pid: data.pid,
    ship: item.ship,
    cost,
    cjName: name,
    supplierSku: data.productSku,
    cjVid: v.vid,
    cjSku: v.variantSku,
    image: images[0],
    images: images.slice(0, 8),
    listedNum: data.listedNum || 0,
  };
}

async function searchItem(token, item) {
  for (const page of [1, 2, 3, 4, 5]) {
    await sleep(1200);
    const p = new URLSearchParams({
      page: String(page),
      size: "40",
      keyWord: item.q,
      countryCode: "US",
      orderBy: "1",
      sort: "desc",
    });
    const list = await fetch(`${API}/product/listV2?${p}`, {
      headers: { "CJ-Access-Token": token },
    }).then((r) => r.json());
    const products = (list.data?.content || []).flatMap((g) => g.productList || []);
    for (const hit of products) {
      if (!okName(hit.nameEn, item.mustAll, item.ban)) continue;
      const data = await loadPid(token, hit.id, item);
      if (!data) continue;
      if (!okName(data.cjName, item.mustAll, item.ban)) continue;
      return data;
    }
  }
  return null;
}

const token = await getToken();

// Keep only verified entries from first harvest
const keep = ["pet-toothbrush-kit", "cat-laser-toy"];
const cleaned = {};
for (const k of keep) {
  if (existing[k]) cleaned[k] = existing[k];
}

if (!existingSlugs.has("automatic-pet-feeder")) {
  const feederHit = await loadPid(token, FIXED["automatic-pet-feeder"], {
    slug: "automatic-pet-feeder",
    ship: 5,
  });
  if (feederHit?.cjName?.toLowerCase().includes("feeder")) {
    cleaned["automatic-pet-feeder"] = feederHit;
    console.log("FEEDER", feederHit.cjName.slice(0, 65), feederHit.cost);
  }
}

for (const item of SEARCH) {
  if (existingSlugs.has(item.slug) || cleaned[item.slug]) {
    console.log("SKIP", item.slug);
    continue;
  }
  console.log("SEARCH", item.slug);
  const hit = await searchItem(token, item);
  if (!hit) {
    console.log("FAIL", item.slug);
    continue;
  }
  cleaned[item.slug] = hit;
  console.log("OK", item.slug, hit.cjName.slice(0, 65), "cost:", hit.cost);
}

writeFileSync(resolve(__dirname, "cj-pet-expand.json"), JSON.stringify(cleaned, null, 2));
console.log("\nTotal candidates:", Object.keys(cleaned).length);
