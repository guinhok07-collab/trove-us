import { readFileSync } from "fs";
import { extractProductBlock } from "./lib/cj-catalog-lib.mjs";

const s = readFileSync("src/data/products.ts", "utf8");
for (const slug of ["back-posture-trainer", "hand-grip-strengthener", "ice-roller-face", "car-charger-usb-c", "cable-management-box"]) {
  const h = extractProductBlock(s, slug);
  const name = h?.block.match(/name: "([^"]+)"/)?.[1];
  const sku = h?.block.match(/cjSku: "([^"]+)"/)?.[1];
  console.log(slug, "→", name, "|", sku, "| len", h?.block.length);
}
