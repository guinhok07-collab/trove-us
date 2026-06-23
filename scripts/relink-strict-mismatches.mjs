/**
 * Strict CJ relink for known mismatched slugs (must match ALL keywords).
 * Usage: node --env-file=.env.local scripts/relink-strict-mismatches.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { naturalSocialProof } from "./social-proof.mjs";
import {
  API,
  buildVariantsFromData,
  compareAt,
  getToken,
  queryPid,
  retailPrice,
  sleep,
  supplierImages,
} from "./lib/cj-catalog-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const key = process.env.CJ_API_KEY;
if (!key) throw new Error("Set CJ_API_KEY");

const FIXES = [
  { slug: "interactive-cat-toy", store: "pet", q: "interactive cat toy feather ball", must: ["cat", "toy"], ban: ["dog only", "leash", "usb charger"], ship: 3.5 },
  { slug: "closet-organizer-6-shelf", store: "home", q: "closet organizer hanging shelves 6 tier", must: ["closet", "organizer"], ban: ["shoe rack only", "jeans"], ship: 4.5 },
  { slug: "spice-rack-organizer", store: "home", q: "spice rack organizer cabinet pantry", must: ["spice"], ban: ["jeans", "pants", "dress"], ship: 4.5 },
  { slug: "foldable-laundry-hamper", store: "home", q: "foldable laundry hamper basket clothes", must: ["laundry", "hamper"], ban: ["shoe brush", "cleaning brush"], ship: 5 },
  { slug: "cable-clips-adhesive", store: "tech", q: "adhesive cable clips organizer desk", must: ["cable", "clip"], ban: ["charger cable", "usb cable", "bracelet"], ship: 3.5 },
  { slug: "adhesive-wall-hooks", store: "home", q: "adhesive wall hooks heavy duty 4 pack", must: ["hook"], ban: ["poop bag", "pet waste", "garbage bag"], ship: 3.5 },
  { slug: "over-door-hook-rack", store: "home", q: "over door hook hanger rack 5 hooks", must: ["over door", "hook"], ban: ["socks", "plant hanger", "macrame"], ship: 4 },
  { slug: "kitchen-sink-organizer", store: "home", q: "kitchen sink caddy organizer sponge holder", must: ["sink"], ban: ["cup washer", "bar counter", "water bottle"], ship: 3.5 },
  { slug: "led-motion-night-light", store: "home", q: "led motion sensor night light plug", must: ["motion", "night light"], ban: ["bluetooth speaker", "g lamp speaker"], ship: 3.5 },
  { slug: "back-posture-trainer", store: "wellness", q: "back posture corrector trainer support belt", must: ["posture"], ban: ["car seat", "car storage", "tray"], ship: 4 },
  { slug: "hand-grip-strengthener", store: "wellness", q: "hand grip strengthener adjustable forearm", must: ["grip strengthener", "hand grip"], ban: ["beanie", "hat", "finger stretcher only"], ship: 3.5 },
  { slug: "ice-roller-face", store: "wellness", q: "ice roller face depuff skincare tool", must: ["ice roller", "face"], ban: ["trigger point", "massage roller stick"], ship: 3.5 },
  { slug: "car-charger-usb-c", store: "tech", q: "car charger usb c fast charging dual port", must: ["car charger"], ban: ["tumbler", "cup", "hub sd card only"], ship: 3.5 },
  { slug: "smartwatch-band-silicone", store: "tech", q: "silicone smartwatch band 38mm 42mm", must: ["watch band", "watch strap"], ban: ["smartwatch women bt", "square smartwatch"], ship: 3.5 },
  { slug: "cable-management-box", store: "tech", q: "cable management box organizer desk", must: ["cable management", "cable box"], ban: ["usb charging cable", "bracelet"], ship: 4 },
  { slug: "lazy-susan-turntable", store: "home", q: "lazy susan turntable organizer cabinet kitchen", must: ["lazy susan", "turntable"], ban: ["phone stand", "tablet stand"], ship: 4 },
  { slug: "refrigerator-organizer-bins", store: "home", q: "refrigerator organizer bins clear stackable", must: ["fridge", "refrigerator"], ban: ["ice mold", "ice cup", "mushroom"], ship: 4.5 },
];

function okName(name, must, ban) {
  const n = (name || "").toLowerCase();
  if (ban.some((b) => n.includes(b.toLowerCase()))) return false;
  return must.every((m) => n.includes(m.toLowerCase()));
}

function formatImages(images) {
  return JSON.stringify(images, null, 4)
    .split("\n")
    .map((line, idx) => (idx === 0 ? line : "      " + line.trim()))
    .join("\n");
}

async function searchStrict(token, item) {
  for (const page of [1, 2, 3]) {
    await sleep(1100);
    const params = new URLSearchParams({
      page: String(page),
      size: "40",
      keyWord: item.q,
      countryCode: "US",
      orderBy: "1",
      sort: "desc",
    });
    const list = await fetch(`${API}/product/listV2?${params}`, {
      headers: { "CJ-Access-Token": token },
    }).then((r) => r.json());

    const hits = (list.data?.content || [])
      .flatMap((g) => g.productList || [])
      .sort((a, b) => (b.listedNum || 0) - (a.listedNum || 0));

    for (const hit of hits) {
      if (!okName(hit.nameEn, item.must, item.ban)) continue;
      const data = await queryPid(token, hit.id);
      if (!data || !okName(data.productNameEn, item.must, item.ban)) continue;
      const variant =
        data.variants?.find((v) => Number(v.variantSellPrice) > 0) || data.variants?.[0];
      if (!variant?.vid) continue;
      const cost = Number(variant.variantSellPrice ?? 0);
      if (cost < 0.4 || cost > 42) continue;
      const images = supplierImages(data, variant);
      if (images.length < 4) continue;
      return { data, variant };
    }
  }
  return null;
}

const productsPath = resolve(__dirname, "../src/data/products.ts");
const variantsPath = resolve(__dirname, "../src/data/product-variants.json");
let source = readFileSync(productsPath, "utf8");
let catalog = JSON.parse(readFileSync(variantsPath, "utf8"));
const token = await getToken(key);

let ok = 0;
let fail = 0;

for (const item of FIXES) {
  const idx = source.indexOf(`slug: "${item.slug}"`);
  if (idx < 0) {
    console.log("SKIP missing", item.slug);
    continue;
  }
  const hit = await searchStrict(token, item);
  if (!hit) {
    fail++;
    console.log("FAIL", item.slug);
    continue;
  }

  const variants = buildVariantsFromData(hit.data, item.ship);
  const defaultVariant =
    variants.find((v) => v.cjVid === hit.variant.vid) || variants[0];
  const price = retailPrice(Number(hit.variant.variantSellPrice ?? 0), item.ship);
  const compareAtPrice = compareAt(price);

  const blockStart = source.lastIndexOf("\n  {", idx);
  const blockEnd = source.indexOf("\n  }", idx);
  let block = source.slice(blockStart, blockEnd);

  block = block.replace(/supplierSku: "[^"]+"/, `supplierSku: ${JSON.stringify(hit.data.productSku)}`);
  block = block.replace(/cjVid: "[^"]+"/, `cjVid: ${JSON.stringify(defaultVariant.cjVid)}`);
  block = block.replace(/cjSku: "[^"]+"/, `cjSku: ${JSON.stringify(defaultVariant.cjSku)}`);
  block = block.replace(/price: [\d.]+/, `price: ${price.toFixed(2)}`);
  block = block.replace(/compareAtPrice: [\d.]+/, `compareAtPrice: ${compareAtPrice.toFixed(2)}`);
  block = block.replace(/image: "[^"]+"/, `image: ${JSON.stringify(defaultVariant.image)}`);
  block = block.replace(/images: \[[\s\S]*?\]/, `images: ${formatImages(defaultVariant.images)}`);

  source = source.slice(0, blockStart) + block + source.slice(blockEnd);
  catalog[item.slug] = { defaultVariantId: defaultVariant.id, variants };
  ok++;
  console.log("OK", item.slug, "→", hit.data.productNameEn?.slice(0, 55), variants.length, "vars");
}

writeFileSync(productsPath, source);
writeFileSync(variantsPath, JSON.stringify(catalog, null, 2));
console.log(`\nStrict relink: ${ok} ok, ${fail} fail`);
