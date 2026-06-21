/**
 * Replace catalog items that were matched to wrong CJ products.
 * Usage: npx vercel env run --environment=production -- node scripts/cj-fix-mismatched.mjs
 */
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

const fixes = [
  { slug: "pet-nail-clipper", store: "pet", q: "dog cat nail clipper trimmer pet grooming", must: ["nail", "clip"], ban: ["gel", "art", "extension", "polish"], ship: 3.5 },
  { slug: "dog-cooling-mat", store: "pet", q: "dog cooling mat pad gel self cooling pet", must: ["cooling", "mat"], ban: ["air conditioner", "fan", "conditioner"], ship: 5 },
  { slug: "cat-window-perch", store: "pet", q: "cat window perch suction seat bed", must: ["window", "cat"], ban: ["christmas", "tree", "dog"], ship: 5 },
  { slug: "pet-food-storage-container", store: "pet", q: "dog food storage container airtight bin 10lb", must: ["food", "storage"], ban: ["scale", "spoon", "bowl only"], ship: 5.5 },
  { slug: "spice-rack-organizer", store: "home", q: "spice rack organizer cabinet pantry", must: ["spice"], ban: ["jeans", "pants", "dress"], ship: 4.5 },
  { slug: "foldable-laundry-hamper", store: "home", q: "foldable laundry hamper basket clothes", must: ["laundry", "hamper"], ban: ["shoe brush", "shoe clean"], ship: 5 },
  { slug: "ice-cube-tray-silicone", store: "home", q: "silicone ice cube tray with lid freezer", must: ["ice cube", "tray"], ban: ["face roller", "face mould", "beauty"], ship: 3.5 },
  { slug: "silicone-food-storage-bags", store: "home", q: "reusable silicone food storage bags ziplock", must: ["food", "bag"], ban: ["grip", "hand exerciser", "finger"], ship: 4 },
  { slug: "door-draft-stopper", store: "home", q: "door draft stopper under door seal blocker", must: ["draft", "door"], ban: ["cup holder", "car"], ship: 4 },
  { slug: "over-door-hook-rack", store: "home", q: "over door hook hanger rack 5 hooks", must: ["over door", "hook"], ban: ["plant hanger", "macrame", "flower pot"], ship: 4 },
  { slug: "kitchen-sink-organizer", store: "home", q: "kitchen sink caddy organizer sponge holder", must: ["sink"], ban: ["cup washer", "bar counter", "bathroom"], ship: 3.5 },
  { slug: "bed-sheet-organizer", store: "home", q: "bed sheet organizer storage closet bedding", must: ["sheet", "bedding"], ban: ["phone", "screen cleaner"], ship: 4 },
  { slug: "meditation-cushion", store: "wellness", q: "meditation cushion zafu floor pillow buckwheat", must: ["meditation", "cushion"], ban: ["pendant", "necklace", "crystal"], ship: 5 },
  { slug: "jade-roller-gua-sha", store: "wellness", q: "jade roller gua sha facial tool set", must: ["jade", "roller"], ban: ["hair remover", "lint"], ship: 3.5 },
  { slug: "hand-grip-strengthener", store: "wellness", q: "hand grip strengthener adjustable forearm", must: ["grip strengthener", "hand grip"], ban: ["beanie", "hat", "knitted"], ship: 3.5 },
  { slug: "muscle-roller-stick", store: "wellness", q: "muscle roller stick massage legs", must: ["roller stick"], ban: ["lint roller", "pet hair", "foam roller 45"], ship: 4 },
  { slug: "ice-roller-face", store: "wellness", q: "ice roller face depuff skincare tool", must: ["ice roller", "face"], ban: ["lip", "gloss", "lipstick"], ship: 3.5 },
  { slug: "webcam-cover-slide", store: "tech", q: "webcam cover slide laptop camera privacy", must: ["webcam", "camera cover"], ban: ["airtag", "collar", "dog"], ship: 3.5 },
  { slug: "monitor-light-bar", store: "tech", q: "monitor light bar screen lamp computer", must: ["monitor", "light bar"], ban: ["lantern", "camping", "reading book"], ship: 4.5 },
];

function okName(name, must, ban) {
  const n = (name || "").toLowerCase();
  if (ban.some((b) => n.includes(b))) return false;
  return must.every((m) => n.includes(m.toLowerCase()));
}

function retailPrice(cost, shipping) {
  const base = cost + shipping;
  return Math.max(Math.ceil(base / (1 - TARGET_MARGIN - PAYPAL_RATE)) - 0.01, base + 1.5);
}

async function getToken() {
  const auth = await fetch(`${API}/authentication/getAccessToken`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: key }),
  }).then((r) => r.json());
  return auth.data.accessToken;
}

async function queryPid(token, pid) {
  await sleep(1100);
  const res = await fetch(`${API}/product/query?pid=${encodeURIComponent(pid)}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());
  return res.result ? res.data : null;
}

async function search(token, item) {
  await sleep(1100);
  const p = new URLSearchParams({ page: "1", size: "40", keyWord: item.q, countryCode: "US", orderBy: "1", sort: "desc" });
  const list = await fetch(`${API}/product/listV2?${p}`, { headers: { "CJ-Access-Token": token } }).then((r) => r.json());
  const products = (list.data?.content || []).flatMap((g) => g.productList || []).sort((a, b) => (b.listedNum || 0) - (a.listedNum || 0));
  for (const hit of products) {
    if (!okName(hit.nameEn, item.must, item.ban)) continue;
    const data = await queryPid(token, hit.id);
    const v = data?.variants?.find((x) => Number(x.variantSellPrice) > 0) || data?.variants?.[0];
    if (!v?.vid) continue;
    const cost = Number(v.variantSellPrice ?? data.sellPrice ?? 0);
    if (cost < 0.4 || cost > 48) continue;
    const listed = Number(data.listedNum || 0);
    const images = (data.productImageSet?.length ? data.productImageSet : [data.bigImage]).slice(0, 7);
    const image = v.variantImage || images[0];
    if (image && !images.includes(image)) images.unshift(image);
    const price = retailPrice(cost, item.ship);
    return {
      slug: item.slug, store: item.store, pid: data.pid, cjName: data.productNameEn,
      supplierSku: data.productSku, cjVid: v.vid, cjSku: v.variantSku, image, images,
      cost, shippingEst: item.ship, price, compareAtPrice: Math.ceil(price * 1.1) - 0.01,
      listedNum: listed, ...naturalSocialProof(item.slug, listed),
    };
  }
  return null;
}

const token = await getToken();
const results = {};

for (const item of fixes) {
  const mapped = await search(token, item);
  if (mapped) {
    results[item.slug] = mapped;
    console.log("OK", item.slug, "→", mapped.cjName.slice(0, 55));
  } else {
    console.log("FAIL", item.slug);
  }
}

writeFileSync(resolve(__dirname, "cj-fix-results.json"), JSON.stringify(results, null, 2));
