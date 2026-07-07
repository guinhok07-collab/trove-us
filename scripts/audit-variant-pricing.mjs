/**

 * Verify variant prices match retail formula (20% margin + PayPal 3.4%).

 * Usage: node --env-file=.env.local scripts/audit-variant-pricing.mjs [slug]

 */

import { readFileSync } from "fs";

import { extractProductBlock } from "./lib/cj-catalog-lib.mjs";

import { priceMatchesFormula } from "./catalog-ship.mjs";



const API = "https://developers.cjdropshipping.com/api2.0/v1";

const key = process.env.CJ_API_KEY;

if (!key) {

  console.error("Set CJ_API_KEY (use --env-file=.env.local)");

  process.exit(1);

}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));



const onlySlug = process.argv[2];

const catalog = JSON.parse(readFileSync("src/data/product-variants.json", "utf8"));

const productsSrc = readFileSync("src/data/products.ts", "utf8");



const auth = await fetch(`${API}/authentication/getAccessToken`, {

  method: "POST",

  headers: { "Content-Type": "application/json" },

  body: JSON.stringify({ apiKey: key }),

}).then((r) => r.json());

const token = auth.data.accessToken;



const slugs = onlySlug ? [onlySlug] : Object.keys(catalog);

let drift = 0;

let ok = 0;

let fail = 0;



for (const slug of slugs) {

  const entry = catalog[slug];

  if (!entry?.variants?.length) continue;



  const hit = extractProductBlock(productsSrc, slug);

  const defaultSku = hit?.block.match(/cjSku: "([^"]+)"/)?.[1];

  if (!defaultSku) {

    fail++;

    console.log("NO_SKU", slug);

    continue;

  }



  await sleep(1100);

  const res = await fetch(`${API}/product/query?variantSku=${encodeURIComponent(defaultSku)}`, {

    headers: { "CJ-Access-Token": token },

  }).then((r) => r.json());

  if (!res.result) {

    fail++;

    console.log("FAIL CJ", slug);

    continue;

  }



  const data = res.data;

  const mismatches = [];



  for (const v of entry.variants) {

    const cj = data.variants?.find((x) => x.vid === v.cjVid || x.variantSku === v.cjSku);

    const cost = Number(cj?.variantSellPrice ?? 0);

    if (!cost) continue;

    const match = priceMatchesFormula(cost, v.price, v.compareAtPrice);

    if (!match.ok) {

      mismatches.push({

        label: v.label,

        stored: v.price,

        cost,

        compareStored: v.compareAtPrice,

      });

    }

  }



  if (mismatches.length) {

    drift++;

    console.log(`\nDRIFT ${slug} (${mismatches.length}/${entry.variants.length})`);

    for (const m of mismatches.slice(0, 5)) {

      console.log(`  ${m.label.slice(0, 40)} | cost $${m.cost} stored $${m.stored}`);

    }

    if (mismatches.length > 5) console.log(`  ... +${mismatches.length - 5} more`);

  } else {

    ok++;

  }

}



console.log(`\nOK ${ok} | DRIFT ${drift} | FAIL ${fail} | checked ${slugs.length} slugs`);

if (drift || fail) process.exit(1);

