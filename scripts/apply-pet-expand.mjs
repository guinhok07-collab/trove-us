/**
 * Apply harvested pet expand products from cj-pet-expand.json
 * Usage: node --env-file=.env.local scripts/apply-pet-expand.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { naturalSocialProof } from "./social-proof.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAYPAL = 0.034;
const MARGIN = 0.2;
const MAX_RETAIL = 39.99;

const COPY = {
  "automatic-pet-feeder": {
    name: "Automatic Pet Feeder — Timer",
    description: "Scheduled dry-food meals for cats and dogs when you're away.",
    longDescription:
      "Dispense kibble on a timer so pets eat on schedule during workdays and short trips. Portion control helps with weight management and the hopper holds several days of dry food. Easy to program and disassemble for cleaning. Ships from our US warehouse in 3–5 business days.",
    features: ["Programmable timer", "Portion control", "Dry food hopper", "Easy-clean tray"],
    tags: ["bestseller"],
  },
  "pet-deshedding-tool": {
    name: "Pet De-Shedding Tool",
    description: "Removes loose undercoat to cut shedding around the house.",
    longDescription:
      "Reach through topcoat to lift loose underfur before it lands on furniture. Stainless edge glides gently while the ejector button clears collected hair in one push. Works on dogs and cats with thick or double coats. Ships from our US warehouse in 3–5 business days.",
    features: ["Stainless edge", "Hair ejector button", "Ergonomic grip", "Dogs and cats"],
    tags: ["bestseller"],
  },
  "dog-reflective-vest": {
    name: "Reflective Dog Safety Vest",
    description: "High-visibility vest for safer evening and early-morning walks.",
    longDescription:
      "Make your dog easier to spot after dark with a lightweight reflective vest that adjusts around the chest. Bright strips catch headlights and streetlights on neighborhood routes. Quick-release buckles for fast on and off before every walk. Ships from our US warehouse in 3–5 business days.",
    features: ["360° reflective strips", "Adjustable straps", "Lightweight mesh", "Quick release"],
    tags: [],
  },
  "cat-laser-toy": {
    name: "LED Laser Cat Toy Ball",
    description: "Rolling laser ball that keeps indoor cats chasing and pouncing.",
    longDescription:
      "Give indoor cats a fun workout with a rolling ball that projects a laser dot across floors and walls. Electronic movement sparks chase instincts without you holding a wand — great for solo play while you are busy. USB rechargeable for daily sessions. Ships from our US warehouse in 3–5 business days.",
    features: ["Rolling laser ball", "USB rechargeable", "Solo cat play", "Indoor exercise"],
    tags: ["bestseller"],
  },
  "pet-food-measuring-scoop": {
    name: "Pet Food Measuring Scoop",
    description: "Portion scoops for consistent meal sizes every feeding.",
    longDescription:
      "Take the guesswork out of mealtime with marked scoops sized for kibble portions. Durable plastic rinses clean and hangs on a hook or sits in a bin lid. Helps maintain healthy weight with the same serving every day. Ships from our US warehouse in 3–5 business days.",
    features: ["Marked portions", "Durable plastic", "Easy rinse", "Hang hole"],
    tags: [],
  },
  "pet-toothbrush-kit": {
    name: "Pet Dental Care Kit",
    description: "Finger brushes and tools for at-home pet dental hygiene.",
    longDescription:
      "Support fresher breath and healthier gums with a compact dental kit designed for dogs and cats. Soft finger brushes slip on for gentle gum massage during short daily sessions. Rinse clean and store in the included case between uses. Ships from our US warehouse in 3–5 business days.",
    features: ["Finger brush fit", "Soft bristles", "Storage case", "Dogs and cats"],
    tags: [],
  },
  "dog-tennis-ball-set": {
    name: "Dog Tennis Ball Fetch Set",
    description: "Classic rubber balls for fetch, parks, and backyard play.",
    longDescription:
      "Stock up on fetch balls sized for medium and large mouths. High-bounce rubber holds up to daily throws at the park and backyard sessions. Bright color helps you spot them in grass. Ships from our US warehouse in 3–5 business days.",
    features: ["High-bounce rubber", "Fetch sized", "Bright color", "Multi-pack value"],
    tags: ["bestseller"],
  },
  "catnip-mouse-toys": {
    name: "Catnip Mouse Toy Set",
    description: "Plush mice stuffed with catnip for batting and pouncing.",
    longDescription:
      "Spark natural hunting play with soft mice filled with catnip that cats love to bat under furniture. Lightweight bodies slide across floors for chase games and solo enrichment. Toss a few around the house for variety. Ships from our US warehouse in 3–5 business days.",
    features: ["Catnip filled", "Plush mice", "Lightweight chase", "Multi-pack"],
    tags: [],
  },
  "pet-car-seat-cover": {
    name: "Waterproof Dog Car Seat Cover",
    description: "Hammock cover protects upholstery from fur, mud, and scratches.",
    longDescription:
      "Keep your back seat clean on road trips with a waterproof hammock that blocks claws, drool, and muddy paws. Adjustable straps hook to headrests and door anchors for a secure fit in most sedans and SUVs. Wipe down or machine wash between adventures. Ships from our US warehouse in 3–5 business days.",
    features: ["Waterproof layer", "Hammock style", "Universal fit", "Machine washable"],
    tags: ["bestseller"],
  },
  "pet-stairs-steps": {
    name: "Pet Ramp Stairs — Couch & Bed",
    description: "Wave-style steps help small and senior pets climb safely.",
    longDescription:
      "Give older or small pets a gentle ramp up to the couch or bed without risky jumps. Wave-shaped steps support paws with a textured surface that grips as they climb. Lightweight enough to move between rooms and wipe clean after muddy paws. Ships from our US warehouse in 3–5 business days.",
    features: ["Wave ramp design", "Textured grip", "Senior-pet friendly", "Lightweight"],
    tags: [],
  },
  "pet-nail-grinder": {
    name: "Electric Pet Nail Grinder",
    description: "Quiet grinder trims nails smoothly without sharp clipper cuts.",
    longDescription:
      "Smooth rough nail edges with a low-noise rotary grinder that many pets tolerate better than clippers. Multiple grit heads handle small and large paws with a USB-rechargeable base. Work slowly at home between professional groomer visits. Ships from our US warehouse in 3–5 business days.",
    features: ["Low-noise motor", "USB rechargeable", "Multiple heads", "Smooth finish"],
    tags: [],
  },
  "dog-snuffle-mat": {
    name: "Dog Snuffle Foraging Mat",
    description: "Hide treats in fleece folds for nose-work mental stimulation.",
    longDescription:
      "Turn mealtime into a scent game by hiding kibble in soft fleece strips that dogs sniff and forage through. Slows fast eaters and adds mental enrichment on rainy days indoors. Machine washable after muddy-nose sessions. Ships from our US warehouse in 3–5 business days.",
    features: ["Fleece foraging strips", "Slow feeding", "Mental enrichment", "Machine washable"],
    tags: ["bestseller"],
  },
};

function retailPrice(cost, ship) {
  const base = cost + ship;
  return Math.min(Math.max(Math.ceil(base / (1 - MARGIN - PAYPAL)) - 0.01, base + 1.5), MAX_RETAIL);
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

function buildBlock(entry, id, copy) {
  return `  {
    id: "${id}",
    slug: "${entry.slug}",
    name: ${JSON.stringify(copy.name)},
    description: ${JSON.stringify(copy.description)},
    longDescription:
      ${JSON.stringify(copy.longDescription)},
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
    tags: ${JSON.stringify(copy.tags || [])},
    features: ${JSON.stringify(copy.features)},
    supplierSku: ${JSON.stringify(entry.supplierSku)},
    cjVid: ${JSON.stringify(entry.cjVid)},
    cjSku: ${JSON.stringify(entry.cjSku)}
  }`;
}

const dataPath = resolve(__dirname, "cj-pet-expand.json");
const harvested = JSON.parse(readFileSync(dataPath, "utf8"));
const productsPath = resolve(__dirname, "../src/data/products.ts");
let source = readFileSync(productsPath, "utf8");

for (const slug of Object.keys(harvested)) {
  const entry = harvested[slug];
  const copy = COPY[slug];
  if (!copy) {
    console.log("SKIP no copy", slug);
    continue;
  }
  if (source.includes(`slug: "${slug}"`)) {
    console.log("SKIP exists", slug);
    continue;
  }
  entry.price = retailPrice(entry.cost, entry.ship);
  entry.compareAtPrice = Math.ceil(entry.price * 1.1) - 0.01;
  const social = naturalSocialProof(slug, entry.listedNum || 0);
  Object.assign(entry, social);
  const id = assignId(source);
  const block = buildBlock(entry, id, copy);
  source = source.replace(/\n\];\n\nexport function getProductBySlug/, `\n${block},\n];\n\nexport function getProductBySlug`);
  console.log("ADD", slug, `$${entry.price.toFixed(2)}`, entry.cjName?.slice(0, 50));
}

writeFileSync(productsPath, source);
const petCount = [...source.matchAll(/store: "pet"/g)].length;
console.log("\nPET_COUNT", petCount);
