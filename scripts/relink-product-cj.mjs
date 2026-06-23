/**
 * Relink an existing slug to a verified CJ PID (fixes wrong/missing variants).
 * Usage: node --env-file=.env.local scripts/relink-product-cj.mjs <slug> <pid> [ship]
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  buildVariantsFromData,
  compareAt,
  formatImages,
  getToken,
  queryPid,
  replaceProductBlock,
  retailPrice,
} from "./lib/cj-catalog-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const key = process.env.CJ_API_KEY;
if (!key) throw new Error("Set CJ_API_KEY");

const slug = process.argv[2];
const pid = process.argv[3];
const ship = Number(process.argv[4] || 3.5);

if (!slug || !pid) {
  console.error("Usage: relink-product-cj.mjs <slug> <pid> [ship]");
  process.exit(1);
}

const productsPath = resolve(__dirname, "../src/data/products.ts");
const variantsPath = resolve(__dirname, "../src/data/product-variants.json");

let source = readFileSync(productsPath, "utf8");
const oldSku = source.match(new RegExp(`slug: "${slug}"[\\s\\S]*?cjSku: "([^"]+)"`))?.[1];

const token = await getToken(key);
const data = await queryPid(token, pid);
if (!data?.variants?.length) throw new Error("CJ query failed or no variants");

const variants = buildVariantsFromData(data, ship);
const defaultVariant =
  variants.find((v) => v.cjSku === oldSku) || variants[0];

const cost = Number(
  data.variants.find((v) => v.vid === defaultVariant.cjVid)?.variantSellPrice ?? data.sellPrice ?? 0,
);
const price = retailPrice(cost, ship);
const compareAtPrice = compareAt(price);

source = replaceProductBlock(source, slug, (block) => {
  let b = block;
  b = b.replace(/supplierSku: "[^"]+"/, `supplierSku: ${JSON.stringify(data.productSku)}`);
  b = b.replace(/cjVid: "[^"]+"/, `cjVid: ${JSON.stringify(defaultVariant.cjVid)}`);
  b = b.replace(/cjSku: "[^"]+"/, `cjSku: ${JSON.stringify(defaultVariant.cjSku)}`);
  b = b.replace(/price: [\d.]+/, `price: ${price.toFixed(2)}`);
  b = b.replace(/compareAtPrice: [\d.]+/, `compareAtPrice: ${compareAtPrice.toFixed(2)}`);
  b = b.replace(/image: "[^"]+"/, `image: ${JSON.stringify(defaultVariant.image)}`);
  b = b.replace(/images: \[[\s\S]*?\]/, `images: ${formatImages(defaultVariant.images)}`);
  return b;
});

writeFileSync(productsPath, source);

const catalog = JSON.parse(readFileSync(variantsPath, "utf8"));
catalog[slug] = {
  defaultVariantId: defaultVariant.id,
  variants,
};
writeFileSync(variantsPath, JSON.stringify(catalog, null, 2));

console.log("OK", slug, "→", data.productNameEn?.slice(0, 60));
console.log("Variants:", variants.length, variants.map((v) => v.label).join(", "));
console.log("Price:", price.toFixed(2), "default:", defaultVariant.label);
