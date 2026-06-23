/** Audit image counts per product */
import { readFileSync } from "fs";

const src = readFileSync("src/data/products.ts", "utf8");
const blocks = src.split(/(?=\n  \{\n    id:)/).slice(1);
const low = [];
let withVideo = 0;

for (const b of blocks) {
  const slug = b.match(/slug: "([^"]+)"/)?.[1];
  const imgs = [...b.matchAll(/"(https:\/\/[^"]+)"/g)]
    .map((m) => m[1])
    .filter((u) => b.indexOf("images:") < b.indexOf(u) || b.includes(`image: "${u}"`));
  const imageBlock = b.match(/images: \[([\s\S]*?)\n      \]/)?.[1] || "";
  const count = (imageBlock.match(/https:\/\//g) || []).length;
  if (b.includes("video:")) withVideo++;
  if (count < 4) low.push({ slug, count });
}

console.log("TOTAL", blocks.length);
console.log("WITH_VIDEO", withVideo);
console.log("UNDER_4_IMAGES", low.length);
low.forEach((x) => console.log(x.slug, x.count));
