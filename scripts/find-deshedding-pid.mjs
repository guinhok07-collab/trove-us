import { readFileSync } from "fs";
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const src = readFileSync("src/data/products.ts", "utf8");
const used = new Set([...src.matchAll(/cjVid: "([^"]+)"/g)].map((m) => m[1]));

const auth = await fetch(`${API}/authentication/getAccessToken`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ apiKey: key }),
}).then((r) => r.json());
const token = auth.data.accessToken;

const queries = [
  "pet deshedding brush undercoat rake",
  "dog shedding brush stainless steel",
  "pet fur remover brush comb",
];

for (const q of queries) {
  console.log("\n==", q);
  await sleep(1300);
  const p = new URLSearchParams({ page: "1", size: "40", keyWord: q, countryCode: "US", orderBy: "1", sort: "desc" });
  const list = await fetch(`${API}/product/listV2?${p}`, { headers: { "CJ-Access-Token": token } }).then((r) => r.json());

  for (const h of (list.data?.content || []).flatMap((g) => g.productList || [])) {
    const n = (h.nameEn || "").toLowerCase();
    if (n.includes("glove") || n.includes("mitt") || n.includes("vacuum") || n.includes("paw") || n.includes("lint roller")) continue;
    if (!n.includes("brush") && !n.includes("rake") && !n.includes("comb") && !n.includes("deshed")) continue;
    await sleep(1300);
    const r = await fetch(`${API}/product/query?pid=${h.id}`, { headers: { "CJ-Access-Token": token } }).then((x) => x.json());
    if (!r.result) continue;
    const d = r.data;
    const v = d.variants?.find((x) => x.variantSellPrice > 0) || d.variants?.[0];
    if (!v?.vid || used.has(v.vid)) {
      console.log("SKIP used", d.pid, d.productNameEn?.slice(0, 50));
      continue;
    }
    const imgs = (d.productImageSet || []).length;
    console.log("FOUND", d.pid, v.vid, v.variantSku, `$${v.variantSellPrice}`, `${imgs} imgs`, d.productNameEn?.slice(0, 70));
    used.add(v.vid);
    break;
  }
}
