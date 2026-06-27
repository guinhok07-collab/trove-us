/**
 * Export Trove Instagram feed pack (1080x1080 PNGs).
 * Usage: node scripts/export-trove-instagram-pack.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "public/instagram");
const size = 1080;

mkdirSync(outDir, { recursive: true });

const fontLink =
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700&display=swap";

function baseStyles(variant) {
  if (variant === "dark") {
    return `
      body {
        width: ${size}px; height: ${size}px;
        background: linear-gradient(135deg, #1c1917 0%, #2d3d36 55%, #4d7366 100%);
        font-family: "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif;
        color: #fff;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        padding: 80px; text-align: center;
      }
      .badge { font-size: 22px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #bbf7d0; }
      h1 { margin-top: 28px; font-size: 68px; font-weight: 700; line-height: 1.05; letter-spacing: -0.03em; }
      .sub { margin-top: 24px; font-size: 32px; font-weight: 500; color: #dcfce7; line-height: 1.35; max-width: 880px; }
      .url { margin-top: 48px; font-size: 30px; font-weight: 700; color: #86efac; }
      .pills { margin-top: 40px; display: flex; flex-wrap: wrap; gap: 14px; justify-content: center; }
      .pill { padding: 14px 24px; border-radius: 999px; background: rgba(255,255,255,0.12); font-size: 22px; font-weight: 600; border: 1px solid rgba(255,255,255,0.15); }
    `;
  }

  if (variant === "green") {
    return `
      body {
        width: ${size}px; height: ${size}px;
        background: #5f8a7a;
        font-family: "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif;
        color: #fff;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        padding: 80px; text-align: center;
      }
      .emoji { font-size: 88px; line-height: 1; }
      h1 { margin-top: 32px; font-size: 64px; font-weight: 700; line-height: 1.08; letter-spacing: -0.03em; }
      .sub { margin-top: 24px; font-size: 30px; font-weight: 500; color: #ecfdf5; line-height: 1.35; max-width: 860px; }
      .url { margin-top: 44px; font-size: 28px; font-weight: 700; color: #fff; opacity: 0.95; }
    `;
  }

  return `
    body {
      width: ${size}px; height: ${size}px;
      background: #faf9f7;
      font-family: "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif;
      color: #1c1917;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 72px; text-align: center;
    }
    .mark {
      width: 150px; height: 150px; border-radius: 60px;
      background: #5f8a7a; display: flex; align-items: center; justify-content: center;
      font-size: 86px; font-weight: 600; color: #fff; line-height: 1;
    }
    .emoji { font-size: 96px; line-height: 1; }
    .badge { font-size: 20px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #5f8a7a; }
    h1 { margin-top: 28px; font-size: 62px; font-weight: 700; line-height: 1.08; letter-spacing: -0.03em; }
    .sub { margin-top: 20px; font-size: 28px; font-weight: 500; color: #78716c; line-height: 1.35; max-width: 860px; }
    .url { margin-top: 40px; font-size: 28px; font-weight: 700; color: #5f8a7a; }
    .pills { margin-top: 36px; display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
    .pill { padding: 12px 22px; border-radius: 999px; background: #eef4f1; color: #4d7366; font-size: 21px; font-weight: 600; }
    .grid { margin-top: 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; width: 100%; max-width: 760px; }
    .cell { background: #fff; border: 2px solid #e7e5e4; border-radius: 24px; padding: 36px 20px; font-size: 26px; font-weight: 700; color: #1c1917; }
    .cell span { display: block; font-size: 44px; margin-bottom: 12px; }
    .checks { margin-top: 32px; text-align: left; width: 100%; max-width: 720px; }
    .check { font-size: 26px; font-weight: 600; color: #44403c; margin: 14px 0; display: flex; align-items: center; gap: 14px; }
    .check i { color: #5f8a7a; font-style: normal; font-size: 28px; }
  `;
}

function pageHtml({ variant = "light", body }) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><link href="${fontLink}" rel="stylesheet" />
<style>${baseStyles(variant)}</style></head><body>${body}</body></html>`;
}

const posts = [
  {
    file: "01-meet-trove.png",
    variant: "light",
    body: `
      <div class="mark">T</div>
      <h1>Meet Trove</h1>
      <p class="sub">Life's essentials, in one place</p>
      <div class="pills">
        <span class="pill">Free shipping</span>
        <span class="pill">US delivery 3–5 days</span>
        <span class="pill">30-day returns</span>
      </div>
      <p class="url">trove-us.com</p>`,
  },
  {
    file: "02-free-shipping.png",
    variant: "dark",
    body: `
      <p class="badge">Always included</p>
      <h1>Free shipping on every order</h1>
      <p class="sub">Every product. Every state. Zero delivery fee.</p>
      <div class="pills">
        <span class="pill">All 50 US states</span>
        <span class="pill">Ships in 3–5 days</span>
        <span class="pill">No hidden fees</span>
      </div>
      <p class="url">trove-us.com</p>`,
  },
  {
    file: "03-four-departments.png",
    variant: "light",
    body: `
      <p class="badge">Shop by department</p>
      <h1>One store.<br/>Four essentials.</h1>
      <div class="grid">
        <div class="cell"><span>🐾</span>Pet</div>
        <div class="cell"><span>🏠</span>Home</div>
        <div class="cell"><span>💪</span>Wellness</div>
        <div class="cell"><span>💻</span>Desk &amp; Tech</div>
      </div>
      <p class="url">trove-us.com</p>`,
  },
  {
    file: "04-pet-essentials.png",
    variant: "green",
    body: `
      <div class="emoji">🐾</div>
      <h1>Pet Essentials</h1>
      <p class="sub">Walk gear, grooming, bowls &amp; more — shipped free across the US</p>
      <p class="url">trove-us.com/stores/pet</p>`,
  },
  {
    file: "05-home-comfort.png",
    variant: "green",
    body: `
      <div class="emoji">🏠</div>
      <h1>Home Comfort</h1>
      <p class="sub">Organizers, lights &amp; everyday upgrades for your space</p>
      <p class="url">trove-us.com/stores/home</p>`,
  },
  {
    file: "06-wellness-studio.png",
    variant: "green",
    body: `
      <div class="emoji">💪</div>
      <h1>Wellness Studio</h1>
      <p class="sub">Recovery, massage &amp; self-care — delivered to your door</p>
      <p class="url">trove-us.com/stores/wellness</p>`,
  },
  {
    file: "07-desk-tech.png",
    variant: "green",
    body: `
      <div class="emoji">💻</div>
      <h1>Desk &amp; Tech</h1>
      <p class="sub">Ergonomic gear &amp; everyday tech for work and play</p>
      <p class="url">trove-us.com/stores/tech</p>`,
  },
  {
    file: "08-shop-confidence.png",
    variant: "light",
    body: `
      <p class="badge">Shop with confidence</p>
      <h1>We've got you covered</h1>
      <div class="checks">
        <p class="check"><i>✓</i> Secure checkout — PayPal &amp; cards</p>
        <p class="check"><i>✓</i> Free shipping on every order</p>
        <p class="check"><i>✓</i> 30-day easy returns</p>
        <p class="check"><i>✓</i> Real support — orders@trove-us.com</p>
      </div>
      <p class="url">trove-us.com</p>`,
  },
  {
    file: "09-link-in-bio.png",
    variant: "dark",
    body: `
      <div class="mark" style="width:150px;height:150px;border-radius:60px;background:#5f8a7a;display:flex;align-items:center;justify-content:center;font-size:86px;font-weight:600;">T</div>
      <h1>Link in bio</h1>
      <p class="sub">Tap to shop pet, home, wellness &amp; desk picks — free delivery included</p>
      <p class="url">trove-us.com</p>`,
  },
];

const tmpDir = resolve(root, "public/.instagram-export");
mkdirSync(tmpDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: size, height: size },
  deviceScaleFactor: 1,
});

for (const post of posts) {
  const htmlPath = resolve(tmpDir, post.file.replace(".png", ".html"));
  const outPath = resolve(outDir, post.file);
  writeFileSync(htmlPath, pageHtml(post), "utf8");
  await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: outPath, type: "png" });
  console.log("Saved:", outPath);
}

await browser.close();
rmSync(tmpDir, { recursive: true, force: true });
console.log(`\nDone — ${posts.length} images in public/instagram/`);
