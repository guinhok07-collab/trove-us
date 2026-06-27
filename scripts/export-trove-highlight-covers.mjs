/**
 * Export Trove Instagram Highlight covers (1080x1080 — icon centered for circle crop).
 * Usage: node scripts/export-trove-highlight-covers.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "public/instagram/highlights");
const size = 1080;

mkdirSync(outDir, { recursive: true });

const fontLink =
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700&display=swap";

const icons = {
  truck: `<path d="M3 7h11v8H3z"/><path d="M14 10h4l3 3v2h-7v-5z"/><circle cx="7" cy="17" r="2"/><circle cx="18" cy="17" r="2"/>`,
  pet: `<circle cx="8" cy="8" r="2"/><circle cx="16" cy="8" r="2"/><circle cx="5" cy="13" r="1.75"/><circle cx="19" cy="13" r="1.75"/><path d="M12 11c-2.8 0-5 2-5 4.5 0 2.2 1.6 3.5 5 3.5s5-1.3 5-3.5c0-2.5-2.2-4.5-5-4.5z"/>`,
  home: `<path d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z"/>`,
  wellness: `<path d="M12 20.5c-4.5-3.2-7-6.2-7-9.5a4 4 0 017-2.4 4 4 0 017 2.4c0 3.3-2.5 6.3-7 9.5z"/>`,
  tech: `<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8"/>`,
  support: `<path d="M21 11.5a8.4 8.4 0 01-.9 3.8 8 8 0 01-7.6 4.7 8 8 0 01-7.6-4.7 8.4 8.4 0 01-.9-3.8V7l8-3 8 3z"/><path d="M8 14.5a4 4 0 008 0"/>`,
  shop: `<path d="M6 6h15l-1.5 9h-12z"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M6 6L5 3H2"/>`,
  returns: `<path d="M3 7v6h6"/><path d="M21 17a8 8 0 00-14-5.3L3 13"/>`,
};

function svgIcon(name, px = 64) {
  return `<svg viewBox="0 0 24 24" width="${px}" height="${px}" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;
}

const covers = [
  { file: "01-free-ship.png", icon: "truck", label: "Free Ship" },
  { file: "02-pet.png", icon: "pet", label: "Pet" },
  { file: "03-home.png", icon: "home", label: "Home" },
  { file: "04-wellness.png", icon: "wellness", label: "Wellness" },
  { file: "05-tech.png", icon: "tech", label: "Tech" },
  { file: "06-shop.png", icon: "shop", label: "Shop" },
  { file: "07-support.png", icon: "support", label: "Support" },
  { file: "08-returns.png", icon: "returns", label: "Returns" },
];

const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${size}px; height: ${size}px; overflow: hidden;
    font-family: "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .cover {
    width: ${size}px; height: ${size}px;
    background: #faf9f7;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .ring {
    width: 420px; height: 420px;
    border-radius: 999px;
    background: #5f8a7a;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    box-shadow: 0 12px 40px rgba(77, 115, 102, 0.25);
  }
  .label {
    font-size: 28px;
    font-weight: 700;
    color: #fff;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    line-height: 1;
  }
`;

const tmpDir = resolve(root, "public/.highlight-export");
mkdirSync(tmpDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: size, height: size },
  deviceScaleFactor: 1,
});

for (const cover of covers) {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><link href="${fontLink}" rel="stylesheet"/><style>${css}</style></head>
<body><div class="cover"><div class="ring">${svgIcon(cover.icon)}<span class="label">${cover.label}</span></div></div></body></html>`;
  const htmlPath = resolve(tmpDir, cover.file.replace(".png", ".html"));
  const outPath = resolve(outDir, cover.file);
  writeFileSync(htmlPath, html, "utf8");
  await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: outPath, type: "png" });
  console.log("Saved:", outPath);
}

await browser.close();
rmSync(tmpDir, { recursive: true, force: true });
console.log(`\nDone — ${covers.length} highlight covers in public/instagram/highlights/`);
