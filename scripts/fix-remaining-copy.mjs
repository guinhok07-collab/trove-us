import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { extractProductBlock } from "./lib/cj-catalog-lib.mjs";

const COPY = {
  "kitchen-sink-sponge-holder": {
    name: "Kitchen Sink Sponge & Soap Holder",
    description: "Drain rack keeps sponges, soap, and brushes tidy by the sink.",
    longDescription:
      "Clear counter clutter with a sink-side caddy that drains water away from sponges and dish soap. Holds brushes and scrubbers in one spot for faster cleanup after meals. Rust-resistant finish suits everyday kitchen use. Ships from our US warehouse in 3–5 business days.",
    features: ["Drain tray design", "Sponge & soap slots", "Rust resistant", "Compact sink fit"],
  },
  "pet-toothbrush-kit": {
    name: "Pet Dental Care Kit",
    description: "Finger brushes and tools for at-home pet dental hygiene.",
    longDescription:
      "Support fresher breath and healthier gums with a compact dental kit designed for dogs and cats. Soft finger brushes slip on for gentle gum massage during short daily sessions. Rinse clean and store in the included case between uses. Ships from our US warehouse in 3–5 business days.",
    features: ["Finger brush fit", "Soft bristles", "Storage case", "Dogs and cats"],
  },
  "cat-laser-toy": {
    name: "Rechargeable Cat Laser Toy",
    description: "Interactive laser pointer for indoor chase and exercise.",
    longDescription:
      "Help indoor cats burn energy with a pocket laser toy built for daily play sessions. Rechargeable battery means no disposable cells — point, chase, repeat. Great for apartments and rainy days when outdoor time is limited. Ships from our US warehouse in 3–5 business days.",
    features: ["USB rechargeable", "Pocket size", "Indoor exercise", "One-button use"],
  },
  "pet-stairs-steps": {
    name: "Foam Pet Stairs — Couch & Bed",
    description: "Gentle steps help small and senior pets reach furniture safely.",
    longDescription:
      "Give older or small pets a boost onto the couch or bed without risky jumps. High-density foam steps support paws with a non-slip cover that removes for washing. Lightweight enough to move between rooms. Ships from our US warehouse in 3–5 business days.",
    features: ["High-density foam", "Non-slip cover", "Removable washable", "Senior-pet friendly"],
  },
  "pet-nail-grinder": {
    name: "Electric Pet Nail Grinder",
    description: "Quiet grinder trims nails smoothly without sharp clipper cuts.",
    longDescription:
      "Smooth rough nail edges with a low-noise rotary grinder that many pets tolerate better than clippers. Multiple grit heads handle small and large paws with a USB-rechargeable base. Work slowly at home between professional groomer visits. Ships from our US warehouse in 3–5 business days.",
    features: ["Low-noise motor", "USB rechargeable", "Multiple heads", "Smooth finish"],
  },
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const productsPath = resolve(__dirname, "../src/data/products.ts");
let source = readFileSync(productsPath, "utf8");

for (const [slug, c] of Object.entries(COPY)) {
  const hit = extractProductBlock(source, slug);
  if (!hit) continue;
  let block = hit.block;
  block = block.replace(/name: "[^"]+"/, `name: ${JSON.stringify(c.name)}`);
  block = block.replace(/description: "[^"]+"/, `description: ${JSON.stringify(c.description)}`);
  block = block.replace(
    /longDescription:\s*\n\s*"[^"]*"/,
    `longDescription:\n      ${JSON.stringify(c.longDescription)}`,
  );
  block = block.replace(/features: \[[\s\S]*?\]/, `features: ${JSON.stringify(c.features)}`);
  source = source.slice(0, hit.start) + block + source.slice(hit.end);
  console.log("FIX", slug, "→", c.name);
}

writeFileSync(productsPath, source);
