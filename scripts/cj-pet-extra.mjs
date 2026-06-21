import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PAYPAL = 0.034;
const MARGIN = 0.2;
const rp = (c, s) => Math.max(Math.ceil((c + s) / (1 - MARGIN - PAYPAL)) - 0.01, c + s + 1.5);

const QUERIES = [
  { slug: "pet-safety-light-clip", q: "led pet collar light safety night", must: ["pet", "light"], ban: ["stroller", "baby", "christmas tree"], ship: 3.5 },
  { slug: "pet-comb-flea", q: "pet flea comb stainless dog cat", must: ["comb"], ban: ["electric", "vacuum", "human wig"], ship: 3.5 },
];

async function token() {
  const a = await fetch(`${API}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: key }),
  }).then((r) => r.json());
  if (!a.result) throw new Error(a.message);
  return a.data.accessToken;
}

async function queryPid(t, pid) {
  await sleep(800);
  const res = await fetch(`${API}/product/query?pid=${encodeURIComponent(pid)}`, {
    headers: { "CJ-Access-Token": t },
  }).then((r) => r.json());
  return res.result ? res.data : null;
}

async function pick(t, item) {
  for (let page = 1; page <= 4; page++) {
    await sleep(800);
    const p = new URLSearchParams({ page: String(page), size: "40", keyWord: item.q, orderBy: "1", sort: "desc" });
    const list = await fetch(`${API}/product/listV2?${p}`, { headers: { "CJ-Access-Token": t } }).then((r) => r.json());
    for (const hit of (list.data?.content || []).flatMap((g) => g.productList || [])) {
      const n = (hit.nameEn || "").toLowerCase();
      if (item.ban.some((b) => n.includes(b))) continue;
      if (!item.must.every((m) => n.includes(m))) continue;
      const data = await queryPid(t, hit.id);
      const v = data?.variants?.find((x) => Number(x.variantSellPrice) > 0) || data?.variants?.[0];
      if (!v?.vid) continue;
      const cost = Number(v.variantSellPrice ?? data.sellPrice ?? 0);
      if (cost < 0.3 || cost > 9) continue;
      const images = [...new Set([v.variantImage, data.productImage, ...(data.productImageSet || [])].filter((u) => typeof u === "string" && u.startsWith("http")))].slice(0, 8);
      if (!images.length) continue;
      const price = rp(cost, item.ship);
      return {
        slug: item.slug,
        pid: data.pid,
        ship: item.ship,
        cost,
        price,
        compareAtPrice: Math.ceil(price * 1.1) - 0.01,
        cjName: data.productNameEn,
        supplierSku: data.productSku,
        cjVid: v.vid,
        cjSku: v.variantSku,
        image: images[0],
        images,
        listedNum: data.listedNum,
      };
    }
  }
  return null;
}

if (!key) throw new Error("CJ_API_KEY");
const t = await token();
const out = {};
for (const q of QUERIES) {
  const found = await pick(t, q);
  if (found) {
    out[q.slug] = found;
    console.log("OK", q.slug, found.cjName.slice(0, 55), `$${found.cost} → $${found.price}`);
  } else console.log("FAIL", q.slug);
}
writeFileSync(resolve(__dirname, "cj-pet-extra.json"), JSON.stringify(out, null, 2));
