/**
 * Playwright: add cheap product to cart and reach PayPal on checkout.
 * Usage: node scripts/test-purchase-ui.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.TEST_BASE_URL || "https://trove-us.com";
const SLUG = process.env.TEST_SLUG || "screen-cleaner-kit";
const PRODUCT_URL = `${BASE}/products/${SLUG}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

console.log("→ Product", PRODUCT_URL);
await page.goto(PRODUCT_URL, { waitUntil: "networkidle", timeout: 60000 });

const title = await page.locator("h1").first().textContent();
const priceText = await page.locator("text=/\\$[0-9]+\\.[0-9]{2}/").first().textContent();
console.log("  title:", title?.trim());
console.log("  price:", priceText?.trim());

await page.getByRole("button", { name: /add to cart/i }).click();
await page.waitForTimeout(800);

console.log("→ Cart");
await page.goto(`${BASE}/cart`, { waitUntil: "networkidle", timeout: 60000 });
const cartTotal = await page.locator("text=/\\$[0-9]+\\.[0-9]{2}/").first().textContent();
console.log("  cart shows:", cartTotal?.trim());

console.log("→ Checkout");
await page.goto(`${BASE}/checkout`, { waitUntil: "networkidle", timeout: 60000 });

for (const [placeholder, value] of [
  ["Full name", "Test Buyer"],
  ["Street address", "123 Test Street"],
  ["City", "Miami"],
  ["State", "FL"],
  ["ZIP code", "33101"],
  ["Phone", "3055550100"],
]) {
  await page.getByPlaceholder(placeholder).fill(value);
}
await page.getByRole("textbox", { name: "Email", exact: true }).fill("test@example.com");

await page.waitForTimeout(3000);

const paypalIframe = page.locator('iframe[title*="PayPal"], iframe[name*="paypal"]');
const paypalVisible = await paypalIframe.count();
const checkoutTotal = await page.locator("text=/Total|Order total/i").locator("..").textContent().catch(() => "");

console.log("  PayPal iframe(s):", paypalVisible);
if (checkoutTotal) console.log("  checkout block:", checkoutTotal.replace(/\s+/g, " ").slice(0, 120));

const paypalConfig = await page.evaluate(async () => {
  const r = await fetch("/api/paypal");
  return r.json();
}).catch(() => null);

console.log("  PayPal mode:", paypalConfig?.mode, "| configured:", paypalConfig?.configured);

await page.screenshot({ path: "screenshots-mobile/checkout-test.png", fullPage: true });
console.log("\nScreenshot: screenshots-mobile/checkout-test.png");
console.log("\nREADY — complete payment manually at:", `${BASE}/checkout`);

await browser.close();
