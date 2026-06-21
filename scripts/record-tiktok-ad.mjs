import { chromium } from "playwright";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const template = resolve(root, "marketing/tiktok/slides/ad-template.html");
const outDir = resolve(root, "marketing/tiktok/output/videos");
mkdirSync(outDir, { recursive: true });

const filter = process.argv[2] ?? "batch2";
const SLIDE_COUNT = 4;
const SLIDE_MS = 3200;
const RECORD_MS = SLIDE_COUNT * SLIDE_MS + 800;

function loadAds(file) {
  return JSON.parse(readFileSync(resolve(root, "marketing/tiktok/ads", file), "utf8"));
}

const categoryBadge = {
  pet: "Pet Essentials",
  home: "Home Comfort",
  wellness: "Wellness Studio",
  tech: "Desk & Tech",
};

let ads = [];
if (filter === "all") {
  ads = [
    ...loadAds("pet.json"),
    ...loadAds("wellness-tech.json"),
    ...loadAds("batch-2.json"),
  ];
} else if (filter === "batch2") {
  ads = loadAds("batch-2.json");
} else if (filter === "pet") {
  ads = loadAds("pet.json");
} else if (filter === "wellness" || filter === "tech") {
  ads = loadAds("wellness-tech.json").filter((a) => a.category === filter);
} else if (filter === "wellness-tech") {
  ads = loadAds("wellness-tech.json");
} else if (filter === "home") {
  ads = loadAds("batch-2.json").filter((a) => a.category === "home");
} else if (filter === "pet-walk-kit") {
  ads = loadAds("pet-walk-kit.json");
} else {
  console.error(
    "Usage: node scripts/record-tiktok-ad.mjs [all|batch2|pet|wellness|tech|home|wellness-tech]",
  );
  process.exit(1);
}

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
    badge: categoryBadge[ad.category] ?? "US shipping · 3–5 days",
  });
  if (ad.compare) qs.set("compare", ad.compare);
  if (ad.perk) qs.set("perk", ad.perk);

  const url = `${pathToFileURL(template).href}?${qs.toString()}`;

  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(RECORD_MS);

  const video = page.video();
  await context.close();

  if (video) {
    const dest = resolve(outDir, `${ad.file}.webm`);
    await video.saveAs(dest);
    console.log("saved", dest);
  }
}

await browser.close();
console.log(`Done (${ads.length} videos) → marketing/tiktok/output/videos/`);
