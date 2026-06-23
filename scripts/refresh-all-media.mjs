/**
 * Refresh all catalog images (+ video when CJ has one) from CJ API via variantSku.
 * Usage: node --env-file=.env.local scripts/refresh-all-media.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
if (!key) throw new Error("Set CJ_API_KEY");

const MIN_IMAGES = 3;
const MAX_IMAGES = 15;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseImageField(value) {
  const out = [];
  if (!value) return out;
  if (Array.isArray(value)) {
    for (const item of value) {
      out.push(...parseImageField(item));
    }
    return out;
  }
  if (typeof value !== "string") return out;
  const trimmed = value.trim();
  if (trimmed.startsWith("http")) return [trimmed];
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      return parseImageField(parsed);
    } catch {
      return out;
    }
  }
  return out;
}

function uniqueInOrder(urls) {
  const seen = new Set();
  const out = [];
  for (const u of urls) {
    if (typeof u !== "string" || !u.startsWith("http") || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

function extractMedia(data, variant) {
  const productSet = parseImageField(data?.productImageSet);
  const fallback = [
    ...parseImageField(data?.bigImage),
    ...parseImageField(data?.productImage),
  ];
  const base = productSet.length ? productSet : fallback;
  const variantImgs = parseImageField(variant?.variantImage);
  const images = uniqueInOrder([...variantImgs, ...base]).slice(0, MAX_IMAGES);
  const video =
    typeof data?.productVideo === "string" && data.productVideo.startsWith("http")
      ? data.productVideo
      : undefined;
  return { images, video };
}

function formatImages(images) {
  return JSON.stringify(images, null, 4)
    .split("\n")
    .map((line, idx) => (idx === 0 ? line : "      " + line.trim()))
    .join("\n");
}

function patchBlock(block, { image, images, video }) {
  let b = block;
  b = b.replace(/image: "[^"]+"/, `image: ${JSON.stringify(image)}`);
  const imgsJson = formatImages(images);
  b = b.replace(/images: \[[\s\S]*?\]/, `images: ${imgsJson}`);

  if (video) {
    if (/video: /.test(b)) {
      b = b.replace(/video: "[^"]+"/, `video: ${JSON.stringify(video)}`);
    } else {
      b = b.replace(
        /(images: \[[\s\S]*?\],)\n/,
        `$1\n    video: ${JSON.stringify(video)},\n`,
      );
    }
  } else {
    b = b.replace(/\n    video: "[^"]+",/, "");
  }
  return b;
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

async function queryBySku(token, cjSku) {
  await sleep(1100);
  const res = await fetch(`${API}/product/query?variantSku=${encodeURIComponent(cjSku)}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());
  if (!res.result) return null;
  const variant =
    res.data?.variants?.find((v) => v.variantSku === cjSku) ||
    res.data?.variants?.find((v) => Number(v.variantSellPrice) > 0) ||
    res.data?.variants?.[0];
  return { data: res.data, variant };
}

const productsPath = resolve(__dirname, "../src/data/products.ts");
let source = readFileSync(productsPath, "utf8");
const slugRe = /slug: "([^"]+)"/g;
const slugs = [...source.matchAll(slugRe)].map((m) => m[1]);

const token = await getToken();
let ok = 0;
let skip = 0;
let low = 0;
const usedVids = new Map();

for (const slug of slugs) {
  const slugIdx = source.indexOf(`slug: "${slug}"`);
  const blockStart = source.lastIndexOf("\n  {", slugIdx);
  const blockEnd = source.indexOf("\n  }", slugIdx);
  const block = source.slice(blockStart, blockEnd);

  const cjSku = block.match(/cjSku: "([^"]+)"/)?.[1];
  const cjVid = block.match(/cjVid: "([^"]+)"/)?.[1];
  if (!cjSku) {
    skip++;
    continue;
  }

  const hit = await queryBySku(token, cjSku);
  if (!hit?.data) {
    console.log("FAIL", slug);
    skip++;
    continue;
  }

  const { images, video } = extractMedia(hit.data, hit.variant);
  if (images.length < MIN_IMAGES) {
    console.log("LOW_IMGS", slug, images.length);
    low++;
    if (images.length === 0) {
      skip++;
      continue;
    }
  }

  const vid = hit.variant?.vid || cjVid;
  if (vid && usedVids.has(vid) && usedVids.get(vid) !== slug) {
    console.log("WARN duplicate vid", slug, "same as", usedVids.get(vid));
  }
  if (vid) usedVids.set(vid, slug);

  const patched = patchBlock(block, {
    image: images[0],
    images,
    video,
  });
  source = source.slice(0, blockStart) + patched + source.slice(blockEnd);
  ok++;
  const tag = video ? " +video" : "";
  console.log("OK", slug, images.length, "imgs" + tag);
}

writeFileSync(productsPath, source);
console.log(`\nDone: ${ok} refreshed, ${low} low-image, ${skip} skipped`);
