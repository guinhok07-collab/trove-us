/**
 * Debug PayPal checkout — console/network errors on live site.
 */
import { chromium } from "playwright";

const BASE = "https://trove-us.com";
const errors = [];
const failed = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push(String(err)));
page.on("requestfailed", (req) => {
  if (/paypal/i.test(req.url())) failed.push(req.url());
});

await page.goto(`${BASE}/products/screen-cleaner-kit`, { waitUntil: "networkidle", timeout: 90000 });
await page.getByRole("button", { name: /add to cart/i }).click();
await page.waitForTimeout(500);
await page.goto(`${BASE}/checkout`, { waitUntil: "networkidle", timeout: 90000 });

const shipping = page.locator("section.card").filter({ hasText: "Shipping Address" });
for (const [label, val] of [
  ["Full name", "Test Buyer"],
  ["Street address", "123 Ocean Drive"],
  ["City", "Miami"],
  ["State", "FL"],
  ["ZIP code", "33139"],
  ["Phone", "3055550198"],
  ["Email", "test@example.com"],
]) {
  await shipping.getByLabel(label, { exact: true }).fill(val);
}

await page.waitForTimeout(8000);

const paypalApi = await page.evaluate(async () => {
  const r = await fetch("/api/paypal");
  return r.json();
});

const iframeCount = await page.locator("iframe").count();
const paypalDiv = await page.locator('[id*="paypal"], [data-paypal]').count();
const paymentHtml = await page.locator("section.card").nth(1).innerHTML().catch(() => "");

console.log("PayPal API:", JSON.stringify(paypalApi));
console.log("iframes:", iframeCount, "paypal nodes:", paypalDiv);
console.log("PayPal script failed:", failed.slice(0, 5));
console.log("Console errors:", errors.slice(0, 15));
console.log("Payment section snippet:", paymentHtml.slice(0, 500));

await browser.close();
