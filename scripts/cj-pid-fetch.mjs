/** Fetch specific CJ products by PID for catalog corrections */
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { naturalSocialProof } from "./social-proof.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const picks = [
  { slug: "spice-rack-organizer", store: "home", pid: "1968983904842014722", ship: 4.5 },
  { slug: "pet-food-storage-container", store: "pet", pid: "2003457851599204354", ship: 6 },
  { slug: "hand-grip-strengthener", store: "wellness", pid: "1955941927074684929", ship: 3.5 },
  { slug: "ice-roller-face", store: "wellness", pid: "1506976686641000448", ship: 3.5 },
  { slug: "over-door-hook-rack", store: "home", pid: "1976916875026530305", ship: 4 },
];

function retailPrice(cost, ship) {
  return Math.max(Math.ceil((cost + ship) / 0.646) - 0.01, cost + ship + 1.5);
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
const out = {};

for (const item of picks) {
  const data = await queryPid(token, item.pid);
  const v = data?.variants?.find((x) => Number(x.variantSellPrice) > 0) || data?.variants?.[0];
  if (!v?.vid) { console.log("FAIL", item.slug); continue; }
  const cost = Number(v.variantSellPrice ?? data.sellPrice ?? 0);
  const listed = Number(data.listedNum || 0);
  const images = (data.productImageSet?.length ? data.productImageSet : [data.bigImage]).slice(0, 7);
  const image = v.variantImage || images[0];
  if (image && !images.includes(image)) images.unshift(image);
  const price = retailPrice(cost, item.ship);
  out[item.slug] = {
    slug: item.slug, store: item.store, pid: data.pid, cjName: data.productNameEn,
    supplierSku: data.productSku, cjVid: v.vid, cjSku: v.variantSku, image, images,
    cost, shippingEst: item.ship, price, compareAtPrice: Math.ceil(price * 1.1) - 0.01,
    listedNum: listed, ...naturalSocialProof(item.slug, listed),
  };
  console.log("OK", item.slug, data.productNameEn.slice(0, 50));
}

writeFileSync(resolve(__dirname, "cj-pid-updates.json"), JSON.stringify(out, null, 2));
