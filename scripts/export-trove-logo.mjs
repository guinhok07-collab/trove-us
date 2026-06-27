/**
 * Export Trove profile logo PNG — pixel match to site-header.tsx logo mark.
 * Usage: node scripts/export-trove-logo.mjs
 */
import { chromium } from "playwright";
import { writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "public/trove-profile-logo.png");

const size = 1080;
// site-header.tsx: sm:h-10 sm:w-10 sm:rounded-2xl sm:text-base
// 40px box, 16px radius (40%), 16px font (40% of box)
const markSize = Math.round(size * 0.52);
const cornerRadius = Math.round(markSize * 0.4);
const fontSize = Math.round(markSize * 0.4);

const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <link
      href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600&display=swap"
      rel="stylesheet"
    />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: ${size}px;
        height: ${size}px;
        background: #faf9f7;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .mark {
        width: ${markSize}px;
        height: ${markSize}px;
        border-radius: ${cornerRadius}px;
        background: #5f8a7a;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif;
        font-weight: 600;
        font-size: ${fontSize}px;
        line-height: 1;
        color: #ffffff;
        letter-spacing: -0.02em;
      }
    </style>
  </head>
  <body>
    <div class="mark">T</div>
  </body>
</html>`;

const htmlPath = resolve(root, "public/.trove-logo-export.html");
writeFileSync(htmlPath, html, "utf8");

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: size, height: size },
  deviceScaleFactor: 1,
});
await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await page.screenshot({ path: out, type: "png" });
await browser.close();

console.log("Saved:", out);
