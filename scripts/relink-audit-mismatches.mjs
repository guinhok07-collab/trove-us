/**
 * Relink products flagged name_mismatch in catalog-cj-audit.json
 * with overlap validation + safe block replacement.
 * Usage: node --env-file=.env.local scripts/relink-audit-mismatches.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  API,
  buildVariantsFromData,
  cjMatchesListing,
  compareAt,
  extractProductBlock,
  formatImages,
  getToken,
  okName,
  queryPid,
  replaceProductBlock,
  retailPrice,
  sleep,
  supplierImages,
} from "./lib/cj-catalog-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const key = process.env.CJ_API_KEY;
if (!key) throw new Error("Set CJ_API_KEY");

const productsPath = resolve(__dirname, "../src/data/products.ts");
const variantsPath = resolve(__dirname, "../src/data/product-variants.json");
const auditPath = resolve(__dirname, "../src/data/catalog-cj-audit.json");
const copyPath = resolve(__dirname, "product-copy.json");

const copy = JSON.parse(readFileSync(copyPath, "utf8"));
const audit = JSON.parse(readFileSync(auditPath, "utf8"));
const onlySlugs = process.argv.slice(2);
const targets = audit.issues
  .filter((i) => i.types?.includes("name_mismatch"))
  .filter((i) => !onlySlugs.length || onlySlugs.includes(i.slug));

const SHIP = { pet: 4, home: 4, wellness: 3.5, tech: 3.5 };

const EXTRA = {
  "interactive-cat-toy": { must: ["cat", "toy"], ban: ["dog only", "leash"], q: "interactive cat toy ball feather" },
  "spice-rack-organizer": { must: ["spice"], ban: ["jeans", "fuel spray", "spray can"], q: "spice rack organizer tier" },
  "foldable-laundry-hamper": { must: ["laundry", "hamper"], ban: ["cable clip", "magnetic clip"], q: "foldable laundry hamper basket" },
  "garbage-bag-holder": { must: ["bag", "dispenser"], ban: ["shoe rack", "hook rack"], q: "dog poop bag dispenser holder clip" },
  "adhesive-wall-hooks": { must: ["hook"], ban: ["shoe rack", "poop bag", "garbage"], q: "adhesive wall hooks heavy duty" },
  "over-door-hook-rack": { must: ["over", "door", "hook"], ban: ["shoe rack", "socks", "plant hanger"], q: "over the door hook rack hanger" },
  "led-motion-night-light": { must: ["night light", "motion"], ban: ["camera", "wifi bulb", "bulb camera", "1080p", "speaker"], q: "motion sensor night light plug in led" },
  "hand-grip-strengthener": { must: ["grip"], ban: ["posture", "spine", "beanie"], q: "hand grip strengthener adjustable" },
  "ice-roller-face": { must: ["ice roller"], ban: ["posture", "spine", "trigger point stick"], q: "ice roller face skincare depuff" },
  "sd-card-reader-usb": { must: ["card reader"], ban: ["car charger", "tumbler"], q: "usb sd card reader adapter" },
  "cable-management-box": { must: ["cable", "box"], ban: ["watch band", "usb cable", "charging cable"], q: "cable management box power strip cover" },
  "smartwatch-band-silicone": { must: ["watch band", "watch strap"], ban: ["smartwatch bt", "fitness tracker watch"], q: "silicone smartwatch band strap" },
  "lazy-susan-turntable": { must: ["lazy susan", "turntable"], ban: ["phone stand", "spice only"], q: "lazy susan turntable rotating organizer" },
  "refrigerator-organizer-bins": { must: ["organizer", "bin"], ban: ["mini fridge", "skincare fridge"], q: "refrigerator organizer bins stackable clear" },
  "pet-paw-cleaner-cup": { must: ["paw", "clean"], ban: ["glove only", "lint"], q: "pet paw cleaner cup dog cat" },
  "dog-poop-bag-dispenser": { must: ["poop", "bag"], ban: ["water cup", "drinking"], q: "dog poop bag dispenser leash clip" },
  "pet-food-storage-container": { must: ["food", "storage"], ban: ["tea jar", "water cup", "garbage bag", "drinking", "three-in-one", "scale"], q: "airtight dog cat pet food storage container bin" },
  "closet-organizer-6-shelf": { must: ["closet", "organizer"], ban: ["shoe", "shoes bag", "entryway", "under bed"], q: "6 shelf hanging closet organizer fabric shelves" },
  "portable-blender-bottle": { must: ["blender"], ban: ["garlic", "chopper", "makeup", "brush cleaner", "beauty"], q: "portable usb juicer blender bottle smoothie" },
  "cable-clips-adhesive": { must: ["cable", "clip"], ban: ["bracelet", "usb cable 3m"], q: "adhesive cable clips organizer desk" },
  "kitchen-sink-organizer": { must: ["sink"], ban: ["folding drain rack only"], q: "kitchen sink sponge caddy organizer" },
  "jump-rope-weighted": { must: ["jump rope"], ban: ["resistance band", "yoga strap"], q: "weighted jump rope adjustable fitness" },
  "portable-blender-bottle": { must: ["blender"], ban: ["garlic", "chopper", "water bottle only"], q: "portable usb blender bottle smoothie" },
  "mason-jar-storage-lids": { must: ["mason", "lid"], ban: ["regular mouth jar only"], q: "mason jar lids storage caps pack" },
  "bluetooth-keyboard-mini": { must: ["keyboard"], ban: ["mouse only", "desk pad"], q: "bluetooth mini keyboard wireless" },
  "silicone-utensil-rest": { must: ["utensil", "rest"], ban: ["dish rack", "drying rack", "colander"], q: "silicone spoon rest utensil holder" },
  "car-charger-usb-c": { must: ["car charger"], ban: ["speaker", "lamp", "g shaped", "led lamp", "tumbler"], q: "usb c car charger fast charging dual port" },
};

function slugMust(slug) {
  const parts = slug.split("-").filter((w) => w.length > 3);
  return parts.slice(0, 3);
}

function grabBlockField(block, re) {
  return block.match(re)?.[1];
}

async function searchValidated(token, item, listing) {
  const queries = [
    item.q,
    listing.name,
    `${listing.name} ${slugMust(item.slug).join(" ")}`,
  ].filter(Boolean);

  for (const q of [...new Set(queries)]) {
    for (const page of [1, 2, 3]) {
      await sleep(1100);
      const params = new URLSearchParams({
        page: String(page),
        size: "40",
        keyWord: q,
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
        if (!okName(hit.nameEn, item.must, item.ban, { all: true })) continue;
        const data = await queryPid(token, hit.id);
        if (!data || !okName(data.productNameEn, item.must, item.ban, { all: true })) continue;

        const match = cjMatchesListing(
          item.slug,
          listing.name,
          listing.description,
          listing.features,
          data.productNameEn,
        );
        if (!match.ok) continue;

        const variant =
          data.variants?.find((v) => Number(v.variantSellPrice) > 0) || data.variants?.[0];
        if (!variant?.vid) continue;
        const cost = Number(variant.variantSellPrice ?? 0);
        if (cost < 0.4 || cost > 42) continue;
        const images = supplierImages(data, variant);
        if (images.length < 4) continue;
        return { data, variant, match };
      }
    }
  }
  return null;
}

let source = readFileSync(productsPath, "utf8");
let catalog = JSON.parse(readFileSync(variantsPath, "utf8"));
const token = await getToken(key);

let ok = 0;
let fail = 0;

for (const issue of targets) {
  const slug = issue.slug;
  const blockHit = extractProductBlock(source, slug);
  if (!blockHit) {
    console.log("SKIP missing block", slug);
    fail++;
    continue;
  }

  const listing = {
    name: copy[slug]?.name || grabBlockField(blockHit.block, /name: "([^"]+)"/),
    description: copy[slug]?.description || grabBlockField(blockHit.block, /description: "([^"]+)"/),
    features: copy[slug]?.features || [],
  };

  const store = grabBlockField(blockHit.block, /store: "([^"]+)"/) || issue.store;
  const ship = SHIP[store] || 3.5;
  const extra = EXTRA[slug] || {
    must: slugMust(slug),
    ban: ["dropshipping"],
    q: listing.name,
  };

  const hit = await searchValidated(token, { slug, ...extra }, listing);
  if (!hit) {
    fail++;
    console.log("FAIL", slug, "—", listing.name);
    continue;
  }

  const variants = buildVariantsFromData(hit.data, ship);
  const defaultVariant =
    variants.find((v) => v.cjVid === hit.variant.vid) || variants[0];
  const price = retailPrice(Number(hit.variant.variantSellPrice ?? 0), ship);
  const compareAtPrice = compareAt(price);

  source = replaceProductBlock(source, slug, (block) => {
    let b = block;
    b = b.replace(/supplierSku: "[^"]+"/, `supplierSku: ${JSON.stringify(hit.data.productSku)}`);
    b = b.replace(/cjVid: "[^"]+"/, `cjVid: ${JSON.stringify(defaultVariant.cjVid)}`);
    b = b.replace(/cjSku: "[^"]+"/, `cjSku: ${JSON.stringify(defaultVariant.cjSku)}`);
    b = b.replace(/price: [\d.]+/, `price: ${price.toFixed(2)}`);
    b = b.replace(/compareAtPrice: [\d.]+/, `compareAtPrice: ${compareAtPrice.toFixed(2)}`);
    b = b.replace(/image: "[^"]+"/, `image: ${JSON.stringify(defaultVariant.image)}`);
    b = b.replace(/images: \[[\s\S]*?\]/, `images: ${formatImages(defaultVariant.images)}`);
    return b;
  });

  catalog[slug] = { defaultVariantId: defaultVariant.id, variants };
  ok++;
  console.log(
    "OK",
    slug,
    `(${Math.round(hit.match.slugRatio * 100)}% slug / ${Math.round(hit.match.score * 100)}% overlap)`,
    "→",
    hit.data.productNameEn?.slice(0, 55),
    variants.length,
    "vars",
  );
}

writeFileSync(productsPath, source);
writeFileSync(variantsPath, JSON.stringify(catalog, null, 2));
console.log(`\nAudit relink: ${ok} ok, ${fail} fail / ${targets.length} mismatches`);
