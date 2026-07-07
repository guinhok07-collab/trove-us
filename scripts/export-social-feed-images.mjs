/**
 * Export square feed images (1080×1080) for Instagram + Facebook posts.
 * Usage: node scripts/export-social-feed-images.mjs [limit]
 */
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const template = resolve(root, "marketing/social/slides/feed-ad-template.html");
const adsPath = resolve(root, "marketing/social/ads.json");
const outDir = resolve(root, "marketing/social/output/feed");
const publicDir = resolve(root, "public/social/feed");
mkdirSync(outDir, { recursive: true });
mkdirSync(publicDir, { recursive: true });

const limit = process.argv[2] ? Number(process.argv[2]) : Infinity;
const ads = JSON.parse(readFileSync(adsPath, "utf8")).slice(0, limit);

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1080, height: 1080 },
  deviceScaleFactor: 1,
});

for (const ad of ads) {
  const qs = new URLSearchParams({
    product: ad.product,
    price: ad.price,
    image: ad.image,
    badge: ad.badge,
  });
  if (ad.compare) qs.set("compare", ad.compare);

  await page.goto(`${pathToFileURL(template).href}?${qs}`, {
    waitUntil: "networkidle",
    timeout: 90000,
  });
  await page.waitForTimeout(1200);

  const name = `${ad.file}.png`;
  const dest = resolve(outDir, name);
  const pub = resolve(publicDir, name);
  await page.screenshot({ path: dest, type: "png" });
  await page.screenshot({ path: pub, type: "png" });
  console.log("Feed:", dest);
}

await browser.close();
console.log(`\nDone — ${ads.length} images → marketing/social/output/feed/`);
