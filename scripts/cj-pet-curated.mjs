/**
 * Vetted pet impulse picks — strict name checks
 */
import { writeFileSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PAYPAL = 0.034;
const MARGIN = 0.2;

const SEARCH = [
  {
    slug: "pet-silicone-food-mat",
    q: "pet feeding mat silicone placemat spill",
    must: ["pet", "mat"],
    ban: ["feeder", "dispenser", "automatic", "bed", "car seat", "baby"],
    ship: 3.5,
  },
  {
    slug: "dog-treat-pouch",
    q: "dog training treat pouch waist belt clip",
    must: ["treat"],
    ban: ["lunch", "cosmetic", "diaper", "baby", "harness set"],
    ship: 3.5,
  },
  {
    slug: "portable-pet-water-bottle",
    q: "dog travel water bottle portable outdoor walk",
    must: ["dog", "water"],
    ban: ["desk", "gallon", "electric", "fountain", "automatic", "humans"],
    ship: 4,
  },
  {
    slug: "pet-stainless-bowl-set",
    q: "double dog bowl stainless steel non slip",
    must: ["bowl", "stainless"],
    ban: ["feeder", "automatic", "timer", "smart", "elevated stand only"],
    ship: 4,
  },
  {
    slug: "pet-waste-bag-refills",
    q: "dog poop bags rolls biodegradable pet waste",
    must: ["poop", "bag"],
    ban: ["stroller", "baby", "dispenser only", "holder only", "leash"],
    ship: 3.5,
  },
  {
    slug: "pet-food-scoop",
    q: "pet food scoop measuring cup dog cat",
    must: ["scoop"],
    ban: ["shovel snow", "beach", "litter box giant"],
    ship: 3.5,
  },
  {
    slug: "collapsible-pet-bowl",
    q: "collapsible dog bowl travel silicone portable",
    must: ["collapsible", "bowl"],
    ban: ["slow feeder maze", "automatic"],
    ship: 3.5,
  },
  {
    slug: "dog-dental-chew-rope",
    q: "dog rope toy dental chew cotton",
    must: ["rope", "dog"],
    ban: ["cat tree", "bird", "horse"],
    ship: 3.5,
  },
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

function cleanImages(raw) {
  const out = [];
  for (const item of raw) {
    if (!item) continue;
    if (typeof item === "string") {
      if (item.startsWith("http")) out.push(item);
      else if (item.startsWith("[")) {
        try {
          out.push(...JSON.parse(item).filter((u) => typeof u === "string" && u.startsWith("http")));
        } catch {
          /* skip */
        }
      }
    }
  }
  return [...new Set(out)].slice(0, 8);
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
  for (const page of [1, 2, 3, 4]) {
    await sleep(900);
    const p = new URLSearchParams({ page: String(page), size: "40", keyWord: item.q, orderBy: "1", sort: "desc" });
    const list = await fetch(`${API}/product/listV2?${p}`, { headers: { "CJ-Access-Token": token } }).then((r) => r.json());
    for (const hit of (list.data?.content || []).flatMap((g) => g.productList || [])) {
      if (!okName(hit.nameEn, item.must, item.ban)) continue;
      const data = await queryPid(token, hit.id);
      const v = data?.variants?.find((x) => Number(x.variantSellPrice) > 0) || data?.variants?.[0];
      if (!v?.vid) continue;
      const cost = Number(v.variantSellPrice ?? data.sellPrice ?? 0);
      if (cost < 0.4 || cost > 10) continue;
      const price = retailPrice(cost, item.ship);
      if (price > 18) continue;
      const images = cleanImages([v.variantImage, data.productImage, ...(data.productImageSet || [])]);
      if (!images.length) continue;
      return {
        slug: item.slug,
        pid: data.pid,
        ship: item.ship,
        cost,
        price,
        compareAtPrice: Math.ceil(price * 1.1) - 0.01,
        cjName: data.productNameEn,
        supplierSku: data.productSku,
        cjVid: v.vid,
        cjSku: v.variantSku,
        image: images[0],
        images,
        listedNum: data.listedNum,
      };
    }
  }
  return null;
}

const existing = readFileSync(resolve(__dirname, "cj-pet-candidates.json"), "utf8");
const keep = JSON.parse(existing);
const goodSlugs = ["cat-feather-teaser", "pet-grooming-gloves", "dog-bandana-set"];
const out = {};
for (const s of goodSlugs) if (keep[s]) out[s] = keep[s];

if (!key) throw new Error("Set CJ_API_KEY");
const token = await getToken();
for (const item of SEARCH) {
  if (out[item.slug]) {
    console.log("KEEP", item.slug);
    continue;
  }
  const found = await searchItem(token, item);
  if (found) {
    out[item.slug] = found;
    console.log("OK", item.slug, `$${found.cost.toFixed(2)} → $${found.price.toFixed(2)}`, found.cjName.slice(0, 55));
  } else console.log("FAIL", item.slug);
}

writeFileSync(resolve(__dirname, "cj-pet-curated.json"), JSON.stringify(out, null, 2));
console.log("Total", Object.keys(out).length);
