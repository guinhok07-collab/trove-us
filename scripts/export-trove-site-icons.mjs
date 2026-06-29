/**
 * Static favicon + OG images for Trove (no dynamic /icon — faster on mobile).
 * Usage: node scripts/export-trove-site-icons.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appDir = resolve(root, "src/app");
const publicDir = resolve(root, "public");
const fontLink =
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700&display=swap";

function markHtml(size, opts = {}) {
  const { radiusPct = 0.4, fontPct = 0.4, bg = "#5f8a7a", color = "#fff" } = opts;
  const radius = Math.round(size * radiusPct);
  const font = Math.round(size * fontPct);
  const markBg = bg === "#faf9f7" ? "#5f8a7a" : bg;
  const markSize = Math.round(size * 0.52);
  const markRadius = Math.round(markSize * 0.4);
  const markFont = Math.round(markSize * 0.4);
  if (bg === "#faf9f7") {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><link href="${fontLink}" rel="stylesheet"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:${size}px;height:${size}px;background:${bg};display:flex;align-items:center;justify-content:center}
.mark{width:${markSize}px;height:${markSize}px;border-radius:${markRadius}px;background:${markBg};display:flex;align-items:center;justify-content:center;font-family:"Plus Jakarta Sans",sans-serif;font-weight:600;font-size:${markFont}px;color:#fff;line-height:1}</style></head>
<body><div class="mark">T</div></body></html>`;
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><link href="${fontLink}" rel="stylesheet"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:${size}px;height:${size}px;background:${bg};display:flex;align-items:center;justify-content:center;font-family:"Plus Jakarta Sans",sans-serif;font-weight:600;font-size:${font}px;color:${color};line-height:1;border-radius:${radius}px}</style></head>
<body>T</body></html>`;
}

function ogHtml() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><link href="${fontLink}" rel="stylesheet"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#faf9f7;font-family:"Plus Jakarta Sans",sans-serif;color:#1c1917;display:flex;align-items:center;padding:80px;gap:56px}
.mark{width:180px;height:180px;border-radius:72px;background:#5f8a7a;display:flex;align-items:center;justify-content:center;font-size:96px;font-weight:600;color:#fff;flex-shrink:0}
h1{font-size:72px;font-weight:700;letter-spacing:-0.03em;line-height:1.05}
p{margin-top:16px;font-size:32px;color:#78716c;font-weight:500}
.url{margin-top:28px;font-size:28px;font-weight:700;color:#5f8a7a}
</style></head>
<body>
<div class="mark">T</div>
<div>
<h1>Trove</h1>
<p>Pet · Home · Wellness · Desk &amp; Tech</p>
<p>Free shipping on every order</p>
<p class="url">trove-us.com</p>
</div>
</body></html>`;
}

const tmp = resolve(root, "public/.icon-export");
mkdirSync(tmp, { recursive: true });
mkdirSync(appDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

const iconExports = [
  { file: resolve(appDir, "icon.png"), size: 192, html: markHtml(192) },
  { file: resolve(appDir, "apple-icon.png"), size: 180, html: markHtml(180) },
  { file: resolve(publicDir, "favicon.png"), size: 32, html: markHtml(32, { radiusPct: 0.35, fontPct: 0.42 }) },
  { file: resolve(publicDir, "apple-icon.png"), size: 180, html: markHtml(180) },
  { file: resolve(publicDir, "og-image.png"), w: 1200, h: 630, html: ogHtml() },
  { file: resolve(publicDir, "product-image-fallback.png"), size: 480, html: markHtml(480, { bg: "#faf9f7", fontPct: 0.38 }) },
];

for (const item of iconExports) {
  const w = item.w ?? item.size;
  const h = item.h ?? item.size;
  const htmlPath = resolve(tmp, `${w}x${h}.html`);
  writeFileSync(htmlPath, item.html, "utf8");
  await page.setViewportSize({ width: w, height: h });
  await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: item.file, type: "png" });
  console.log("Saved:", item.file);
}

await browser.close();
rmSync(tmp, { recursive: true, force: true });
