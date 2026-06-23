/** Debug CJ search hits for a slug */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { API, getToken, okName, queryPid, sleep } from "./lib/cj-catalog-lib.mjs";

const key = process.env.CJ_API_KEY;
const q = process.argv[2];
const must = (process.argv[3] || "").split("|").filter(Boolean);
const ban = (process.argv[4] || "").split("|").filter(Boolean);

const token = await getToken(key);
for (let page = 1; page <= 3; page++) {
  await sleep(1100);
  const params = new URLSearchParams({ page: String(page), size: "20", keyWord: q, countryCode: "US" });
  const list = await fetch(`${API}/product/listV2?${params}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());
  for (const hit of (list.data?.content || []).flatMap((g) => g.productList || [])) {
    if (must.length && !okName(hit.nameEn, must, ban, { all: true })) continue;
    console.log(hit.id, hit.nameEn?.slice(0, 80));
  }
}
