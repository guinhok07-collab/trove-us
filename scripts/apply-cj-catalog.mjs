/**

 * Apply cj-catalog-sync.json to src/data/products.ts

 * Removes products that failed CJ sync.

 */

import { readFileSync, writeFileSync } from "fs";

import { resolve, dirname } from "path";

import { fileURLToPath } from "url";



const __dirname = dirname(fileURLToPath(import.meta.url));

const sync = JSON.parse(

  readFileSync(resolve(__dirname, "cj-catalog-sync.json"), "utf8"),

);

const path = resolve(__dirname, "../src/data/products.ts");

let source = readFileSync(path, "utf8");



const slugRegex = /slug: "([^"]+)"/g;

const allSlugs = [...source.matchAll(slugRegex)].map((m) => m[1]);

const failed = allSlugs.filter((s) => !sync[s]?.cjVid);

if (failed.length) {

  console.log("Removing unlinked products:", failed.join(", "));

}



function findObjectBounds(text, slug) {

  const slugIdx = text.indexOf(`slug: "${slug}"`);

  if (slugIdx === -1) return null;

  const objStart = text.lastIndexOf("{", slugIdx);

  let depth = 0;

  let i = objStart;

  for (; i < text.length; i++) {

    if (text[i] === "{") depth++;

    if (text[i] === "}") {

      depth--;

      if (depth === 0) {

        i++;

        break;

      }

    }

  }

  return { objStart, objEnd: i };

}



function formatImages(images) {

  return JSON.stringify(images, null, 4)

    .split("\n")

    .map((line, idx) => (idx === 0 ? line : "      " + line.trim()))

    .join("\n");

}



for (const [slug, data] of Object.entries(sync)) {

  if (!data?.cjVid) continue;



  const bounds = findObjectBounds(source, slug);

  if (!bounds) continue;



  let block = source.slice(bounds.objStart, bounds.objEnd);



  block = block.replace(/name: "[^"]*",/, `name: ${JSON.stringify(truncateName(data.name))},`);

  block = block.replace(/price: [\d.]+,/, `price: ${data.price.toFixed(2)},`);

  block = block.replace(

    /compareAtPrice: [\d.]+,/,

    `compareAtPrice: ${data.compareAtPrice.toFixed(2)},`,

  );

  block = block.replace(/image: "[^"]+",/, `image: ${JSON.stringify(data.image)},`);

  block = block.replace(/images: \[[\s\S]*?\],/, `images: ${formatImages(data.images)},`);

  block = block.replace(/rating: [\d.]+,/, `rating: ${data.rating},`);

  block = block.replace(/reviews: \d+,/, `reviews: ${data.reviews},`);

  block = block.replace(/sold: \d+,/, `sold: ${data.sold},`);



  if (/supplierSku:/.test(block)) {

    block = block.replace(/supplierSku: "[^"]*",/, `supplierSku: ${JSON.stringify(data.supplierSku)},`);

  } else {

    block = block.replace(

      /features: \[[\s\S]*?\],/,

      (m) => `${m}\n    supplierSku: ${JSON.stringify(data.supplierSku)},`,

    );

  }



  if (/cjVid:/.test(block)) {

    block = block.replace(/cjVid: "[^"]*",/, `cjVid: ${JSON.stringify(data.cjVid)},`);

    block = block.replace(/cjSku: "[^"]*",/, `cjSku: ${JSON.stringify(data.cjSku)},`);

  } else {

    block = block.replace(

      /(\n  \})/,

      `\n    cjVid: ${JSON.stringify(data.cjVid)},\n    cjSku: ${JSON.stringify(data.cjSku)}$1`,

    );

  }



  source = source.slice(0, bounds.objStart) + block + source.slice(bounds.objEnd);

}



for (const slug of failed) {

  const bounds = findObjectBounds(source, slug);

  if (!bounds) continue;

  let end = bounds.objEnd;

  if (source[end] === ",") end++;

  if (source[end] === "\n") end++;

  source = source.slice(0, bounds.objStart) + source.slice(end);

}



source = source.replace(

  /\/\*\*[\s\S]*?\*\/\n\nexport const storeLabels/,

  `/**\n * Catalog — all products sourced from CJ Dropshipping (real vid + images).\n * Pricing: ~20% margin after CJ cost, US ship est., PayPal fees (volume pricing).\n * Launch guide: src/data/sourcing.ts\n */\n\nexport const storeLabels`,

);



writeFileSync(path, source);

console.log(

  "Applied. Remaining slugs:",

  [...source.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]).length,

);



function truncateName(name) {

  const clean = (name || "").trim();

  if (clean.length <= 72) return clean;

  return clean.slice(0, 69) + "…";

}


