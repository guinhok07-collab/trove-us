/**
 * Find unique pet PIDs + fix candidates.
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const src = readFileSync(resolve(__dirname, "../src/data/products.ts"), "utf8");
const used = new Set([...src.matchAll(/cjVid: "([^"]+)"/g)].map((m) => m[1]));

const auth = await fetch(`${API}/authentication/getAccessToken`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ apiKey: key }),
}).then((r) => r.json());
const token = auth.data.accessToken;

const qs = [
  { q: "cat scratching mat sisal flat board", must: ["scratch", "mat"], ban: ["car seat", "tree tall", "condo"] },
  { q: "pet deshedding rake undercoat tool", must: ["deshed"], ban: ["glove", "vacuum", "mitt"] },
  { q: "dog car seat cover waterproof back seat", must: ["seat cover", "dog"], ban: ["baby", "vevor", "scratching"] },
  { q: "dog snuffle mat foraging feeding", must: ["snuffle"], ban: ["litter", "yoga"] },
];

function ok(n, must, ban) {
  const x = (n || "").toLowerCase();
  if (ban.some((v) => x.includes(v))) return false;
  return must.every((v) => x.includes(v));
}

for (const s of qs) {
  await sleep(1300);
  const p = new URLSearchParams({ page: "1", size: "40", keyWord: s.q, countryCode: "US", orderBy: "1", sort: "desc" });
  const list = await fetch(`${API}/product/listV2?${p}`, { headers: { "CJ-Access-Token": token } }).then((r) => r.json());
  console.log("\n==", s.q);
  for (const h of (list.data?.content || []).flatMap((g) => g.productList || [])) {
    if (!ok(h.nameEn, s.must, s.ban)) continue;
    await sleep(1300);
    const r = await fetch(`${API}/product/query?pid=${h.id}`, { headers: { "CJ-Access-Token": token } }).then((x) => x.json());
    if (!r.result) continue;
    const d = r.data;
    const v = d.variants?.find((x) => x.variantSellPrice > 0) || d.variants?.[0];
    if (!v?.vid || used.has(v.vid)) continue;
    const imgs = (d.productImageSet || []).length;
    const cost = Number(v.variantSellPrice || 0);
    if (imgs < 4 || cost > 30) continue;
    console.log("NEW", cost, imgs, v.vid, d.pid, d.productNameEn.slice(0, 68));
    used.add(v.vid);
    break;
  }
}
