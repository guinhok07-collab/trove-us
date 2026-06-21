/** Retry failed bulk harvest with broader CJ searches */
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

const bulkPath = resolve(__dirname, "cj-bulk-catalog.json");
const bulk = JSON.parse(readFileSync(bulkPath, "utf8"));
const usedPids = new Set(Object.values(bulk).map((p) => p.pid).filter(Boolean));

const retries = [
  { slug: "dog-poop-bag-dispenser", store: "pet", q: "dog waste bag holder clip", must: ["bag"], ban: ["diaper", "garbage can"], ship: 3.5, desc: "Always carry poop bags on walks.", features: ["Clip-on", "Includes bags", "Portable", "One-hand use"] },
  { slug: "cat-litter-mat", store: "pet", q: "cat litter trapping mat", must: ["litter"], ban: ["dog harness"], ship: 4.5, desc: "Traps litter from cat paws.", features: ["Honeycomb design", "Waterproof", "Easy clean", "Large size"] },
  { slug: "pet-food-storage-container", store: "pet", q: "dog food container airtight bin", must: ["food"], ban: ["bowl only", "feeder timer"], ship: 5.5, desc: "Keep kibble fresh and organized.", features: ["Airtight", "Scoop slot", "BPA-free", "Stackable"] },
  { slug: "dog-treat-pouch", store: "pet", q: "dog treat training bag waist", must: ["treat"], ban: ["food container"], ship: 3.5, desc: "Training pouch for treats on walks.", features: ["Belt clip", "Drawstring", "Washable", "Quick access"] },
  { slug: "silicone-food-storage-bags", store: "home", q: "silicone reusable storage bag kitchen", must: ["silicone"], ban: ["grip exerciser", "phone"], ship: 4, desc: "Eco reusable food bags.", features: ["Leak-proof", "Freezer safe", "Dishwasher safe", "Multi-size"] },
  { slug: "adhesive-wall-hooks", store: "home", q: "sticky hooks wall mount heavy duty", must: ["hook"], ban: ["curtain"], ship: 3.5, desc: "No-drill hooks for home organization.", features: ["Strong adhesive", "Stainless", "Removable", "Multi-pack"] },
  { slug: "door-draft-stopper", store: "home", q: "door bottom seal strip draft", must: ["door"], ban: ["window tint"], ship: 4, desc: "Seal gaps under doors.", features: ["Adjustable", "Washable", "Easy install", "Noise block"] },
  { slug: "over-door-hook-rack", store: "home", q: "over the door hooks hanger rack", must: ["door"], ban: ["mirror full"], ship: 4, desc: "Extra hanging space instantly.", features: ["No tools", "Soft pads", "Multi-hook", "Universal fit"] },
  { slug: "kitchen-sink-organizer", store: "home", q: "sink caddy sponge holder kitchen", must: ["sink"], ban: ["bathroom vanity"], ship: 3.5, desc: "Organize sponge and soap.", features: ["Drain design", "Rust proof", "Compact", "Adhesive mount"] },
  { slug: "jade-roller-gua-sha", store: "wellness", q: "facial jade roller massage tool", must: ["roller"], ban: ["paint", "lint"], ship: 3.5, desc: "Facial massage for glow and depuffing.", features: ["Natural stone", "Cooling", "Dual-ended", "Gift ready"] },
  { slug: "hand-grip-strengthener", store: "wellness", q: "hand exerciser grip strength forearm", must: ["hand"], ban: ["finger splint medical"], ship: 3.5, desc: "Build grip strength anywhere.", features: ["Adjustable", "Spring resistance", "Compact", "Rehab friendly"] },
  { slug: "jump-rope-weighted", store: "wellness", q: "fitness jump rope adjustable speed", must: ["jump rope"], ban: ["dog leash"], ship: 3.5, desc: "Cardio jump rope for home workouts.", features: ["Adjustable", "Ball bearings", "Foam grips", "Tangle-free"] },
  { slug: "muscle-roller-stick", store: "wellness", q: "massage roller stick muscle recovery", must: ["roller"], ban: ["foam roller 45", "gun"], ship: 4, desc: "Roll out sore muscles post-workout.", features: ["Deep tissue", "Travel size", "Non-slip grip", "Targeted pressure"] },
  { slug: "portable-blender-bottle", store: "wellness", q: "usb mini blender cup smoothie maker", must: ["blender"], ban: ["commercial"], ship: 4.5, desc: "Blend smoothies on the go.", features: ["USB charge", "Portable", "Self-clean", "BPA-free"] },
  { slug: "webcam-cover-slide", store: "tech", q: "laptop camera cover privacy slider", must: ["camera", "cover"], ban: ["security camera"], ship: 3.5, desc: "Protect laptop privacy in one slide.", features: ["Ultra-thin", "3-pack", "Strong adhesive", "Easy slide"] },
  { slug: "bluetooth-keyboard-mini", store: "tech", q: "mini wireless keyboard bluetooth rechargeable", must: ["keyboard"], ban: ["mechanical gaming"], ship: 4, desc: "Portable keyboard for tablet and TV.", features: ["Bluetooth", "Rechargeable", "Slim keys", "Travel size"] },
  { slug: "monitor-light-bar", store: "tech", q: "computer monitor lamp screen light bar", must: ["monitor", "light"], ban: ["floor lamp"], ship: 4.5, desc: "Monitor-mounted light reduces eye strain.", features: ["No glare", "USB power", "Touch dimmer", "Space saving"] },
  { slug: "ice-roller-face", store: "wellness", q: "face ice roller skin cooling tool", must: ["face"], ban: ["paint roller"], ship: 3.5, desc: "Cooling roller for morning skincare.", features: ["Depuffing", "Refillable", "Ergonomic", "Freezer safe"] },
  { slug: "bed-sheet-organizer", store: "home", q: "bedding storage organizer foldable bin", must: ["bedding", "storage"], ban: ["vacuum bag"], ship: 4, desc: "Organize sheet sets in the closet.", features: ["Foldable", "Labels", "Breathable", "Set of 3"] },
  { slug: "mason-jar-storage-lids", store: "home", q: "canning jar lids pour shaker storage", must: ["jar"], ban: ["ring light"], ship: 3.5, desc: "Pantry storage lids for mason jars.", features: ["Pour spout", "Shaker option", "BPA-free", "Wide mouth"] },
];

