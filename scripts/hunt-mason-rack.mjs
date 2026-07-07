import { getToken, queryPid, supplierImages, API, sleep } from "./lib/cj-catalog-lib.mjs";

const t = await getToken(process.env.CJ_API_KEY);
const queries = [
  "mason jar pour spout lid set",
  "wide mouth jar shaker lid",
  "canning jar storage caps pour",
  "silicone roll dish drying rack",
  "over sink dish drying mat roll",
  "stainless roll up sink rack",
];

for (const q of queries) {
  console.log("Q:", q);
  const p = new URLSearchParams({ page: "1", size: "30", keyWord: q, orderBy: "1", sort: "desc" });
  const l = await fetch(`${API}/product/listV2?${p}`, { headers: { "CJ-Access-Token": t } }).then((r) => r.json());
  for (const h of (l.data?.content || []).flatMap((g) => g.productList || []).slice(0, 8)) {
    const d = await queryPid(t, h.id);
    const v = d?.variants?.find((x) => Number(x.variantSellPrice) > 0) || d?.variants?.[0];
    const imgs = supplierImages(d, v);
    if (imgs.length < 4) continue;
    console.log(" -", d?.productNameEn?.slice(0, 70), "|", h.id, "|", v?.variantSellPrice);
  }
  await sleep(1000);
}
