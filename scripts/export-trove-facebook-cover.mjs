/**
 * Facebook Page cover — 1640×624, mobile-first safe zone.
 * - Text centered in top band (mobile crops left/right edges)
 * - Bottom 58% empty for profile photo overlap on all devices
 * Usage: node scripts/export-trove-facebook-cover.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const width = 1640;
const height = 624;
const out = resolve(root, "public/trove-facebook-cover.png");

const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <link
      href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"
      rel="stylesheet"
    />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: ${width}px;
        height: ${height}px;
        overflow: hidden;
        font-family: "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      .cover {
        position: relative;
        width: ${width}px;
        height: ${height}px;
        background: linear-gradient(155deg, #3d6358 0%, #5f8a7a 48%, #7aa896 100%);
        overflow: hidden;
      }
      .shine {
        position: absolute;
        left: 50%;
        top: -200px;
        transform: translateX(-50%);
        width: 900px;
        height: 500px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255,255,255,0.14) 0%, transparent 68%);
      }
      .dots {
        position: absolute;
        inset: 0;
        opacity: 0.06;
        background-image: radial-gradient(circle, #fff 1px, transparent 1px);
        background-size: 32px 32px;
      }
      /* Mobile-safe: center block, max 720px, top 48px */
      .safe {
        position: absolute;
        left: 50%;
        top: 44px;
        transform: translateX(-50%);
        width: 720px;
        text-align: center;
        color: #fff;
      }
      .eyebrow {
        font-size: 20px;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        opacity: 0.88;
      }
      .title {
        margin-top: 10px;
        font-size: 72px;
        font-weight: 800;
        line-height: 1;
        letter-spacing: -0.04em;
      }
      .categories {
        margin-top: 14px;
        font-size: 26px;
        font-weight: 600;
        opacity: 0.95;
        letter-spacing: 0.01em;
      }
      .pill-row {
        margin-top: 18px;
        display: flex;
        justify-content: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .pill {
        padding: 10px 22px;
        border-radius: 999px;
        background: rgba(255,255,255,0.16);
        border: 2px solid rgba(255,255,255,0.28);
        font-size: 20px;
        font-weight: 700;
        white-space: nowrap;
      }
      /* Profile photo safe zone marker (hidden in export) */
      .profile-zone {
        position: absolute;
        left: 50%;
        bottom: 0;
        transform: translateX(-50%);
        width: 220px;
        height: 220px;
        opacity: 0;
      }
    </style>
  </head>
  <body>
    <div class="cover">
      <div class="shine"></div>
      <div class="dots"></div>
      <div class="safe">
        <div class="eyebrow">Shop Trove</div>
        <div class="title">Trove</div>
        <div class="categories">Pet · Home · Wellness · Desk</div>
        <div class="pill-row">
          <span class="pill">Free shipping · US</span>
          <span class="pill">trove-us.com</span>
        </div>
      </div>
      <div class="profile-zone" aria-hidden="true"></div>
    </div>
  </body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: 2,
});
await page.setContent(html, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
const buffer = await page.locator(".cover").screenshot({ type: "png" });
await browser.close();

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, buffer);

const desktopDirs = [
  resolve(process.env.USERPROFILE ?? "", "OneDrive/Desktop/Trove-Redes-Sociais"),
  resolve(process.env.USERPROFILE ?? "", "OneDrive/Desktop/Trove-Meta-Anuncios"),
];
for (const dir of desktopDirs) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, "trove-facebook-cover.png"), buffer);
}

console.log("Saved:", out);
console.log("Desktop copies in Trove-Redes-Sociais + Trove-Meta-Anuncios");