function okName(name, must, ban) {
  const n = (name || "").toLowerCase();
  if (ban.some((b) => n.includes(b))) return false;
  return must.some((m) => n.includes(m.toLowerCase()));
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

const token = await getToken();

for (const item of retries) {
  if (bulk[item.slug]) continue;
  await sleep(1100);
  const p = new URLSearchParams({ page: "1", size: "35", keyWord: item.q, countryCode: "US", orderBy: "1", sort: "desc" });
  const list = await fetch(`${API}/product/listV2?${p}`, { headers: { "CJ-Access-Token": token } }).then((r) => r.json());
  const products = (list.data?.content || []).flatMap((g) => g.productList || []).sort((a, b) => (b.listedNum || 0) - (a.listedNum || 0));

  let mapped = null;
  for (const hit of products) {
    if (!hit?.id || usedPids.has(hit.id) || !okName(hit.nameEn, item.must, item.ban)) continue;
    const data = await queryPid(token, hit.id);
    const v = data?.variants?.find((x) => Number(x.variantSellPrice) > 0) || data?.variants?.[0];
    if (!v?.vid) continue;
    const cost = Number(v.variantSellPrice ?? data.sellPrice ?? 0);
    if (cost < 0.4 || cost > 48) continue;
    usedPids.add(hit.id);
    const listed = Number(data.listedNum || 0);
    const images = (data.productImageSet?.length ? data.productImageSet : [data.bigImage]).slice(0, 7);
    const image = v.variantImage || images[0];
    if (image && !images.includes(image)) images.unshift(image);
    const price = retailPrice(cost, item.ship);
    const social = naturalSocialProof(item.slug, listed);
    const tags = listed > 1500 ? ["bestseller"] : listed < 120 ? ["new"] : [];
    if (price >= 24.99) tags.push("free-shipping");
    mapped = {
      slug: item.slug, store: item.store, pid: data.pid, name: data.productNameEn,
      description: item.desc, longDescription: `${item.desc} Ships from US warehouse in 3–5 days.`,
      features: item.features, tags, supplierSku: data.productSku, cjVid: v.vid, cjSku: v.variantSku,
      image, images, cost, shippingEst: item.ship, price, compareAtPrice: Math.ceil(price * 1.1) - 0.01,
      listedNum: listed, ...social, variantLabel: v.variantKey || v.variantNameEn,
    };
    break;
  }
  console.log(mapped ? `OK ${item.slug}` : `FAIL ${item.slug}`);
  if (mapped) bulk[item.slug] = mapped;
}

writeFileSync(bulkPath, JSON.stringify(bulk, null, 2));
console.log("Total in bulk:", Object.keys(bulk).length);
