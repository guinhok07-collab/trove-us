/**
 * Export Trove Instagram feed pack (1080x1080) — professional aligned layouts.
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

const icons = {
  pet: `<circle cx="8" cy="8" r="2"/><circle cx="16" cy="8" r="2"/><circle cx="5" cy="13" r="1.75"/><circle cx="19" cy="13" r="1.75"/><path d="M12 11c-2.8 0-5 2-5 4.5 0 2.2 1.6 3.5 5 3.5s5-1.3 5-3.5c0-2.5-2.2-4.5-5-4.5z"/>`,
  home: `<path d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z"/>`,
  wellness: `<path d="M12 20.5c-4.5-3.2-7-6.2-7-9.5a4 4 0 017-2.4 4 4 0 017 2.4c0 3.3-2.5 6.3-7 9.5z"/>`,
  tech: `<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8"/>`,
  truck: `<path d="M3 7h11v8H3z"/><path d="M14 10h4l3 3v2h-7v-5z"/><circle cx="7" cy="17" r="2"/><circle cx="18" cy="17" r="2"/>`,
  package: `<path d="M12 2l8 4.5v11L12 22l-8-4.5v-11L12 2z"/><path d="M12 12l8-4.5M12 12v10M12 12L4 7.5"/>`,
  lock: `<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 118 0v3"/>`,
  check: `<path d="M20 6L9 17l-5-5"/>`,
};

function svgIcon(name, px = 52, color = "currentColor", stroke = 2) {
  return `<svg viewBox="0 0 24 24" width="${px}" height="${px}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
}

function iconBox(name, variant = "light") {
  const bg =
    variant === "green"
      ? "background:rgba(255,255,255,0.14);border:2px solid rgba(255,255,255,0.28);color:#fff;"
      : variant === "dark"
        ? "background:rgba(255,255,255,0.12);border:2px solid rgba(255,255,255,0.2);color:#fff;"
        : "background:#eef4f1;border:2px solid #dce8e2;color:#4d7366;";
  return `<div class="icon-box" style="${bg}">${svgIcon(name, 52)}</div>`;
}

function markT(size = 140) {
  const radius = Math.round(size * 0.4);
  const font = Math.round(size * 0.52);
  return `<div class="mark" style="width:${size}px;height:${size}px;border-radius:${radius}px;font-size:${font}px;">T</div>`;
}

function frame(content, theme = "light") {
  const themes = {
    light: "theme-light",
    dark: "theme-dark",
    green: "theme-green",
  };
  return `<div class="canvas ${themes[theme] ?? "theme-light"}">${content}</div>`;
}

function shell({ main, footer, theme = "light" }) {
  return frame(
    `<main class="main">${main}</main><footer class="footer">${footer}</footer>`,
    theme,
  );
}

const sharedCss = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${size}px; height: ${size}px; overflow: hidden;
    font-family: "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .canvas {
    width: ${size}px; height: ${size}px;
    display: grid;
    grid-template-rows: 1fr auto;
    padding: 72px 80px 64px;
  }
  .main {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    width: 100%;
    min-height: 0;
  }
  .footer {
    text-align: center;
    font-size: 24px;
    font-weight: 600;
    letter-spacing: 0.01em;
    padding-top: 32px;
    line-height: 1;
  }
  .eyebrow {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    line-height: 1;
  }
  .title {
    margin-top: 20px;
    font-size: 58px;
    font-weight: 700;
    line-height: 1.08;
    letter-spacing: -0.03em;
    max-width: 880px;
  }
  .subtitle {
    margin-top: 22px;
    font-size: 28px;
    font-weight: 500;
    line-height: 1.4;
    max-width: 760px;
  }
  .mark {
    background: #5f8a7a;
    color: #fff;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    flex-shrink: 0;
  }
  .icon-box {
    width: 112px;
    height: 112px;
    border-radius: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .pills {
    margin-top: 36px;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: center;
    max-width: 820px;
  }
  .pill {
    padding: 12px 22px;
    border-radius: 999px;
    font-size: 20px;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
  }
  .grid {
    margin-top: 40px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 18px;
    width: 100%;
    max-width: 720px;
  }
  .cell {
    border-radius: 22px;
    padding: 32px 20px 28px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    min-height: 168px;
  }
  .cell .cell-icon {
    width: 64px;
    height: 64px;
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .cell .cell-label {
    font-size: 22px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.01em;
  }
  .card {
    margin-top: 36px;
    width: 100%;
    max-width: 680px;
    border-radius: 24px;
    padding: 32px 40px;
    text-align: left;
  }
  .check-row {
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 24px;
    font-weight: 600;
    line-height: 1.3;
    padding: 12px 0;
  }
  .check-dot {
    width: 32px;
    height: 32px;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .theme-light { background: #faf9f7; color: #1c1917; }
  .theme-light .eyebrow { color: #5f8a7a; }
  .theme-light .subtitle { color: #78716c; }
  .theme-light .footer { color: #5f8a7a; }
  .theme-light .pill { background: #eef4f1; color: #4d7366; }
  .theme-light .cell { background: #fff; border: 2px solid #e7e5e4; }
  .theme-light .cell-icon { background: #eef4f1; color: #4d7366; }
  .theme-light .cell-label { color: #1c1917; }
  .theme-light .card { background: #fff; border: 2px solid #e7e5e4; }
  .theme-light .check-row { color: #44403c; }
  .theme-light .check-dot { background: #eef4f1; color: #5f8a7a; }
  .theme-dark {
    background: linear-gradient(145deg, #1c1917 0%, #2a3832 50%, #4d7366 100%);
    color: #fff;
  }
  .theme-dark .eyebrow { color: #bbf7d0; }
  .theme-dark .subtitle { color: #dcfce7; }
  .theme-dark .footer { color: #86efac; }
  .theme-dark .pill {
    background: rgba(255,255,255,0.1);
    color: #fff;
    border: 1px solid rgba(255,255,255,0.16);
  }
  .theme-green {
    background: linear-gradient(160deg, #4d7366 0%, #5f8a7a 55%, #6b9688 100%);
    color: #fff;
  }
  .theme-green .eyebrow { color: #dcfce7; opacity: 0.95; }
  .theme-green .subtitle { color: #f0fdf4; opacity: 0.92; }
  .theme-green .footer { color: #fff; opacity: 0.95; }
`;

function pageHtml(content, theme) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><link href="${fontLink}" rel="stylesheet" />
<style>${sharedCss}</style></head><body>${content}</body></html>`;
}

const posts = [
  {
    file: "01-meet-trove.png",
    theme: "light",
    html: shell({
      theme: "light",
      footer: "trove-us.com",
      main: `
        ${markT(140)}
        <h1 class="title" style="margin-top:28px;">Meet Trove</h1>
        <p class="subtitle">Life's essentials, in one place</p>
        <div class="pills">
          <span class="pill">Free shipping</span>
          <span class="pill">US delivery 3–5 days</span>
          <span class="pill">30-day returns</span>
        </div>`,
    }),
  },
  {
    file: "02-free-shipping.png",
    theme: "dark",
    html: shell({
      theme: "dark",
      footer: "trove-us.com",
      main: `
        <div class="icon-box" style="background:rgba(255,255,255,0.12);border:2px solid rgba(255,255,255,0.2);color:#fff;">
          ${svgIcon("truck", 52, "#fff", 2)}
        </div>
        <p class="eyebrow" style="margin-top:28px;">Always included</p>
        <h1 class="title">Free shipping on every order</h1>
        <p class="subtitle">Every product. Every state. Zero delivery fee.</p>
        <div class="pills">
          <span class="pill">All 50 US states</span>
          <span class="pill">Ships in 3–5 days</span>
          <span class="pill">No hidden fees</span>
        </div>`,
    }),
  },
  {
    file: "03-four-departments.png",
    theme: "light",
    html: shell({
      theme: "light",
      footer: "trove-us.com",
      main: `
        <p class="eyebrow">Shop by department</p>
        <h1 class="title">One store.<br/>Four essentials.</h1>
        <div class="grid">
          <div class="cell"><div class="cell-icon">${svgIcon("pet", 34, "#4d7366", 2)}</div><span class="cell-label">Pet</span></div>
          <div class="cell"><div class="cell-icon">${svgIcon("home", 34, "#4d7366", 2)}</div><span class="cell-label">Home</span></div>
          <div class="cell"><div class="cell-icon">${svgIcon("wellness", 34, "#4d7366", 2)}</div><span class="cell-label">Wellness</span></div>
          <div class="cell"><div class="cell-icon">${svgIcon("tech", 34, "#4d7366", 2)}</div><span class="cell-label">Desk &amp; Tech</span></div>
        </div>`,
    }),
  },
  {
    file: "04-pet-essentials.png",
    theme: "green",
    html: shell({
      theme: "green",
      footer: "trove-us.com/stores/pet",
      main: `
        ${iconBox("pet", "green")}
        <p class="eyebrow" style="margin-top:28px;">Department</p>
        <h1 class="title">Pet Essentials</h1>
        <p class="subtitle">Walk gear, grooming, bowls &amp; more — shipped free across the US</p>`,
    }),
  },
  {
    file: "05-home-comfort.png",
    theme: "green",
    html: shell({
      theme: "green",
      footer: "trove-us.com/stores/home",
      main: `
        ${iconBox("home", "green")}
        <p class="eyebrow" style="margin-top:28px;">Department</p>
        <h1 class="title">Home Comfort</h1>
        <p class="subtitle">Organizers, lights &amp; everyday upgrades for your space</p>`,
    }),
  },
  {
    file: "06-wellness-studio.png",
    theme: "green",
    html: shell({
      theme: "green",
      footer: "trove-us.com/stores/wellness",
      main: `
        ${iconBox("wellness", "green")}
        <p class="eyebrow" style="margin-top:28px;">Department</p>
        <h1 class="title">Wellness Studio</h1>
        <p class="subtitle">Recovery, massage &amp; self-care — delivered to your door</p>`,
    }),
  },
  {
    file: "07-desk-tech.png",
    theme: "green",
    html: shell({
      theme: "green",
      footer: "trove-us.com/stores/tech",
      main: `
        ${iconBox("tech", "green")}
        <p class="eyebrow" style="margin-top:28px;">Department</p>
        <h1 class="title">Desk &amp; Tech</h1>
        <p class="subtitle">Ergonomic gear &amp; everyday tech for work and play</p>`,
    }),
  },
  {
    file: "08-shop-confidence.png",
    theme: "light",
    html: shell({
      theme: "light",
      footer: "trove-us.com",
      main: `
        <p class="eyebrow">Shop with confidence</p>
        <h1 class="title">We've got you covered</h1>
        <div class="card">
          <div class="check-row"><span class="check-dot">${svgIcon("lock", 18, "#5f8a7a", 2.2)}</span>Secure checkout — PayPal &amp; cards</div>
          <div class="check-row"><span class="check-dot">${svgIcon("package", 18, "#5f8a7a", 2.2)}</span>Free shipping on every order</div>
          <div class="check-row"><span class="check-dot">${svgIcon("check", 18, "#5f8a7a", 2.5)}</span>30-day easy returns</div>
          <div class="check-row"><span class="check-dot">${svgIcon("check", 18, "#5f8a7a", 2.5)}</span>Real support — orders@trove-us.com</div>
        </div>`,
    }),
  },
  {
    file: "09-link-in-bio.png",
    theme: "dark",
    html: shell({
      theme: "dark",
      footer: "trove-us.com",
      main: `
        ${markT(130)}
        <h1 class="title" style="margin-top:28px;">Link in bio</h1>
        <p class="subtitle">Tap to shop pet, home, wellness &amp; desk picks — free delivery included</p>`,
    }),
  },
  {
    file: "10-massage-gun.png",
    theme: "dark",
    html: shell({
      theme: "dark",
      footer: "trove-us.com/products/percussion-massage-gun",
      main: `
        ${iconBox("wellness", "green")}
        <p class="eyebrow" style="margin-top:28px;">This week's pick</p>
        <h1 class="title">Mini Massage Gun</h1>
        <p class="subtitle">Sore muscles? Recovery at home — quiet motor, multiple speeds, free US shipping.</p>
        <div class="pills">
          <span class="pill">$12.99 delivered</span>
          <span class="pill">Ships in 3–5 days</span>
        </div>`,
    }),
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
  writeFileSync(htmlPath, pageHtml(post.html, post.theme), "utf8");
  await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.screenshot({ path: outPath, type: "png" });
  console.log("Saved:", outPath);
}

await browser.close();
rmSync(tmpDir, { recursive: true, force: true });
console.log(`\nDone — ${posts.length} images in public/instagram/`);
