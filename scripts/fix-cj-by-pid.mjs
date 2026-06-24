/**
 * Relink known mismatches by verified CJ PID + update Trove copy to match.
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

const FIXES = [
  {
    slug: "portable-blender-bottle",
    pid: "1392009095543918592",
    ship: 4.5,
    copy: {
      name: "Portable USB Smoothie Blender",
      description: "Rechargeable personal blender for protein shakes on the go.",
      longDescription:
        "Blend smoothies at the gym, office, or hotel with a compact USB-rechargeable cup blender. BPA-free jar rinses clean fast and the six-blade base handles frozen fruit and protein powder. One-button operation — no countertop space needed. Ships from our US warehouse in 3–5 business days.",
      features: ["USB rechargeable", "BPA-free cup", "6-blade base", "Travel size"],
    },
  },
  {
    slug: "jump-rope-weighted",
    pid: "1680142560670928896",
    ship: 3.5,
    copy: {
      name: "Adjustable Speed Jump Rope",
      description: "Cardio anywhere — adjustable length for HIIT, boxing, and home workouts.",
      longDescription:
        "Burn calories in small spaces with a tangle-free jump rope built for fast spins and daily training. Comfortable silicone handles stay secure during longer sessions and the length adjusts for different heights. Fits in a gym bag for travel workouts. Ships from our US warehouse in 3–5 business days.",
      features: ["Adjustable length", "Comfort grip handles", "Speed training", "Tangle-resistant cord"],
    },
  },
  {
    slug: "silicone-utensil-rest",
    pid: "E94267B1-13A3-430A-B115-24054FB706B3",
    ship: 3.5,
    copy: {
      name: "Stainless Steel Spoon Rest",
      description: "Keeps counters clean while cooking — holds ladles and spatulas.",
      longDescription:
        "Stop sauce drips on the counter with a heat-resistant spoon rest that sits beside the stove. Wide cradle fits ladles, tongs, and spatulas during busy meal prep. Wipes clean in seconds and stays stable on busy counters. Ships from our US warehouse in 3–5 business days.",
      features: ["Heat resistant", "Wide cradle", "Stable base", "Easy to clean"],
    },
  },
];

const productsPath = resolve(__dirname, "../src/data/products.ts");
const variantsPath = resolve(__dirname, "../src/data/product-variants.json");

let source = readFileSync(productsPath, "utf8");
let catalog = JSON.parse(readFileSync(variantsPath, "utf8"));
const token = await getToken(key);
let ok = 0;

for (const item of FIXES) {
  if (item.relabelOnly) {
    source = replaceProductBlock(source, item.slug, (block) => {
      let b = block;
      const c = item.copy;
      b = b.replace(/name: "[^"]+"/, `name: ${JSON.stringify(c.name)}`);
      b = b.replace(/description: "[^"]+"/, `description: ${JSON.stringify(c.description)}`);
      b = b.replace(
        /longDescription:\s*\n\s*"[^"]*"/,
        `longDescription:\n      ${JSON.stringify(c.longDescription)}`,
      );
      b = b.replace(/features: \[[\s\S]*?\]/, `features: ${JSON.stringify(c.features)}`);
      return b;
    });
    ok++;
    console.log("RELABEL", item.slug, "→", item.copy.name);
    continue;
  }

  const data = await queryPid(token, item.pid);
  if (!data) {
    console.log("FAIL PID", item.slug, item.pid);
    continue;
  }

  const v = data.variants?.find((x) => Number(x.variantSellPrice) > 0) || data.variants?.[0];
  const variants = buildVariantsFromData(data, item.ship);
  const def = variants.find((x) => x.cjVid === v.vid) || variants[0];
  const price = retailPrice(Number(v.variantSellPrice || 0), item.ship);
  const cap = compareAt(price);
  const c = item.copy;

  source = replaceProductBlock(source, item.slug, (block) => {
    let b = block;
    b = b.replace(/name: "[^"]+"/, `name: ${JSON.stringify(c.name)}`);
    b = b.replace(/description: "[^"]+"/, `description: ${JSON.stringify(c.description)}`);
    b = b.replace(
      /longDescription:\s*\n\s*"[^"]*"/,
      `longDescription:\n      ${JSON.stringify(c.longDescription)}`,
    );
    b = b.replace(/features: \[[\s\S]*?\]/, `features: ${JSON.stringify(c.features)}`);
    b = b.replace(/supplierSku: "[^"]+"/, `supplierSku: ${JSON.stringify(data.productSku)}`);
    b = b.replace(/cjVid: "[^"]+"/, `cjVid: ${JSON.stringify(def.cjVid)}`);
    b = b.replace(/cjSku: "[^"]+"/, `cjSku: ${JSON.stringify(def.cjSku)}`);
    b = b.replace(/price: [\d.]+/, `price: ${price.toFixed(2)}`);
    b = b.replace(/compareAtPrice: [\d.]+/, `compareAtPrice: ${cap.toFixed(2)}`);
    b = b.replace(/image: "[^"]+"/, `image: ${JSON.stringify(def.image)}`);
    b = b.replace(/images: \[[\s\S]*?\]/, `images: ${formatImages(def.images)}`);
    return b;
  });

  catalog[item.slug] = { defaultVariantId: def.id, variants };
  ok++;
  console.log("OK", item.slug, `$${price.toFixed(2)}`, "→", data.productNameEn?.slice(0, 55));
}

writeFileSync(productsPath, source);
writeFileSync(variantsPath, JSON.stringify(catalog, null, 2));
console.log(`\nPID fix done: ${ok}/${FIXES.length}`);
