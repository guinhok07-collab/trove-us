/**
 * Search CJ for new products with 4+ images (prints candidates).
 * Usage: node --env-file=.env.local scripts/find-expand-candidates.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SEARCHES = [
  { slug: "mason-jar-storage-lids", store: "home", q: "mason jar lid pour shaker", must: ["mason jar"], ban: ["ring light"] },
  { slug: "silicone-utensil-rest", store: "home", q: "silicone spoon rest kitchen", must: ["spoon rest", "utensil rest"], ban: ["toothbrush"] },
  { slug: "collapsible-colander", store: "home", q: "collapsible silicone colander", must: ["colander"], ban: ["ladle only"] },
  { slug: "over-sink-dish-rack", store: "home", q: "roll up dish drying rack sink", must: ["dish", "rack"], ban: ["cabinet"] },
  { slug: "bed-sheet-organizer", store: "home", q: "bed sheet organizer storage", must: ["sheet"], ban: ["phone"] },
  { slug: "foam-roller-recovery", store: "wellness", q: "foam roller yoga muscle", must: ["foam roller"], ban: ["electric"] },
  { slug: "portable-blender-bottle", store: "wellness", q: "portable juicer cup usb", must: ["blender", "juicer"], ban: ["makeup"] },
  { slug: "wireless-mouse-silent", store: "tech", q: "wireless mouse rechargeable", must: ["wireless mouse"], ban: ["gaming rgb"] },
  { slug: "phone-ring-holder", store: "tech", q: "phone ring holder grip stand", must: ["ring"], ban: ["ring light", "selfie"] },
  { slug: "automatic-pet-feeder", store: "pet", q: "automatic pet feeder timer dry", must: ["feeder"], ban: ["water fountain"] },
  { slug: "acupressure-mat-pillow", store: "wellness", q: "acupressure mat pillow set", must: ["acupressure", "mat"], ban: ["yoga mat only"] },
  { slug: "drawer-divider-expandable", store: "home", q: "expandable drawer divider", must: ["drawer divider"], ban: ["bathroom vanity"] },
];

function okName(name, must, ban) {
  const n = (name || "").toLowerCase();
  if (ban.some((b) => n.includes(b))) return false;
  return must.some((m) => n.includes(m.toLowerCase()));
}

const src = readFileSync(resolve(__dirname, "../src/data/products.ts"), "utf8");
const vids = new Set([...src.matchAll(/cjVid: "([^"]+)"/g)].map((m) => m[1]));
const slugs = new Set([...src.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]));

const auth = await fetch(`${API}/authentication/getAccessToken`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ apiKey: key }),
}).then((r) => r.json());
const token = auth.data.accessToken;

const found = {};

for (const item of SEARCHES) {
  if (slugs.has(item.slug)) {
    console.log("SKIP exists", item.slug);
    continue;
  }
  await sleep(1200);
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

  let hit = null;
  for (const p of products) {
    if (!okName(p.nameEn, item.must, item.ban)) continue;
    await sleep(1100);
    const r = await fetch(`${API}/product/query?pid=${p.id}`, {
      headers: { "CJ-Access-Token": token },
    }).then((x) => x.json());
    if (!r.result) continue;
    const v = r.data?.variants?.find((x) => Number(x.variantSellPrice) > 0) || r.data?.variants?.[0];
    if (!v?.vid || vids.has(v.vid)) continue;
    const imgs = (r.data?.productImageSet || []).length;
    if (imgs < 4) continue;
    hit = { ...item, pid: p.id, name: r.data.productNameEn, imgs, vid: v.vid, sku: v.variantSku, cost: v.variantSellPrice, listed: p.listedNum };
    vids.add(v.vid);
    break;
  }

  if (hit) {
    found[item.slug] = hit;
    console.log("FOUND", item.slug, hit.imgs, "imgs", hit.pid, hit.name?.slice(0, 40));
  } else {
    console.log("NONE", item.slug);
  }
}

writeFileSync(resolve(__dirname, "expand-candidates.json"), JSON.stringify(found, null, 2));
console.log("\nSaved", Object.keys(found).length, "candidates");
