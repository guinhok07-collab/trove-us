/**
 * Sync CJ variants + supplier-order images for every catalog product.
 * Usage: node --env-file=.env.local scripts/sync-all-variants.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  API,
  compareAt,
  enrichVariantCatalog,
  extractProductBlock,
  formatImages,
  getToken,
  replaceProductBlock,
  retailPrice,
  sleep,
  supplierImages,
  variantLabel,
} from "./lib/cj-catalog-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const key = process.env.CJ_API_KEY;
if (!key) throw new Error("Set CJ_API_KEY");

const productsPath = resolve(__dirname, "../src/data/products.ts");
const variantsPath = resolve(__dirname, "../src/data/product-variants.json");

function patchBlock(block, { image, images, video }) {
  let b = block;
  b = b.replace(/image: "[^"]+"/, `image: ${JSON.stringify(image)}`);
  b = b.replace(/images: \[[\s\S]*?\]/, `images: ${formatImages(images)}`);
  if (video) {
    if (/video: /.test(b)) {
      b = b.replace(/video: "[^"]+"/, `video: ${JSON.stringify(video)}`);
    } else {
      b = b.replace(/(images: \[[\s\S]*?\],)\r?\n/, `$1\r\n    video: ${JSON.stringify(video)},\r\n`);
    }
  } else {
    b = b.replace(/\r?\n    video: "[^"]+",/, "");
  }
  return b;
}

async function queryBySku(token, cjSku) {
  await sleep(1100);
  const res = await fetch(`${API}/product/query?variantSku=${encodeURIComponent(cjSku)}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());
  if (!res.result) return null;
  return res.data;
}

let source = readFileSync(productsPath, "utf8");
const slugs = [...source.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]);
const token = await getToken(key);
const variantCatalog = {};
let ok = 0;
let skip = 0;

for (const slug of slugs) {
  const hit = extractProductBlock(source, slug);
  if (!hit) {
    console.log("NO_BLOCK", slug);
    skip++;
    continue;
  }

  const cjSku = hit.block.match(/cjSku: "([^"]+)"/)?.[1];
  const cjVid = hit.block.match(/cjVid: "([^"]+)"/)?.[1];

  if (!cjSku) {
    skip++;
    continue;
  }

  const data = await queryBySku(token, cjSku);
  if (!data?.variants?.length) {
    console.log("FAIL", slug);
    skip++;
    continue;
  }

  const parentSku = data.productSku || "";
  const productNameEn = data.productNameEn || "";
  const sellable = data.variants.filter((v) => Number(v.variantSellPrice) > 0);
  const pool = sellable.length ? sellable : data.variants;

  const rawVariants = [];
  const seenVid = new Set();

  for (const v of pool) {
    if (!v?.vid || seenVid.has(v.vid)) continue;
    seenVid.add(v.vid);
    const images = supplierImages(data, v);
    if (!images.length) continue;
    const cost = Number(v.variantSellPrice ?? data.sellPrice ?? 0);
    const price = retailPrice(cost, 3.5);
    const key = (v.variantKey || "").trim();
    rawVariants.push({
      id: v.vid,
      label: variantLabel(v, parentSku, productNameEn),
      cjVid: v.vid,
      cjSku: v.variantSku,
      price,
      compareAtPrice: compareAt(price),
      image: images[0],
      images,
      inStock: true,
      variantKey: key || undefined,
    });
  }

  const variants = enrichVariantCatalog(rawVariants, productNameEn);

  if (!variants.length) {
    console.log("NO_VARIANTS", slug);
    skip++;
    continue;
  }

  const defaultVariant =
    variants.find((v) => v.cjVid === cjVid) ||
    variants.find((v) => v.cjSku === cjSku) ||
    variants[0];

  variantCatalog[slug] = {
    defaultVariantId: defaultVariant.id,
    variants,
  };

  const video =
    typeof data.productVideo === "string" && data.productVideo.startsWith("http")
      ? data.productVideo
      : undefined;

  source = replaceProductBlock(source, slug, (block) =>
    patchBlock(block, {
      image: defaultVariant.image,
      images: defaultVariant.images,
      video,
    }),
  );
  ok++;
  console.log("OK", slug, variants.length, "variants", defaultVariant.images.length, "imgs");
}

writeFileSync(productsPath, source);
writeFileSync(variantsPath, JSON.stringify(variantCatalog, null, 2));
console.log(`\nSynced ${ok} products, ${skip} skipped → product-variants.json`);
