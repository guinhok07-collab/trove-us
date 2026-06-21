import { chromium, devices } from "playwright";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "../screenshots-mobile");

const targets = [
  { name: "home-top", url: "https://trove-us.com", fullPage: false },
  { name: "home-scroll", url: "https://trove-us.com", fullPage: true },
  { name: "products-pet", url: "https://trove-us.com/products?store=pet", fullPage: false },
  {
    name: "product-detail",
    url: "https://trove-us.com/products/cat-feather-teaser",
    fullPage: false,
  },
];

const iphone = devices["iPhone 13"];

const browser = await chromium.launch();
const context = await browser.newContext({
  ...iphone,
  locale: "en-US",
});

for (const target of targets) {
  const page = await context.newPage();
  await page.goto(target.url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);

  if (target.name === "home-scroll") {
    await page.evaluate(() => window.scrollTo(0, 900));
    await page.waitForTimeout(800);
  }

  await page.screenshot({
    path: resolve(outDir, `${target.name}.png`),
    fullPage: target.fullPage,
  });
  await page.close();
  console.log("saved", target.name);
}

await browser.close();
