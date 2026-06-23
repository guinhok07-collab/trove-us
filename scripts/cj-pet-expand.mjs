/**
 * Harvest vetted pet expand candidates — ALL must keywords + query name check.
 * Usage: node --env-file=.env.local scripts/cj-pet-expand.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SEARCH = [
  {
    slug: "automatic-pet-feeder",
    q: "automatic pet feeder timer dry food dispenser",
    must: ["feeder"],
    mustAll: ["automatic", "feeder"],
    ban: ["leash", "rope", "fountain", "fish tank", "water bottle"],
    ship: 5,
  },
  {
    slug: "pet-deshedding-tool",
    q: "pet deshedding brush undercoat rake shedding",
    must: ["deshed"],
    mustAll: ["deshed"],
    ban: ["vacuum", "glove only", "lint roller"],
    ship: 3.5,
  },
  {
    slug: "dog-reflective-vest",
    q: "dog reflective safety vest night visibility",
    must: ["reflective", "vest"],
    mustAll: ["reflective", "vest", "dog"],
    ban: ["airtag", "collar holder", "steam brush", "brush"],
    ship: 4,
  },
  {
    slug: "cat-laser-toy",
    q: "cat laser pointer toy rechargeable interactive",
    must: ["laser"],
    mustAll: ["laser", "cat"],
    ban: ["airtag", "collar", "tracker", "holder case"],
    ship: 3.5,
  },
  {
    slug: "pet-food-measuring-scoop",
    q: "pet food measuring scoop cup portion",
    must: ["scoop"],
    mustAll: ["scoop", "pet"],
    ban: ["scooper poop", "pooper", "dispenser", "container bin"],
    ship: 3.5,
  },
  {
    slug: "pet-toothbrush-kit",
    q: "pet toothbrush finger brush dental kit dog cat",
    must: ["toothbrush"],
    mustAll: ["toothbrush", "pet"],
    ban: ["water bottle", "water cup", "fountain"],
    ship: 3.5,
  },
  {
    slug: "dog-tennis-ball-set",
    q: "dog tennis ball fetch toy rubber set",
    must: ["tennis ball"],
    mustAll: ["tennis", "ball"],
    ban: ["cat toy", "golf"],
    ship: 3.5,
  },
  {
    slug: "catnip-mouse-toys",
    q: "catnip mouse toys plush cat set",
    must: ["catnip", "mouse"],
    mustAll: ["catnip", "mouse"],
    ban: ["laser ball", "rolling ball"],
    ship: 3.5,
  },
  {
    slug: "pet-car-seat-cover",
    q: "dog car seat cover hammock waterproof back seat",
    must: ["seat cover"],
    mustAll: ["seat cover", "dog"],
    ban: ["baby car seat", "steering wheel"],
    ship: 5.5,
  },
  {
    slug: "pet-stairs-steps",
    q: "pet stairs steps foam dog cat bed couch",
    must: ["stair"],
    mustAll: ["pet", "stair"],
    ban: ["bird cage", "ladder human"],
    ship: 6,
  },
  {
    slug: "pet-nail-grinder",
    q: "pet nail grinder electric dog cat claw trimmer",
    must: ["nail grinder"],
    mustAll: ["nail", "grinder"],
    ban: ["human nail", "drill"],
    ship: 4,
  },
  {
    slug: "dog-snuffle-mat",
    q: "dog snuffle mat foraging nose work feeding",
    must: ["snuffle"],
    mustAll: ["snuffle", "mat"],
    ban: ["cat litter", "yoga mat"],
    ship: 4,
  },
];

function okName(name, must, mustAll, ban) {
  const n = (name || "").toLowerCase();
  if (ban.some((b) => n.includes(b))) return false;
  if (!must.some((m) => n.includes(m.toLowerCase()))) return false;
  if (!mustAll.every((m) => n.includes(m.toLowerCase()))) return false;
  return true;
}

const src = readFileSync(resolve(__dirname, "../src/data/products.ts"), "utf8");
const existingSlugs = new Set([...src.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]));
const usedVids = new Set([...src.matchAll(/cjVid: "([^"]+)"/g)].map((m) => m[1]));

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
  for (const page of [1, 2, 3, 4]) {
    await sleep(900);
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
    for (const hit of (list.data?.content || []).flatMap((g) => g.productList || [])) {
      if (!okName(hit.nameEn, item.must, item.mustAll, item.ban)) continue;
      const score = hit.listedNum || 0;
      if (!seen.has(hit.id) || score > seen.get(hit.id).score) {
        seen.set(hit.id, { hit, score });
      }
    }
  }

  for (const { hit } of [...seen.values()].sort((a, b) => b.score - a.score).slice(0, 15)) {
    const data = await queryPid(token, hit.id);
    if (!data) continue;
    const name = data.productNameEn || hit.nameEn || "";
    if (!okName(name, item.must, item.mustAll, item.ban)) continue;

    const v = data.variants?.find((x) => Number(x.variantSellPrice) > 0) || data.variants?.[0];
    if (!v?.vid || usedVids.has(v.vid)) continue;

    const cost = Number(v.variantSellPrice ?? data.sellPrice ?? 0);
    if (cost < 0.4 || cost > 35) continue;

    const images = [...new Set([v.variantImage, data.bigImage, ...(data.productImageSet || [])].filter(Boolean))];
    if (images.length < 4) continue;

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
      listedNum: hit.listedNum || 0,
    };
  }
  return null;
}

const token = await getToken();
const out = {};

for (const item of SEARCH) {
  if (existingSlugs.has(item.slug)) {
    console.log("SKIP exists", item.slug);
    continue;
  }
  console.log("SEARCH", item.slug);
  const hit = await searchItem(token, item);
  if (!hit) {
    console.log("FAIL", item.slug);
    continue;
  }
  usedVids.add(hit.cjVid);
  out[item.slug] = hit;
  console.log("OK", item.slug, hit.cjName.slice(0, 65), "imgs:", hit.images.length, "cost:", hit.cost);
}

const outPath = resolve(__dirname, "cj-pet-expand.json");
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`\nSaved ${Object.keys(out).length} candidates → cj-pet-expand.json`);
