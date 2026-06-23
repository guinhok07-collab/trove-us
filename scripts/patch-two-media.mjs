/** Patch sleep mask + gaming mouse pad with CJ listings that have more photos */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PATCHES = [
  { slug: "sleep-eye-mask", pid: "1887765699470733313" },
  { slug: "gaming-mouse-pad-large", pid: "2038892554162925570" },
];

function formatImages(images) {
  return JSON.stringify(images, null, 4)
    .split("\n")
    .map((line, idx) => (idx === 0 ? line : "      " + line.trim()))
    .join("\n");
}

function parseImages(data, v) {
  const raw = [v?.variantImage, data.bigImage, ...(data.productImageSet || [])].filter(Boolean);
  return [...new Set(raw)].slice(0, 10);
}

const auth = await fetch(`${API}/authentication/getAccessToken`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ apiKey: key }),
}).then((r) => r.json());
const token = auth.data.accessToken;

const path = resolve(__dirname, "../src/data/products.ts");
let source = readFileSync(path, "utf8");

for (const { slug, pid } of PATCHES) {
  await sleep(1200);
  const res = await fetch(`${API}/product/query?pid=${pid}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());
  const data = res.data;
  const v = data.variants?.find((x) => Number(x.variantSellPrice) > 0) || data.variants?.[0];
  const images = parseImages(data, v);
  const slugIdx = source.indexOf(`slug: "${slug}"`);
  const blockStart = source.lastIndexOf("\n  {", slugIdx);
  const blockEnd = source.indexOf("\n  }", slugIdx);
  let block = source.slice(blockStart, blockEnd);
  block = block.replace(/image: "[^"]+"/, `image: ${JSON.stringify(images[0])}`);
  block = block.replace(/images: \[[\s\S]*?\]/, `images: ${formatImages(images)}`);
  block = block.replace(/supplierSku: "[^"]+"/, `supplierSku: ${JSON.stringify(data.productSku)}`);
  block = block.replace(/cjVid: "[^"]+"/, `cjVid: ${JSON.stringify(v.vid)}`);
  block = block.replace(/cjSku: "[^"]+"/, `cjSku: ${JSON.stringify(v.variantSku)}`);
  source = source.slice(0, blockStart) + block + source.slice(blockEnd);
  console.log("PATCHED", slug, images.length, "imgs");
}

writeFileSync(path, source);
