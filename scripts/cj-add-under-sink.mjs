import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { naturalSocialProof } from "./social-proof.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getToken() {
  const auth = await fetch(`${API}/authentication/getAccessToken`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: key }),
  }).then((r) => r.json());
  return auth.data.accessToken;
}

async function queryPid(token, pid) {
  await sleep(1300);
  const res = await fetch(`${API}/product/query?pid=${encodeURIComponent(pid)}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());
  return res.result ? res.data : null;
}

function map(slug, store, data, ship) {
  const v = data.variants.find((x) => Number(x.variantSellPrice) > 0) || data.variants[0];
  const cost = Number(v.variantSellPrice ?? data.sellPrice ?? 0);
  const base = cost + ship;
  const price = Math.max(Math.ceil(base / 0.646) - 0.01, base + 1.5);
  const images = (data.productImageSet?.length ? data.productImageSet : [data.bigImage]).slice(0, 7);
  const image = v.variantImage || images[0];
  if (image && !images.includes(image)) images.unshift(image);
  const listed = Number(data.listedNum || 0);
  return {
    slug, store, pid: data.pid, name: data.productNameEn, supplierSku: data.productSku,
    cjVid: v.vid, cjSku: v.variantSku, image, images, cost, shippingEst: ship,
    price, compareAtPrice: Math.ceil(price * 1.1) - 0.01, listedNum: listed,
    ...naturalSocialProof(slug, listed), variantLabel: v.variantKey || v.variantNameEn,
  };
}

const token = await getToken();
const data = await queryPid(token, "1977570834089803777");
const existing = JSON.parse(readFileSync(resolve(__dirname, "cj-expand-results.json"), "utf8"));
if (data) {
  existing["under-sink-organizer"] = map("under-sink-organizer", "home", data, 4.5);
  console.log("OK under-sink-organizer");
}
delete existing["resistance-loop-bands"];
writeFileSync(resolve(__dirname, "cj-expand-results.json"), JSON.stringify(existing, null, 2));
