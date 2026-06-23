/**
 * Remove duplicate catalog entries and fix wrong CJ links.
 * Usage: node --env-file=.env.local scripts/fix-duplicates.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
if (!key) throw new Error("Set CJ_API_KEY");

const PAYPAL = 0.034;
const MARGIN = 0.2;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const REMOVE_SLUGS = new Set([
  "weighted-sleep-mask", // same CJ as sleep-eye-mask
  "tablet-stand-adjustable", // same CJ as adjustable-phone-stand
  "usb-c-adapter-dual", // same CJ as car-charger-usb-c
  "pet-deshedding-tool", // same CJ as pet-grooming-gloves
]);

const PATCH = {
  "dog-poop-bag-dispenser": { pid: "2411240930111626400", ship: 3.5 },
  "pet-food-storage-container": { pid: "1956556301854179329", ship: 5.5 },
};

function retailPrice(cost, ship) {
  const base = cost + ship;
  return Math.max(Math.ceil(base / (1 - MARGIN - PAYPAL)) - 0.01, base + 1.5);
}

function formatImages(images) {
  return JSON.stringify(images, null, 4)
    .split("\n")
    .map((line, idx) => (idx === 0 ? line : "      " + line.trim()))
    .join("\n");
}

async function getToken() {
  const auth = await fetch(`${API}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: key }),
  }).then((r) => r.json());
  return auth.data.accessToken;
}

async function queryPid(token, pid) {
  await sleep(1200);
  const res = await fetch(`${API}/product/query?pid=${encodeURIComponent(pid)}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());
  if (!res.result) throw new Error(`CJ query failed ${pid}: ${res.message}`);
  return res.data;
}

const path = resolve(__dirname, "../src/data/products.ts");
let source = readFileSync(path, "utf8");

// Remove duplicate product blocks
for (const slug of REMOVE_SLUGS) {
  const re = new RegExp(
    `\n  \\{\n    id: "[^"]+",\n    slug: "${slug}"[\\s\\S]*?\n  \\},?`,
    "m",
  );
  if (!re.test(source)) {
    console.log("SKIP remove (not found)", slug);
    continue;
  }
  source = source.replace(re, "");
  console.log("REMOVED", slug);
}

source = source.replace(/\},\s*\n\s*\n\s*\{/g, "},\n  {");

const token = await getToken();

for (const [slug, { pid, ship }] of Object.entries(PATCH)) {
  const data = await queryPid(token, pid);
  const v = data.variants?.find((x) => Number(x.variantSellPrice) > 0) || data.variants?.[0];
  if (!v?.vid) throw new Error(`No variant for ${slug}`);

  const cost = Number(v.variantSellPrice ?? 0);
  const price = retailPrice(cost, ship);
  const compareAt = Math.ceil(price * 1.1) - 0.01;
  const images = [...new Set([v.variantImage, data.bigImage, ...(data.productImageSet || [])].filter(Boolean))].slice(0, 8);
  const image = images[0];

  const blockRe = new RegExp(
    `(slug: "${slug}"[\\s\\S]*?image: )\"[^\"]+\"([\\s\\S]*?images: )\\[[\\s\\S]*?\\]([\\s\\S]*?price: )[0-9.]+([\\s\\S]*?compareAtPrice: )[0-9.]+([\\s\\S]*?supplierSku: )\"[^\"]+\"([\\s\\S]*?cjVid: )\"[^\"]+\"([\\s\\S]*?cjSku: )\"[^\"]+\"`,
    "m",
  );

  if (!blockRe.test(source)) {
    console.log("SKIP patch (not found)", slug);
    continue;
  }

  source = source.replace(
    blockRe,
    `$1${JSON.stringify(image)}$2${formatImages(images)}$3${price.toFixed(2)}$4${compareAt.toFixed(2)}$5${JSON.stringify(data.productSku)}$6${JSON.stringify(v.vid)}$7${JSON.stringify(v.variantSku)}`,
  );

  console.log("PATCHED", slug, `$${price.toFixed(2)}`, data.productNameEn?.slice(0, 45));
}

writeFileSync(path, source);

// Verify
const slugs = [...source.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]);
const dupSlugs = slugs.filter((s, i) => slugs.indexOf(s) !== i);
console.log("\nTotal slugs:", slugs.length);
console.log("Duplicate slugs:", dupSlugs.length ? dupSlugs : "(none)");
