import { readFileSync } from "fs";

const src = readFileSync("src/data/products.ts", "utf8");
const blocks = src.split(/(?=\n  \{\n    id:)/).slice(1);
const issues = [];
const byStore = { pet: 0, home: 0, wellness: 0, tech: 0 };
const prices = [];

for (const b of blocks) {
  const slug = b.match(/slug: "([^"]+)"/)?.[1];
  const store = b.match(/store: "([^"]+)"/)?.[1];
  const price = Number(b.match(/^\s+price: ([0-9.]+)/m)?.[1]);
  const cjVid = b.match(/cjVid: "([^"]+)"/)?.[1];
  const image = b.match(/^\s+image: "([^"]+)"/m)?.[1];
  if (store) byStore[store]++;
  if (price) prices.push({ slug, price });
  if (!cjVid) issues.push({ slug, type: "missing cjVid" });
  if (!image?.startsWith("http")) issues.push({ slug, type: "bad image" });
  if (price >= 40 && price < 100) issues.push({ slug, type: "price-risky", price });
  if (price >= 100) issues.push({ slug, type: "price-very-high", price });
}

console.log("TOTAL", blocks.length);
console.log("BY_STORE", byStore);
console.log("PRICE_BANDS", {
  under10: prices.filter((p) => p.price < 10).length,
  "10-19": prices.filter((p) => p.price >= 10 && p.price < 20).length,
  "20-34": prices.filter((p) => p.price >= 20 && p.price < 35).length,
  "35+": prices.filter((p) => p.price >= 35).length,
});
console.log("ISSUES", issues);
