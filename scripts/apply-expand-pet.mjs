/**
 * Expand pet catalog with CJ bestsellers — 4+ images, unique cjVid, US warehouse.
 * Usage: node --env-file=.env.local scripts/apply-expand-pet.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { naturalSocialProof } from "./social-proof.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
if (!key) throw new Error("Set CJ_API_KEY in .env.local");

const TARGET_MARGIN = 0.2;
const PAYPAL_RATE = 0.034;
const MAX_RETAIL = 39.99;
const MIN_IMAGES = 4;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const productsPath = resolve(__dirname, "../src/data/products.ts");
let source = readFileSync(productsPath, "utf8");
const existingSlugs = new Set([...source.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]));
const usedVids = new Set([...source.matchAll(/cjVid: "([^"]+)"/g)].map((m) => m[1]));

const TARGETS = [
  {
    slug: "automatic-pet-feeder",
    q: "automatic pet feeder timer dog cat dry food",
    must: ["feeder", "food dispenser", "automatic"],
    ban: ["water fountain", "fish tank", "aquarium"],
    ship: 5,
    name: "Automatic Pet Feeder — Timer",
    description: "Scheduled dry-food meals for cats and dogs when you're away.",
    longDescription:
      "Dispense kibble on a timer so pets eat on schedule during workdays and short trips. Portion control helps with weight management and the hopper holds several days of dry food. Easy to program and disassemble for cleaning. Ships from our US warehouse in 3–5 business days.",
    features: ["Programmable timer", "Portion control", "Dry food hopper", "Easy-clean tray"],
    tags: ["bestseller"],
  },
  {
    slug: "pet-deshedding-tool",
    q: "pet deshedding brush undercoat rake dog cat",
    must: ["deshed", "undercoat", "shedding"],
    ban: ["vacuum", "lint roller", "glove only"],
    ship: 3.5,
    name: "Pet De-Shedding Tool",
    description: "Removes loose undercoat to cut shedding around the house.",
    longDescription:
      "Reach through topcoat to lift loose underfur before it lands on furniture. Stainless edge glides gently while the ejector button clears collected hair in one push. Works on dogs and cats with thick or double coats. Ships from our US warehouse in 3–5 business days.",
    features: ["Stainless edge", "Hair ejector button", "Ergonomic grip", "Dogs and cats"],
    tags: ["bestseller"],
  },
  {
    slug: "dog-reflective-vest",
    q: "dog reflective safety vest night walk",
    must: ["reflective", "vest", "dog"],
    ban: ["life jacket swim", "harness only no vest"],
    ship: 4,
    name: "Reflective Dog Safety Vest",
    description: "High-visibility vest for safer evening and early-morning walks.",
    longDescription:
      "Make your dog easier to spot after dark with a lightweight reflective vest that adjusts around the chest. Bright strips catch headlights and streetlights on neighborhood routes. Quick-release buckles for fast on and off before every walk. Ships from our US warehouse in 3–5 business days.",
    features: ["360° reflective strips", "Adjustable straps", "Lightweight mesh", "Quick release"],
    tags: [],
  },
  {
    slug: "cat-laser-toy",
    q: "cat laser pointer toy interactive rechargeable",
    must: ["laser", "cat"],
    ban: ["dog leash", "presentation pointer"],
    ship: 3.5,
    name: "Rechargeable Cat Laser Toy",
    description: "Interactive laser pointer for indoor chase and exercise.",
    longDescription:
      "Help indoor cats burn energy with a pocket laser toy built for daily play sessions. Rechargeable battery means no disposable cells — point, chase, repeat. Great for apartments and rainy days when outdoor time is limited. Ships from our US warehouse in 3–5 business days.",
    features: ["USB rechargeable", "Pocket size", "Indoor exercise", "One-button use"],
    tags: [],
  },
  {
    slug: "pet-food-measuring-scoop",
    q: "pet food measuring scoop cup dog cat",
    must: ["scoop", "measuring", "pet food"],
    ban: ["storage container large", "dispenser automatic"],
    ship: 3.5,
    name: "Pet Food Measuring Scoop",
    description: "Portion scoops for consistent meal sizes every feeding.",
    longDescription:
      "Take the guesswork out of mealtime with marked scoops sized for kibble portions. Durable plastic rinses clean and hangs on a hook or sits in a bin lid. Helps maintain healthy weight with the same serving every day. Ships from our US warehouse in 3–5 business days.",
    features: ["Marked portions", "Durable plastic", "Easy rinse", "Hang hole"],
    tags: [],
  },
  {
    slug: "pet-toothbrush-kit",
    q: "pet toothbrush finger brush dog cat dental",
    must: ["toothbrush", "dental", "pet"],
    ban: ["human toothbrush", "toothpaste only large"],
    ship: 3.5,
    name: "Pet Dental Care Kit",
    description: "Finger brushes and tools for at-home pet dental hygiene.",
    longDescription:
      "Support fresher breath and healthier gums with a compact dental kit designed for dogs and cats. Soft finger brushes slip on for gentle gum massage during short daily sessions. Rinse clean and store in the included case between uses. Ships from our US warehouse in 3–5 business days.",
    features: ["Finger brush fit", "Soft bristles", "Storage case", "Dogs and cats"],
    tags: [],
  },
  {
    slug: "dog-tennis-ball-set",
    q: "dog tennis ball fetch toy rubber set",
    must: ["tennis ball", "dog ball", "fetch"],
    ban: ["cat toy", "golf ball"],
    ship: 3.5,
    name: "Dog Tennis Ball Fetch Set",
    description: "Classic rubber balls for fetch, parks, and backyard play.",
    longDescription:
      "Stock up on fetch balls sized for medium and large mouths. High-bounce rubber holds up to daily throws at the park and backyard sessions. Bright color helps you spot them in grass. Ships from our US warehouse in 3–5 business days.",
    features: ["High-bounce rubber", "Fetch sized", "Bright color", "Multi-pack value"],
    tags: ["bestseller"],
  },
  {
    slug: "catnip-mouse-toys",
    q: "catnip mouse toys plush cat set",
    must: ["catnip", "mouse", "cat toy"],
    ban: ["dog", "hamster cage"],
    ship: 3.5,
    name: "Catnip Mouse Toy Set",
    description: "Plush mice stuffed with catnip for batting and pouncing.",
    longDescription:
      "Spark natural hunting play with soft mice filled with catnip that cats love to bat under furniture. Lightweight bodies slide across floors for chase games and solo enrichment. Toss a few around the house for variety. Ships from our US warehouse in 3–5 business days.",
    features: ["Catnip filled", "Plush mice", "Lightweight chase", "Multi-pack"],
    tags: [],
  },
  {
    slug: "pet-car-seat-cover",
    q: "dog car seat cover hammock back seat waterproof",
    must: ["car seat cover", "seat cover", "hammock"],
    ban: ["baby car seat", "steering wheel"],
    ship: 5.5,
    name: "Waterproof Dog Car Seat Cover",
    description: "Hammock cover protects upholstery from fur, mud, and scratches.",
    longDescription:
      "Keep your back seat clean on road trips with a waterproof hammock that blocks claws, drool, and muddy paws. Adjustable straps hook to headrests and door anchors for a secure fit in most sedans and SUVs. Wipe down or machine wash between adventures. Ships from our US warehouse in 3–5 business days.",
    features: ["Waterproof layer", "Hammock style", "Universal fit", "Machine washable"],
    tags: ["bestseller"],
  },
  {
    slug: "pet-stairs-steps",
    q: "pet stairs steps dog cat bed couch foam",
    must: ["pet stair", "dog stair", "pet step"],
    ban: ["ladder human", "bird cage"],
    ship: 6,
    name: "Foam Pet Stairs — Couch & Bed",
    description: "Gentle steps help small and senior pets reach furniture safely.",
    longDescription:
      "Give older or small pets a boost onto the couch or bed without risky jumps. High-density foam steps support paws with a non-slip cover that removes for washing. Lightweight enough to move between rooms. Ships from our US warehouse in 3–5 business days.",
    features: ["High-density foam", "Non-slip cover", "Removable washable", "Senior-pet friendly"],
    tags: [],
  },
  {
    slug: "pet-nail-grinder",
    q: "pet nail grinder electric dog cat claw trimmer",
    must: ["nail grinder", "claw grinder", "pet nail"],
    ban: ["human nail", "drill"],
    ship: 4,
    name: "Electric Pet Nail Grinder",
    description: "Quiet grinder trims nails smoothly without sharp clipper cuts.",
    longDescription:
      "Smooth rough nail edges with a low-noise rotary grinder that many pets tolerate better than clippers. Multiple grit heads handle small and large paws with a USB-rechargeable base. Work slowly at home between professional groomer visits. Ships from our US warehouse in 3–5 business days.",
    features: ["Low-noise motor", "USB rechargeable", "Multiple heads", "Smooth finish"],
    tags: [],
  },
  {
    slug: "dog-snuffle-mat",
    q: "dog snuffle mat foraging nose work feeding",
    must: ["snuffle mat", "foraging mat", "nose work"],
    ban: ["cat litter", "yoga mat"],
    ship: 4,
    name: "Dog Snuffle Foraging Mat",
    description: "Hide treats in fleece folds for nose-work mental stimulation.",
    longDescription:
      "Turn mealtime into a scent game by hiding kibble in soft fleece strips that dogs sniff and forage through. Slows fast eaters and adds mental enrichment on rainy days indoors. Machine washable after muddy-nose sessions. Ships from our US warehouse in 3–5 business days.",
    features: ["Fleece foraging strips", "Slow feeding", "Mental enrichment", "Machine washable"],
    tags: ["bestseller"],
  },
];

function retailPrice(cost, shipping) {
  const base = cost + shipping;
  const raw = base / (1 - TARGET_MARGIN - PAYPAL_RATE);
  return Math.min(Math.max(Math.ceil(raw) - 0.01, base + 1.5), MAX_RETAIL);
}

function compareAt(sell) {
  return Math.ceil(sell * 1.1) - 0.01;
}

function okName(name, must, ban) {
  const n = (name || "").toLowerCase();
  if (ban.some((b) => n.includes(b))) return false;
  return must.some((m) => n.includes(m.toLowerCase()));
}

function rankImages(urls) {
  return [...new Set(urls.filter((u) => typeof u === "string" && u.startsWith("http")))].slice(0, 8);
}

function formatImages(images) {
  return JSON.stringify(images, null, 4)
    .split("\n")
    .map((line, idx) => (idx === 0 ? line : "      " + line.trim()))
    .join("\n");
}

function assignId(src) {
  const nums = [...src.matchAll(/id: "pet-(\d+)"/g)].map((m) => Number(m[1]));
  return `pet-${(nums.length ? Math.max(...nums) : 0) + 1}`;
}

function buildBlock(entry, id) {
  return `  {
    id: "${id}",
    slug: "${entry.slug}",
    name: ${JSON.stringify(entry.name)},
    description: ${JSON.stringify(entry.description)},
    longDescription:
      ${JSON.stringify(entry.longDescription)},
    price: ${entry.price.toFixed(2)},
    compareAtPrice: ${entry.compareAtPrice.toFixed(2)},
    store: "pet",
    image: ${JSON.stringify(entry.image)},
    images: ${formatImages(entry.images)},
    rating: ${entry.rating},
    reviews: ${entry.reviews},
    sold: ${entry.sold},
    inStock: true,
    shippingDays: "3–5 days",
    warehouse: "US",
    tags: ${JSON.stringify(entry.tags || [])},
    features: ${JSON.stringify(entry.features)},
    supplierSku: ${JSON.stringify(entry.supplierSku)},
    cjVid: ${JSON.stringify(entry.cjVid)},
    cjSku: ${JSON.stringify(entry.cjSku)}
  }`;
}

async function getToken() {
  const auth = await fetch(`${API}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: key }),
  }).then((r) => r.json());
  if (!auth.result) throw new Error(auth.message || "CJ auth failed");
  return auth.data.accessToken;
}

async function queryPid(token, pid) {
  await sleep(1100);
  const res = await fetch(`${API}/product/query?pid=${encodeURIComponent(pid)}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());
  return res.result ? res.data : null;
}

async function searchTop(token, item, usedPids) {
  await sleep(1100);
  const params = new URLSearchParams({
    page: "1",
    size: "50",
    keyWord: item.q,
    countryCode: "US",
    orderBy: "1",
    sort: "desc",
  });
  const list = await fetch(`${API}/product/listV2?${params}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());

  const products = (list.data?.content || []).flatMap((g) => g.productList || []);
  products.sort((a, b) => (b.listedNum || 0) - (a.listedNum || 0));

  for (const hit of products) {
    if (!hit?.id || usedPids.has(hit.id)) continue;
    if (!okName(hit.nameEn, item.must, item.ban)) continue;
    const listed = Number(hit.listedNum || 0);
    if (listed < 8) continue;

    const data = await queryPid(token, hit.id);
    if (!data) continue;
    const variant = data.variants?.find((v) => Number(v.variantSellPrice) > 0) || data.variants?.[0];
    if (!variant?.vid || usedVids.has(variant.vid)) continue;

    const cost = Number(variant.variantSellPrice ?? data.sellPrice ?? 0);
    if (cost < 0.4 || cost > 38) continue;

    const images = rankImages([variant.variantImage, data.bigImage, ...(data.productImageSet || [])]);
    if (images.length < MIN_IMAGES) continue;

    const price = retailPrice(cost, item.ship);
    if (price >= MAX_RETAIL) continue;

    usedPids.add(hit.id);
    usedVids.add(variant.vid);

    const social = naturalSocialProof(item.slug, listed);
    const tags = [...(item.tags || [])];
    if (listed > 1500 && !tags.includes("bestseller")) tags.push("bestseller");
    if (listed < 150 && !tags.includes("new")) tags.push("new");

    console.log("  match:", data.productNameEn?.slice(0, 70));

    return {
      ...item,
      image: images[0],
      images,
      price,
      compareAtPrice: compareAt(price),
      supplierSku: data.productSku,
      cjVid: variant.vid,
      cjSku: variant.variantSku,
      listedNum: listed,
      tags,
      ...social,
    };
  }
  return null;
}

const token = await getToken();
const usedPids = new Set();
const toAdd = [];
let fail = 0;

for (const item of TARGETS) {
  if (existingSlugs.has(item.slug)) {
    console.log("SKIP exists", item.slug);
    continue;
  }
  console.log("SEARCH", item.slug);
  const mapped = await searchTop(token, item, usedPids);
  if (!mapped) {
    fail++;
    console.log("FAIL", item.slug);
    continue;
  }
  toAdd.push(mapped);
  console.log("OK", item.slug, `$${mapped.price.toFixed(2)}`, "imgs:", mapped.images.length, "listed:", mapped.listedNum);
}

if (!toAdd.length) {
  console.log(`Nothing new to add (${fail} failed).`);
  process.exit(0);
}

const blocks = [];
let idSource = source;
for (const entry of toAdd) {
  const id = assignId(idSource);
  idSource += `\nid: "${id}"`;
  blocks.push(buildBlock(entry, id));
}

source = source.replace(
  /\n\];\n\nexport function getProductBySlug/,
  `,\n${blocks.join(",\n")}\n];\n\nexport function getProductBySlug`,
);
writeFileSync(productsPath, source);

const petCount = [...source.matchAll(/store: "pet"/g)].length;
const total = [...source.matchAll(/slug: "/g)].length;

console.log(`\nAdded ${toAdd.length} pet products (${fail} failed)`);
console.log("PET_COUNT", petCount);
console.log("TOTAL_SLUGS", total);
