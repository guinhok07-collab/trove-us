/**
 * PayPal live health check — OAuth, create-order, merchant hints.
 * Usage: node --env-file=.env.local scripts/verify-paypal-live.mjs [baseUrl]
 */
const BASE = process.argv[2] || "https://trove-us.com";
const slug = "pet-hair-remover-roller";

async function main() {
  console.log("=== PayPal health ===\n");
  console.log("Site:", BASE);

  const pub = await fetch(`${BASE}/api/paypal`).then((r) => r.json());
  console.log("\nPublic config:", pub);
  if (!pub.configured) {
    console.error("\nFAIL: PayPal not configured on server");
    process.exit(1);
  }
  if (pub.mode !== "live") {
    console.warn("\nWARN: PAYPAL_MODE is not live — US buyers need live");
  }

  const orderId = `TROVE-VERIFY-${Date.now()}`;
  const createRes = await fetch(`${BASE}/api/paypal/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId, items: [{ slug, quantity: 1 }] }),
  });
  const createData = await createRes.json();
  if (!createRes.ok || !createData.paypalOrderId) {
    console.error("\nFAIL create-order:", createRes.status, createData);
    process.exit(1);
  }
  console.log("\nOK create-order:", createData.paypalOrderId);

  // Server-side OAuth (only works if env has secret — run against local with synced env)
  try {
    const { verifyPayPalServer } = await import("../src/lib/paypal-health.ts");
    const server = await verifyPayPalServer();
    console.log("\nServer OAuth:", server.ok ? "OK" : "FAIL", server.detail || server.error || "");
    if (server.mode) console.log("  mode:", server.mode);
    if (server.merchantEmail) console.log("  merchant:", server.merchantEmail);
    if (server.issues?.length) {
      console.log("  issues:");
      for (const i of server.issues) console.log("   -", i);
    }
  } catch (err) {
    console.log("\nServer OAuth: skip (", err.message, ")");
  }

  console.log(`
=== Checklist (PayPal Business) ===
1. business.paypal.com → conta verificada (não restrita)
2. developer.paypal.com → seu App LIVE → Features:
   → Advanced Credit and Debit Card Payments = ON
   → Accept Payments = ON
3. App → Live → Add domain: trove-us.com
4. Teste compra com IP dos EUA (VPN residencial) — Brasil costuma falhar em merchant US
5. Admin → /admin → aba Pagamentos (relatos de erro)

Next: complete a real $10.99 test on ${BASE}/products/${slug}
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
