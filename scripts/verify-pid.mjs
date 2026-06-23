/**
 * Quick PID validator for pet expand — prints name, cost, images count.
 * Usage: node --env-file=.env.local scripts/verify-pid.mjs <pid>
 */
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
const pids = process.argv.slice(2);
if (!pids.length) {
  console.error("Usage: node --env-file=.env.local scripts/verify-pid.mjs <pid>...");
  process.exit(1);
}

const auth = await fetch(`${API}/authentication/getAccessToken`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ apiKey: key }),
}).then((r) => r.json());
const token = auth.data.accessToken;

for (const pid of pids) {
  const res = await fetch(`${API}/product/query?pid=${encodeURIComponent(pid)}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());
  if (!res.result) {
    console.log("FAIL", pid, res.message);
    continue;
  }
  const d = res.data;
  const v = d.variants?.find((x) => Number(x.variantSellPrice) > 0) || d.variants?.[0];
  const imgs = (d.productImageSet || []).length;
  console.log("\n---", pid);
  console.log("NAME:", d.productNameEn);
  console.log("COST:", v?.variantSellPrice, "VID:", v?.vid, "SKU:", v?.variantSku);
  console.log("IMGS:", imgs, "LISTED:", d.listedNum);
}
