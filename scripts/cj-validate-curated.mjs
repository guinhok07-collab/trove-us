/** Validate curated CJ PIDs for restore */
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { naturalSocialProof } from "./social-proof.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TARGET_MARGIN = 0.2;
const PAYPAL_RATE = 0.034;

const CURATED = [
  { slug: "cat-window-perch", store: "pet", pid: "0560E655-7FDB-4558-8B9F-F2FDF3185B07", ship: 5 },
  { slug: "ice-cube-tray-silicone", store: "home", pid: "1777174523490607104", ship: 3.5 },
  { slug: "door-draft-stopper", store: "home", pid: "F65117D2-C138-4CEB-850F-5704B29DEF29", ship: 4 },
  { slug: "bed-sheet-organizer", store: "home", pid: "2046065106086301698", ship: 4 },
  { slug: "silicone-food-storage-bags", store: "home", pid: "1435808620456579072", ship: 4 },
  { slug: "meditation-cushion", store: "wellness", pid: "1386865820080148480", ship: 5 },
  { slug: "jade-roller-gua-sha", store: "wellness", pid: "1427928128000495616", ship: 3.5 },
  { slug: "muscle-roller-stick", store: "wellness", pid: "45D28532-88BB-4670-8376-013589C05212", ship: 4 },
  { slug: "webcam-cover-slide", store: "tech", pid: "5BB44D7E-10C7-410E-8437-D56F2D9CFBF5", ship: 3.5 },
  { slug: "monitor-light-bar", store: "tech", pid: "1397038105621565440", ship: 4.5 },
  { slug: "tablet-stand-adjustable", store: "tech", pid: "3052B795-EB62-41A2-8B3D-F97948B20132", ship: 3.5 },
];

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
  if (!res.result) console.log("ERR", pid, res.message);
  return res.result ? res.data : null;
}

const token = await getToken();
const out = {};
for (const item of CURATED) {
  const data = await queryPid(token, item.pid);
  const v = data?.variants?.find((x) => Number(x.variantSellPrice) > 0) || data?.variants?.[0];
  if (!v?.vid) { console.log("FAIL", item.slug); continue; }
  const cost = Number(v.variantSellPrice ?? data.sellPrice ?? 0);
  const listed = Number(data.listedNum || 0);
  const images = (data.productImageSet?.length ? data.productImageSet : [data.bigImage]).slice(0, 8);
  const image = v.variantImage || images[0];
  if (image && !images.includes(image)) images.unshift(image);
  const price = retailPrice(cost, item.ship);
  out[item.slug] = {
    slug: item.slug, store: item.store, pid: data.pid, cjName: data.productNameEn,
    supplierSku: data.productSku, cjVid: v.vid, cjSku: v.variantSku, image, images,
    cost, shippingEst: item.ship, price, compareAtPrice: Math.ceil(price * 1.1) - 0.01,
    listedNum: listed, ...naturalSocialProof(item.slug, listed),
  };
  console.log("OK", item.slug, "|", data.productNameEn.slice(0, 70), "| $", cost, "→", price);
}
writeFileSync(resolve(__dirname, "cj-restore-curated.json"), JSON.stringify(out, null, 2));
