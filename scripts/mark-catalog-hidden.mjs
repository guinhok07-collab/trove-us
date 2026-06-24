import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HIDDEN = [
  "pet-food-storage-container",
  "closet-organizer-6-shelf",
  "cat-scratching-post",
  "under-sink-organizer",
  "adhesive-wall-hooks",
  "heating-pad-electric",
  "mini-bluetooth-speaker",
  "usb-c-hub-7in1",
  "garbage-bag-holder",
  "mason-jar-storage-lids",
  "over-sink-dish-rack",
];

const path = resolve(__dirname, "../src/data/products.ts");
let src = readFileSync(path, "utf8");

for (const slug of HIDDEN) {
  const needle = `slug: "${slug}"`;
  if (!src.includes(needle)) {
    console.log("MISSING", slug);
    continue;
  }
  const start = src.indexOf(needle);
  const blockStart = src.lastIndexOf("\n  {", start);
  const blockEnd = src.indexOf("\n  },", start);
  const block = src.slice(blockStart, blockEnd);
  if (block.includes("catalogHidden:")) {
    console.log("SKIP", slug);
    continue;
  }
  const updated = block.replace(
    /(\n    warehouse: "US",)/,
    "$1\n    catalogHidden: true,",
  );
  src = src.slice(0, blockStart) + updated + src.slice(blockEnd);
  console.log("HIDE", slug);
}

writeFileSync(path, src);
