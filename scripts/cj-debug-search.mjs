/** Debug CJ search hits for restore items */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const tests = [
  "cat window perch suction",
  "silicone ice cube tray lid",
  "door draft stopper",
  "bed sheet organizer",
  "silicone food storage bag reusable",
  "meditation cushion zafu",
  "jade roller gua sha",
  "muscle massage roller stick",
  "webcam cover slide",
  "monitor light bar",
];

async function getToken() {
  const auth = await fetch(`${API}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: key }),
  }).then((r) => r.json());
  return auth.data.accessToken;
}

const token = await getToken();
for (const q of tests) {
  await sleep(1100);
  const p = new URLSearchParams({ page: "1", size: "10", keyWord: q, countryCode: "US", orderBy: "1", sort: "desc" });
  const list = await fetch(`${API}/product/listV2?${p}`, { headers: { "CJ-Access-Token": token } }).then((r) => r.json());
  const products = (list.data?.content || []).flatMap((g) => g.productList || []).slice(0, 5);
  console.log("\n===", q, "===");
  for (const hit of products) {
    console.log("-", (hit.nameEn || "").slice(0, 90), "| listed:", hit.listedNum);
  }
}
