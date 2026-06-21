import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://developers.cjdropshipping.com/api2.0/v1";

const envFile = resolve(__dirname, "../.env.production.local");
const envText = readFileSync(envFile, "utf8");
const apiKey = envText.match(/CJ_API_KEY="([^"]+)"/)?.[1];
if (!apiKey) throw new Error("CJ_API_KEY not in .env.production.local");

const slugQueries = {
  "cat-scratching-tower": "cat scratching post tower",
  "pet-grooming-brush-set": "pet grooming brush set dog cat",
  "slow-feeder-dog-bowl": "slow feeder dog bowl",
  "portable-pet-carrier": "portable pet carrier bag",
  "calming-pet-anxiety-vest": "dog anxiety vest thunder",
  "closet-organizer-6-shelf": "hanging closet organizer shelf",
  "under-sink-storage-rack": "under sink storage rack",
  "magnetic-spice-rack": "magnetic spice rack refrigerator",
  "bamboo-drawer-dividers": "bamboo drawer divider adjustable",
  "over-door-hook-rack": "over door hook rack",
  "vacuum-storage-bags": "vacuum storage bags clothes",
  "cordless-cabinet-light": "cabinet light motion sensor",
  "posture-corrector-brace": "posture corrector back brace",
  "gua-sha-jade-set": "gua sha jade roller set",
  "weighted-sleep-mask": "weighted sleep mask",
  "foam-roller-recovery": "foam roller yoga fitness",
  "acupressure-mat-set": "acupressure mat pillow set",
  "essential-oil-diffuser": "essential oil diffuser ultrasonic",
  "yoga-resistance-bands": "resistance bands set fitness",
  "wireless-earbuds-pro": "wireless earbuds bluetooth",
  "20000mah-power-bank": "power bank 20000mah",
  "magsafe-car-mount": "magnetic car phone mount",
  "ergonomic-wrist-rest": "keyboard wrist rest pad",
  "webcam-privacy-cover": "webcam cover privacy slider",
  "cable-management-box": "cable management box organizer",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getToken() {
  const auth = await fetch(`${API}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  }).then((r) => r.json());
  if (!auth.result) throw new Error(auth.message);
  return auth.data.accessToken;
}

function score(name, query) {
  const n = name.toLowerCase();
  const words = query.toLowerCase().split(/\s+/);
  return words.filter((w) => n.includes(w)).length;
}

async function findImage(token, query) {
  await sleep(1300);
  const params = new URLSearchParams({
    page: "1",
    size: "20",
    keyWord: query,
    orderBy: "1",
    sort: "desc",
  });
  const list = await fetch(`${API}/product/listV2?${params}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());
  const products = (list.data?.content || []).flatMap((g) => g.productList || []);
  const ranked = products
    .map((p) => ({ p, s: score(p.nameEn || "", query) }))
    .filter((x) => x.s >= 2)
    .sort((a, b) => b.s - a.s || (b.p.listedNum || 0) - (a.p.listedNum || 0));
  const top = ranked[0]?.p;
  if (!top) return null;

  await sleep(1300);
  const detail = await fetch(
    `${API}/product/query?productSku=${encodeURIComponent(top.sku)}`,
    { headers: { "CJ-Access-Token": token } },
  ).then((r) => r.json());
  if (!detail.result) return null;
  const d = detail.data;
  const v = d.variants?.[0];
  const image = v?.variantImage || d.bigImage || top.bigImage;
  const images = (d.productImageSet?.length ? d.productImageSet : [image]).slice(0, 4);
  return { image, images, name: d.productNameEn };
}

const token = await getToken();
const results = {};

for (const [slug, query] of Object.entries(slugQueries)) {
  const found = await findImage(token, query);
  results[slug] = found;
  console.log(slug, found ? found.image.slice(0, 60) : "NOT FOUND");
}

writeFileSync(
  resolve(__dirname, "image-fix-results.json"),
  JSON.stringify(results, null, 2),
);
