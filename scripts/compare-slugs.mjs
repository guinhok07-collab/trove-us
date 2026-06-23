import { readFileSync } from "fs";

const p = readFileSync("src/data/products.ts", "utf8");
const slugs = [...p.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]);
const v = Object.keys(JSON.parse(readFileSync("src/data/product-variants.json", "utf8")));
const dup = slugs.filter((s, i) => slugs.indexOf(s) !== i);
console.log("products", slugs.length, "variants", v.length);
console.log("dups", [...new Set(dup)]);
console.log("only products", slugs.filter((s) => !v.includes(s)));
console.log("only variants", v.filter((s) => !slugs.includes(s)));
