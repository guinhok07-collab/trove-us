/**
 * Smoke-test checkout: create PayPal order via API (no capture).
 * Usage: node --env-file=.env.local scripts/test-checkout-flow.mjs [slug]
 * Env: TEST_BASE_URL (default http://localhost:3000)
 */
const slug = process.argv[2] || "screen-cleaner-kit";
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";

async function main() {
  const orderId = `TROVE-TEST-${Date.now()}`;

  // Hit running app's create-order API
  const res = await fetch(`${BASE}/api/paypal/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId,
      items: [{ slug, quantity: 1 }],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("FAIL create-order", res.status, data);
    process.exit(1);
  }

  console.log("OK create-order");
  console.log("  slug:", slug);
  console.log("  orderId:", orderId);
  console.log("  paypalOrderId:", data.paypalOrderId);
  console.log("\nNext: open checkout, pay with PayPal, capture completes the order.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
