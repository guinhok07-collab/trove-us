import { readFileSync } from "fs";
import { getToken, queryBySku, extractProductBlock } from "./lib/cj-catalog-lib.mjs";

const src = readFileSync("src/data/products.ts", "utf8");
const slugs = [
  "jump-rope-weighted",
  "portable-blender-bottle",
  "mason-jar-storage-lids",
  "silicone-utensil-rest",
  "over-sink-dish-rack",
];
const t = await getToken(process.env.CJ_API_KEY);
for (const slug of slugs) {
  const b = extractProductBlock(src, slug).block;
  const sku = b.match(/cjSku: "([^"]+)"/)?.[1];
  const hit = await queryBySku(t, sku);
  console.log("---", slug);
  console.log(" sku", sku, hit?.data?.productNameEn?.slice(0, 75) || "NOT FOUND");
}
