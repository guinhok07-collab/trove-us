/**
 * Register CJ webhooks for order + logistics updates.
 *
 * Usage:
 *   CJ_API_KEY=... NEXT_PUBLIC_SITE_URL=https://trove-us.vercel.app node scripts/setup-cj-webhook.mjs
 */
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://trove-us.vercel.app").replace(/\/$/, "");
const webhookUrl = `${site}/api/cj/webhook`;

if (!key) {
  console.error("Set CJ_API_KEY");
  process.exit(1);
}

async function getToken() {
  const auth = await fetch(`${API}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: key }),
  }).then((r) => r.json());
  if (!auth.result) throw new Error(auth.message);
  console.log("CJ openId (save as CJ_OPEN_ID in Vercel):", auth.data?.openId);
  return auth.data.accessToken;
}

async function main() {
  const token = await getToken();
  const body = {
    product: { type: "CANCEL", callbackUrls: [webhookUrl] },
    stock: { type: "CANCEL", callbackUrls: [webhookUrl] },
    order: { type: "ENABLE", callbackUrls: [webhookUrl] },
    logistics: { type: "ENABLE", callbackUrls: [webhookUrl] },
    makeup: { type: "CANCEL", callbackUrls: [webhookUrl] },
  };

  const res = await fetch(`${API}/webhook/set`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CJ-Access-Token": token,
    },
    body: JSON.stringify(body),
  }).then((r) => r.json());

  console.log(JSON.stringify(res, null, 2));
  console.log("\nWebhook URL:", webhookUrl);
  console.log("Enabled: ORDER + LOGISTICS (tracking emails)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
