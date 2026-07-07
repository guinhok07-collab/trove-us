/**
 * Export Trove Instagram feed post (1080x1080) — brand intro.
 * Usage: node scripts/export-trove-instagram-post.mjs
 */
import { chromium } from "playwright";
import { writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "public/trove-instagram-post-01-meet.png");

const size = 1080;
const markRadius = Math.round(160 * 0.4);

const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <link
      href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700&display=swap"
      rel="stylesheet"
    />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: ${size}px;
        height: ${size}px;
        background: #faf9f7;
        font-family: "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif;
        color: #1c1917;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 72px;
        text-align: center;
      }
      .mark {
        width: 160px;
        height: 160px;
        border-radius: ${markRadius}px;
        background: #5f8a7a;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 92px;
        font-weight: 600;
        color: #fff;
        line-height: 1;
      }
      h1 {
        margin-top: 36px;
        font-size: 72px;
        font-weight: 700;
        letter-spacing: -0.03em;
      }
      .tagline {
        margin-top: 16px;
        font-size: 30px;
        font-weight: 500;
        color: #78716c;
      }
      .pill-row {
        margin-top: 48px;
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
        justify-content: center;
      }
      .pill {
        padding: 14px 22px;
        border-radius: 999px;
        background: #eef4f1;
        color: #4d7366;
        font-size: 22px;
        font-weight: 600;
      }
      .url {
        margin-top: 48px;
        font-size: 28px;
        font-weight: 600;
        color: #5f8a7a;
      }
    </style>
  </head>
  <body>
    <div class="mark">T</div>
    <h1>Trove</h1>
    <p class="tagline">Life's essentials, in one place</p>
    <div class="pill-row">
      <span class="pill">Free shipping</span>
      <span class="pill">US delivery 3–5 days</span>
      <span class="pill">30-day returns</span>
    </div>
    <p class="url">trove-us.com</p>
  </body>
</html>`;

const htmlPath = resolve(root, "public/.trove-instagram-post.html");
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
