/**
 * Record vertical product videos (1080×1920) for Reels / TikTok / FB Stories.
 * Usage: node scripts/record-social-videos.mjs [limit]
 */
import { chromium } from "playwright";
import { readFileSync, mkdirSync, readdirSync, unlinkSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const template = resolve(root, "marketing/social/slides/video-ad-template.html");
const adsPath = resolve(root, "marketing/social/ads.json");
const outDir = resolve(root, "marketing/social/output/videos");
mkdirSync(outDir, { recursive: true });

const limit = process.argv[2] ? Number(process.argv[2]) : Infinity;
const SLIDE_COUNT = 4;
const SLIDE_MS = 2800;
const RECORD_MS = SLIDE_COUNT * SLIDE_MS + 600;

const ads = JSON.parse(readFileSync(adsPath, "utf8")).slice(0, limit);
const browser = await chromium.launch();

for (const ad of ads) {
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
    slideMs: String(SLIDE_MS),
  });
  if (ad.compare) qs.set("compare", ad.compare);

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
      // Remove só temporários do Playwright — não apagar outros produtos .webm
      if (f.endsWith(".webm") && f !== `${ad.file}.webm` && !/^\d{2}-/.test(f)) {
        try {
          unlinkSync(resolve(outDir, f));
        } catch {
          /* ignore locked temp files */
        }
      }
    }
    console.log("Video:", dest);
  }
}

await browser.close();
console.log(`\nDone — ${ads.length} videos → marketing/social/output/videos/`);
