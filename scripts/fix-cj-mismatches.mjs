/**
 * Strict CJ relink for known catalog mismatches.
 * Usage: node --env-file=.env.local scripts/fix-cj-mismatches.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  API,
  buildVariantsFromData,
  cjMatchesListing,
  compareAt,
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
const copyPath = resolve(__dirname, "product-copy.json");
const copy = JSON.parse(readFileSync(copyPath, "utf8"));

const FIXES = [
  {
    slug: "interactive-cat-toy",
    store: "pet",
    ship: 4,
    q: "interactive cat toy automatic ball feather",
    must: ["cat", "toy"],
    ban: ["dog only", "leash", "harness", "bird cage"],
    copy: copy["interactive-cat-toy"],
  },
  {
    slug: "pet-deshedding-tool",
    store: "pet",
    ship: 3.5,
    q: "pet deshedding brush undercoat rake stainless",
    must: ["shed", "brush"],
    ban: ["glove", "mitt", "steam", "vacuum", "lint roller"],
    copy: copy["pet-deshedding-tool"],
  },
  {
    slug: "jump-rope-weighted",
    store: "wellness",
    ship: 3.5,
    q: "speed jump rope adjustable fitness skipping",
    must: ["jump rope"],
    ban: ["bluetooth", "smart bluetooth", "counter", "resistance band", "dog leash"],
    copy: {
      name: "Adjustable Speed Jump Rope",
      description: "Cardio anywhere — adjustable length for HIIT, boxing, and home workouts.",
      longDescription:
        "Burn calories in small spaces with a tangle-free jump rope built for fast spins and daily training. Foam grips stay comfortable during longer sessions and the length adjusts for different heights. Fits in a gym bag for travel workouts. Ships from our US warehouse in 3–5 business days.",
      features: ["Ball-bearing handles", "Adjustable length", "Foam grips", "Tangle-resistant cord"],
    },
  },
  {
    slug: "portable-blender-bottle",
    store: "wellness",
    ship: 4.5,
    q: "portable usb juicer blender cup smoothie rechargeable",
    must: ["blender"],
    ban: ["makeup", "brush cleaner", "garlic", "chopper", "beauty", "food processor"],
    copy: {
      name: "Portable USB Smoothie Blender",
      description: "Rechargeable personal blender for protein shakes on the go.",
      longDescription:
        "Blend smoothies at the gym, office, or hotel with a compact USB-rechargeable cup blender. BPA-free jar rinses clean fast and the six-blade base handles frozen fruit and protein powder. One-button operation — no countertop space needed. Ships from our US warehouse in 3–5 business days.",
      features: ["USB rechargeable", "BPA-free cup", "6-blade base", "Travel size"],
    },
  },
  {
    slug: "mason-jar-storage-lids",
    store: "home",
    ship: 3.5,
    q: "mason jar storage lids pour shaker pantry caps",
    must: ["mason", "lid"],
    ban: ["metal ring", "jar band", "split-type", "canning ring only"],
    copy: {
      name: "Mason Jar Storage Lid Set",
      description: "Pour and shaker lids turn jars into pantry storage.",
      longDescription:
        "Organize dry goods with leak-resistant lids that fit standard mason jars. Pour spouts and shaker tops make flour, snacks, and spices easy to use without transferring containers. BPA-free caps rinse clean and stack neatly in drawers. Ships from our US warehouse in 3–5 business days.",
      features: ["Pour + shaker lids", "Leak-resistant seal", "BPA-free caps", "Pantry friendly"],
    },
  },
  {
    slug: "silicone-utensil-rest",
    store: "home",
    ship: 3.5,
    q: "silicone spoon rest spatula holder stove kitchen",
    must: ["spoon rest"],
    ban: ["dish rack", "drying rack", "drainboard", "colander", "tier dish"],
    copy: {
      name: "Silicone Spoon Rest",
      description: "Keeps counters clean while cooking — holds ladles and spatulas.",
      longDescription:
        "Stop sauce drips on the counter with a heat-resistant spoon rest that sits beside the stove. Wide cradle fits ladles, tongs, and spatulas during busy meal prep. Dishwasher safe silicone rinses clean in seconds. Ships from our US warehouse in 3–5 business days.",
      features: ["Heat resistant", "Wide cradle", "Non-slip base", "Dishwasher safe"],
    },
  },
  {
    slug: "over-sink-dish-rack",
    store: "home",
    ship: 4.5,
    q: "roll up dish drying rack over sink silicone",
    must: ["dish", "rack"],
    ban: ["2-tier dish drying", "dishwasher machine", "cabinet organizer", "tier dish"],
    copy: {
      name: "Over-Sink Roll-Up Dish Drying Rack",
      description: "Rolls out over the sink for extra drying space — stores flat.",
      longDescription:
        "Small kitchen? Roll this rack over the sink to air-dry plates and glasses without a bulky dish drainer on the counter. Silicone-coated steel bars support heavy pots and roll up for drawer storage. Ships from our US warehouse in 3–5 business days.",
      features: ["Roll-up design", "Over-sink fit", "Heat resistant bars", "Space saving"],
    },
  },
];

function mustAll(name, must) {
  const n = (name || "").toLowerCase();
  return must.every((m) => n.includes(m.toLowerCase()));
}

async function searchStrict(token, item) {
  const queries = [item.q, item.copy?.name].filter(Boolean);

  for (const q of [...new Set(queries)]) {
    for (const page of [1, 2, 4]) {
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
        if (!mustAll(hit.nameEn, item.must)) continue;
        if (!okName(hit.nameEn, item.must, item.ban, { all: false })) continue;

        const data = await queryPid(token, hit.id);
        if (!data || !mustAll(data.productNameEn, item.must)) continue;
        if (!okName(data.productNameEn, item.must, item.ban, { all: false })) continue;

        const match = cjMatchesListing(
          item.slug,
          item.copy.name,
          item.copy.description,
          item.copy.features,
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

for (const item of FIXES) {
  const hit = await searchStrict(token, item);
  if (!hit) {
    fail++;
    console.log("FAIL", item.slug, "—", item.copy.name);
    continue;
  }

  const variants = buildVariantsFromData(hit.data, item.ship);
  const defaultVariant =
    variants.find((v) => v.cjVid === hit.variant.vid) || variants[0];
  const price = retailPrice(Number(hit.variant.variantSellPrice ?? 0), item.ship);
  const compareAtPrice = compareAt(price);
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
    b = b.replace(/supplierSku: "[^"]+"/, `supplierSku: ${JSON.stringify(hit.data.productSku)}`);
    b = b.replace(/cjVid: "[^"]+"/, `cjVid: ${JSON.stringify(defaultVariant.cjVid)}`);
    b = b.replace(/cjSku: "[^"]+"/, `cjSku: ${JSON.stringify(defaultVariant.cjSku)}`);
    b = b.replace(/price: [\d.]+/, `price: ${price.toFixed(2)}`);
    b = b.replace(/compareAtPrice: [\d.]+/, `compareAtPrice: ${compareAtPrice.toFixed(2)}`);
    b = b.replace(/image: "[^"]+"/, `image: ${JSON.stringify(defaultVariant.image)}`);
    b = b.replace(/images: \[[\s\S]*?\]/, `images: ${formatImages(defaultVariant.images)}`);
    return b;
  });

  catalog[item.slug] = { defaultVariantId: defaultVariant.id, variants };
  ok++;
  console.log(
    "OK",
    item.slug,
    `$${price.toFixed(2)}`,
    `(${Math.round(hit.match.nameScore * 100)}% name)`,
    "→",
    hit.data.productNameEn?.slice(0, 58),
    variants.length,
    "vars",
  );
}

writeFileSync(productsPath, source);
writeFileSync(variantsPath, JSON.stringify(catalog, null, 2));
console.log(`\nCJ mismatch fix: ${ok} ok, ${fail} fail / ${FIXES.length}`);
