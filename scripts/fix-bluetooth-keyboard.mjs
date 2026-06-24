/**
 * Fix bluetooth-keyboard-mini — relink to a real keyboard (not desk pad).
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
  supplierImages,
} from "./lib/cj-catalog-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const key = process.env.CJ_API_KEY;
if (!key) throw new Error("Set CJ_API_KEY");

const slug = "bluetooth-keyboard-mini";
const PREFERRED_PID = "1990607329773793281";

const token = await getToken(key);
const data = await queryPid(token, PREFERRED_PID);
if (!data) {
  console.error("Keyboard PID not found on CJ");
  process.exit(1);
}

const v = data.variants?.find((x) => Number(x.variantSellPrice) > 0) || data.variants?.[0];
const imgs = supplierImages(data, v);
if (imgs.length < 4) {
  console.error("Keyboard has too few images");
  process.exit(1);
}

const picked = { data, v };
console.log("PICKED", data.productNameEn);

const ship = 4;
const variants = buildVariantsFromData(picked.data, ship);
const def = variants.find((item) => item.cjVid === picked.v.vid) || variants[0];
const price = retailPrice(Number(picked.v.variantSellPrice || 0), ship);
const cap = compareAt(price);

const copy = {
  name: "Mini Bluetooth Keyboard",
  description: "Slim wireless keyboard for tablet, TV, and travel setups.",
  longDescription:
    "Type comfortably on an iPad, Fire TV, or phone with a rechargeable Bluetooth keyboard that pairs in seconds. Quiet keys won't disturb roommates and the slim profile fits in a laptop sleeve pocket. One keyboard for couch browsing and hotel work sessions. Ships from our US warehouse in 3–5 business days.",
  features: ["Bluetooth pairing", "Rechargeable battery", "Quiet keys", "Travel slim profile"],
};

const productsPath = resolve(__dirname, "../src/data/products.ts");
const variantsPath = resolve(__dirname, "../src/data/product-variants.json");

let source = readFileSync(productsPath, "utf8");
source = replaceProductBlock(source, slug, (block) => {
  let b = block;
  b = b.replace(/name: "[^"]+"/, `name: ${JSON.stringify(copy.name)}`);
  b = b.replace(/description: "[^"]+"/, `description: ${JSON.stringify(copy.description)}`);
  b = b.replace(
    /longDescription:\s*\n\s*"[^"]*"/,
    `longDescription:\n      ${JSON.stringify(copy.longDescription)}`,
  );
  b = b.replace(/features: \[[\s\S]*?\]/, `features: ${JSON.stringify(copy.features)}`);
  b = b.replace(/supplierSku: "[^"]+"/, `supplierSku: ${JSON.stringify(picked.data.productSku)}`);
  b = b.replace(/cjVid: "[^"]+"/, `cjVid: ${JSON.stringify(def.cjVid)}`);
  b = b.replace(/cjSku: "[^"]+"/, `cjSku: ${JSON.stringify(def.cjSku)}`);
  b = b.replace(/price: [\d.]+/, `price: ${price.toFixed(2)}`);
  b = b.replace(/compareAtPrice: [\d.]+/, `compareAtPrice: ${cap.toFixed(2)}`);
  b = b.replace(/image: "[^"]+"/, `image: ${JSON.stringify(def.image)}`);
  b = b.replace(/images: \[[\s\S]*?\]/, `images: ${formatImages(def.images)}`);
  return b;
});

writeFileSync(productsPath, source);
const catalog = JSON.parse(readFileSync(variantsPath, "utf8"));
catalog[slug] = { defaultVariantId: def.id, variants };
writeFileSync(variantsPath, JSON.stringify(catalog, null, 2));
console.log("DONE", slug, `$${price.toFixed(2)}`);
