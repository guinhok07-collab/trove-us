import { readFileSync } from "fs";
import { extractProductBlock } from "./lib/cj-catalog-lib.mjs";

const source = readFileSync("src/data/products.ts", "utf8");
const slugs = [
  "pet-deshedding-tool",
  "pet-paw-cleaner-cup",
  "foldable-laundry-hamper",
  "cable-clips-adhesive",
  "garbage-bag-holder",
  "over-door-hook-rack",
  "kitchen-sink-organizer",
  "led-motion-night-light",
  "vacuum-storage-bags",
  "posture-corrector-brace",
  "essential-oil-diffuser",
  "adjustable-phone-stand",
  "tablet-stand-adjustable",
  "over-sink-dish-rack",
  "silicone-utensil-rest",
];

for (const slug of [
  "led-motion-night-light",
  "vacuum-storage-bags",
  "kitchen-sink-organizer",
  "posture-corrector-brace",
  "essential-oil-diffuser",
  "cable-clips-adhesive",
]) {
  const hit = extractProductBlock(source, slug);
  const b = hit?.block || "";
  console.log(
    slug,
    "|",
    b.match(/name: "([^"]+)"/)?.[1],
    "|",
    b.match(/cjSku: "([^"]+)"/)?.[1],
  );
}
