/**
 * Verify variant prices match retail formula (20% margin + PayPal 3.4%).
 * Usage: node --env-file=.env.local scripts/audit-variant-pricing.mjs [slug]
 */
import { readFileSync } from "fs";
import { retailPrice, compareAt } from "./lib/cj-catalog-lib.mjs";

const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
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

for (const slug of slugs) {
  const entry = catalog[slug];
  if (!entry?.variants?.length) continue;

  const block = productsSrc.match(
    new RegExp(`slug: "${slug}"[\\s\\S]*?cjSku: "([^"]+)"`),
  );
  const defaultSku = block?.[1];
  if (!defaultSku) continue;

  await sleep(1100);
  const res = await fetch(`${API}/product/query?variantSku=${encodeURIComponent(defaultSku)}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());
  if (!res.result) {
    console.log("FAIL CJ", slug);
    continue;
  }

  const data = res.data;
  const ship = 3.5;
  const mismatches = [];

  for (const v of entry.variants) {
    const cj = data.variants?.find((x) => x.vid === v.cjVid || x.variantSku === v.cjSku);
    const cost = Number(cj?.variantSellPrice ?? 0);
    if (!cost) continue;
    const expected = retailPrice(cost, ship);
    const expectedCompare = compareAt(expected);
    const priceOk = Math.abs(v.price - expected) < 0.02;
    const compareOk = Math.abs((v.compareAtPrice ?? 0) - expectedCompare) < 0.02;
    if (!priceOk || !compareOk) {
      mismatches.push({
        label: v.label,
        stored: v.price,
        expected,
        cost,
        compareStored: v.compareAtPrice,
        compareExpected: expectedCompare,
      });
    }
  }

  if (mismatches.length) {
    drift++;
    console.log(`\nDRIFT ${slug} (${mismatches.length}/${entry.variants.length})`);
    for (const m of mismatches.slice(0, 5)) {
      console.log(
        `  ${m.label.slice(0, 40)} | cost $${m.cost} → expected $${m.expected.toFixed(2)} stored $${m.stored}`,
      );
    }
    if (mismatches.length > 5) console.log(`  ... +${mismatches.length - 5} more`);
  } else {
    ok++;
  }
}

console.log(`\nOK ${ok} | DRIFT ${drift} | checked ${slugs.length} slugs`);
