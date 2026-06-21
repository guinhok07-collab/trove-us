/**
 * Apply vetted pet products from cj-pet-curated.json
 * Usage: node --env-file=.env.local scripts/apply-pet-from-curated.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { naturalSocialProof } from "./social-proof.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const COPY = {
  "cat-feather-teaser": {
    name: "Cat Feather Teaser Wand",
    description: "Interactive wand toy that keeps cats active indoors.",
    longDescription:
      "Help indoor cats burn energy with a feather teaser wand built for daily play. The lightweight wand and fluttering feather mimic prey movement to encourage pouncing and chasing. Great for bonding between you and your cat. Ships from our US warehouse in 3–5 business days.",
    features: ["Feather teaser head", "Flexible wand", "Indoor exercise", "Daily play"],
    tags: ["bestseller"],
  },
  "pet-grooming-gloves": {
    name: "Pet Grooming Gloves",
    description: "De-shed and massage your pet while you stroke them.",
    longDescription:
      "Remove loose fur during cuddle time with grooming gloves that feel like a gentle petting session. Soft rubber tips lift hair from dogs and cats while massaging the coat. Rinse clean after use — ideal for sensitive pets who dislike brushes. Ships from our US warehouse in 3–5 business days.",
    features: ["Gentle rubber tips", "De-shedding", "One size fits most", "Washable"],
    tags: ["bestseller"],
  },
  "dog-bandana-set": {
    name: "Cooling Dog Bandana",
    description: "Summer cooling bandana for walks and outdoor play.",
    longDescription:
      "Keep your dog comfortable on warm days with a cooling bandana that wraps around the neck. Soak, wring, and wear for a refreshing walk accessory that looks great in photos too. Soft fabric and adjustable fit for small to medium dogs. Ships from our US warehouse in 3–5 business days.",
    features: ["Cooling fabric", "Adjustable fit", "Summer walks", "Easy wash"],
    tags: [],
  },
  "portable-pet-water-bottle": {
    name: "Portable Dog Walk Cup",
    description: "3-in-1 walk cup for water, treats, and waste bags on the go.",
    longDescription:
      "Everything you need for a cleaner walk in one compact cup. Give your dog water from the built-in tray, store treats for training, and keep waste bags handy — perfect for daily routes and park trips. Leak-resistant design fits in a bag or clips to a leash. Ships from our US warehouse in 3–5 business days.",
    features: ["Built-in water tray", "Treat compartment", "Bag storage", "Travel ready"],
    tags: ["bestseller"],
  },
  "pet-stainless-bowl-set": {
    name: "Stainless Double Pet Bowl",
    description: "Non-slip double bowl for food and water.",
    longDescription:
      "Serve food and water side by side with a stainless steel double bowl that rinses clean in seconds. The non-slip base helps prevent sliding during eager mealtimes. Durable, rust-resistant, and sized for everyday use with dogs and cats. Ships from our US warehouse in 3–5 business days.",
    features: ["Stainless steel", "Double bowl design", "Non-slip base", "Easy rinse"],
    tags: [],
  },
  "dog-dental-chew-rope": {
    name: "Dog Rope Chew Toy",
    description: "Cotton rope toy for chewing, tug, and dental play.",
    longDescription:
      "Give your dog a durable rope toy for chewing and tug games that support daily play habits. Natural cotton knots hold up to fetch and gentle tugging while helping keep teeth busy. A simple everyday essential for puppies and adult dogs. Ships from our US warehouse in 3–5 business days.",
    features: ["Cotton rope knots", "Tug and chew play", "Everyday durable", "Interactive"],
    tags: [],
  },
  "pet-safety-light-clip": {
    name: "Pet Safety Light Clip",
    description: "LED clip-on light for safer night walks.",
    longDescription:
      "Make evening walks safer with a clip-on LED light that attaches to collars and harnesses. Visible from a distance so drivers and neighbors can spot your dog after dark. Lightweight, battery-powered, and easy to clip on before every walk. Ships from our US warehouse in 3–5 business days.",
    features: ["Clip-on LED", "Night visibility", "Lightweight", "Battery powered"],
    tags: [],
  },
  "pet-comb-flea": {
    name: "Pet Flea Comb",
    description: "Fine-tooth comb for coat checks and grooming.",
    longDescription:
      "Keep coats tidy with a fine-tooth grooming comb for dogs and cats. Close teeth help lift debris and check the coat during regular grooming sessions at home. Compact size fits in a drawer or travel bag. Ships from our US warehouse in 3–5 business days.",
    features: ["Fine teeth", "Home grooming", "Compact size", "Dogs and cats"],
    tags: [],
  },
};

/** Only slugs with verified CJ match */
const APPLY_SLUGS = [
  "cat-feather-teaser",
  "pet-grooming-gloves",
  "dog-bandana-set",
  "portable-pet-water-bottle",
  "pet-stainless-bowl-set",
  "dog-dental-chew-rope",
  "pet-safety-light-clip",
  "pet-comb-flea",
];

function cleanImages(images) {
  const out = [];
  for (const item of images || []) {
    if (typeof item === "string" && item.startsWith("http")) out.push(item);
  }
  return [...new Set(out)].slice(0, 8);
}

function formatImages(images) {
  return JSON.stringify(images, null, 4)
    .split("\n")
    .map((line, idx) => (idx === 0 ? line : "      " + line.trim()))
    .join("\n");
}

function assignId(source, store) {
  const prefix = store;
  const nums = [...source.matchAll(new RegExp(`id: "${prefix}-(\\d+)"`, "g"))].map((m) => Number(m[1]));
  return `${prefix}-${(nums.length ? Math.max(...nums) : 0) + 1}`;
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
    tags: ${JSON.stringify(copy.tags)},
    features: ${JSON.stringify(copy.features)},
    supplierSku: ${JSON.stringify(entry.supplierSku)},
    cjVid: ${JSON.stringify(entry.cjVid)},
    cjSku: ${JSON.stringify(entry.cjSku)}
  }`;
}

const curatedPath = resolve(__dirname, "cj-pet-curated.json");
const extraPath = resolve(__dirname, "cj-pet-extra.json");
let curated = JSON.parse(readFileSync(curatedPath, "utf8"));
try {
  curated = { ...curated, ...JSON.parse(readFileSync(extraPath, "utf8")) };
} catch {
  /* optional extra picks */
}

const path = resolve(__dirname, "../src/data/products.ts");
let source = readFileSync(path, "utf8");

for (const slug of APPLY_SLUGS) {
  const entry = curated[slug];
  const copy = COPY[slug];
  if (!entry || !copy) {
    console.log("SKIP missing", slug);
    continue;
  }
  if (source.includes(`slug: "${slug}"`)) {
    console.log("SKIP exists", slug);
    continue;
  }
  entry.images = cleanImages(entry.images);
  entry.image = entry.images[0];
  entry.compareAtPrice = entry.compareAtPrice ?? Math.ceil(entry.price * 1.1) - 0.01;
  const social = naturalSocialProof(slug, entry.listedNum ?? 0);
  entry.rating = social.rating;
  entry.reviews = social.reviews;
  entry.sold = social.sold;
  const id = assignId(source, "pet");
  const block = buildBlock(entry, id, copy);
  source = source.replace(/\n\];\n\nexport function getProductBySlug/, `\n${block},\n];\n\nexport function getProductBySlug`);
  console.log("ADD", slug, `$${entry.price.toFixed(2)}`);
}

writeFileSync(path, source);
console.log("Done");
