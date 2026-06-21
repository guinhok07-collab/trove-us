/** Refresh CJ images + swap cat perch to better SKU with 5 HD photos */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TARGET_MARGIN = 0.2;
const PAYPAL_RATE = 0.034;

const REFRESH = [
  { slug: "cat-window-perch", pid: "1427158310251008000", ship: 5 },
  { slug: "ice-cube-tray-silicone", pid: "1777174523490607104", ship: 3.5 },
];

function retailPrice(cost, shipping) {
  const base = cost + shipping;
  return Math.max(Math.ceil(base / (1 - TARGET_MARGIN - PAYPAL_RATE)) - 0.01, base + 1.5);
}

function rankImages(urls) {
  const unique = [...new Set(urls.filter(Boolean))];
  return unique.sort((a, b) => {
    const score = (u) => {
      let s = 0;
      if (/\.jpe?g$/i.test(u) && !u.includes("_trans")) s += 100;
      if (u.includes("oss-cf")) s += 50;
      if (u.includes(".png")) s -= 20;
      return s;
    };
    return score(b) - score(a);
  });
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

function patchBlock(block, { image, images, supplierSku, cjVid, cjSku, price, compareAtPrice }) {
  let b = block;
  b = b.replace(/image: "[^"]+"/, `image: ${JSON.stringify(image)}`);
  const imgsJson = JSON.stringify(images, null, 4)
    .split("\n")
    .map((line, i) => (i === 0 ? line : "      " + line.trim()))
    .join("\n");
  b = b.replace(/images: \[[\s\S]*?\]/, `images: ${imgsJson}`);
  if (supplierSku) b = b.replace(/supplierSku: "[^"]+"/, `supplierSku: ${JSON.stringify(supplierSku)}`);
  if (cjVid) b = b.replace(/cjVid: "[^"]+"/, `cjVid: ${JSON.stringify(cjVid)}`);
  if (cjSku) b = b.replace(/cjSku: "[^"]+"/, `cjSku: ${JSON.stringify(cjSku)}`);
  if (price) {
    b = b.replace(/price: [\d.]+/, `price: ${price.toFixed(2)}`);
    b = b.replace(/compareAtPrice: [\d.]+/, `compareAtPrice: ${compareAtPrice.toFixed(2)}`);
  }
  return b;
}

const token = await getToken();
const productsPath = resolve(__dirname, "../src/data/products.ts");
let source = readFileSync(productsPath, "utf8");

for (const item of REFRESH) {
  const data = await queryPid(token, item.pid);
  if (!data) { console.log("FAIL", item.slug); continue; }
  const v = data.variants?.find((x) => Number(x.variantSellPrice) > 0) || data.variants?.[0];
  const images = rankImages([v?.variantImage, data.bigImage, ...(data.productImageSet || [])]);
  const cost = Number(v?.variantSellPrice ?? data.sellPrice ?? 0);
  const price = retailPrice(cost, item.ship);
  const compareAtPrice = Math.ceil(price * 1.1) - 0.01;

  const slugIdx = source.indexOf(`slug: "${item.slug}"`);
  const blockStart = source.lastIndexOf("{", slugIdx);
  const blockEnd = source.indexOf("\n  }", slugIdx);
  const block = source.slice(blockStart, blockEnd);
  const patched = patchBlock(block, {
    image: images[0],
    images: images.slice(0, 8),
    supplierSku: data.productSku,
    cjVid: v.vid,
    cjSku: v.variantSku,
    price,
    compareAtPrice,
  });
  source = source.slice(0, blockStart) + patched + source.slice(blockEnd);
  console.log("OK", item.slug, data.productNameEn.slice(0, 55), "|", images.length, "imgs");
}

writeFileSync(productsPath, source);
