/**
 * Record one product Reel video by slug.
 * Usage: node scripts/record-single-social-video.mjs <slug>
 */
import { chromium } from "playwright";
import { readFileSync, mkdirSync, readdirSync, unlinkSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { downloadCjVideo, cjVideoPath } from "./lib/cj-video-ad.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const slug = process.argv[2];
if (!slug) {
  console.error("Usage: node scripts/record-single-social-video.mjs <slug>");
  process.exit(1);
}

const template = resolve(root, "marketing/social/slides/video-ad-template.html");
const adsPath = resolve(root, "marketing/social/ads.json");
const outDir = resolve(root, "marketing/social/output/videos");
mkdirSync(outDir, { recursive: true });

const ads = JSON.parse(readFileSync(adsPath, "utf8"));
const ad = ads.find((a) => a.slug === slug);
if (!ad) {
  console.error(`Slug not found in ads.json: ${slug}`);
  process.exit(1);
}

const SLIDE_MS = 2800;
const CJ_PRODUCT_SLIDE_MS = 6000;

async function localCjVideoUrl() {
  if (!ad.video?.startsWith("http")) return null;
  const dest = cjVideoPath(ad.slug, ad.file);
  if (!existsSync(dest)) {
    try {
      await downloadCjVideo(ad.video, dest);
      console.log("Downloaded CJ video:", dest);
    } catch (err) {
      console.warn(`CJ video skip ${ad.slug}:`, err.message);
      return null;
    }
  }
  return pathToFileURL(dest).href;
}

const localVideo = await localCjVideoUrl();
const RECORD_MS = (localVideo ? CJ_PRODUCT_SLIDE_MS : SLIDE_MS) * 4 + 600;

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1080, height: 1920 },
  recordVideo: { dir: outDir, size: { width: 1080, height: 1920 } },
});

const qs = new URLSearchParams({
  hook: ad.hook,
  sub: ad.sub,
  price: ad.price,
  product: ad.product,
  image: ad.image,
  badge: ad.badge,
  perk: ad.perk,
  slideMs: String(localVideo ? CJ_PRODUCT_SLIDE_MS : SLIDE_MS),
});
if (ad.compare) qs.set("compare", ad.compare);
if (localVideo) qs.set("video", localVideo);

const page = await context.newPage();
await page.goto(`${pathToFileURL(template).href}?${qs}`, {
  waitUntil: "networkidle",
  timeout: 90000,
});
await page.waitForTimeout(RECORD_MS);

const video = page.video();
await context.close();

if (video) {
  const dest = resolve(outDir, `${ad.file}.webm`);
  await video.saveAs(dest);
  for (const f of readdirSync(outDir)) {
    if (f.endsWith(".webm") && f !== `${ad.file}.webm` && !/^\d{2}-/.test(f)) {
      try {
        unlinkSync(resolve(outDir, f));
      } catch {
        /* ignore */
      }
    }
  }
  console.log("Video:", dest);
} else {
  console.error("No video recorded");
  process.exit(1);
}

await browser.close();
