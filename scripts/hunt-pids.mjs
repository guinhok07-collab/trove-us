import { getToken, queryPid, supplierImages, API, sleep } from "./lib/cj-catalog-lib.mjs";

const t = await getToken(process.env.CJ_API_KEY);

async function hunt(label, q, pred) {
  console.log("===", label);
  for (let page = 1; page <= 5; page++) {
    const p = new URLSearchParams({
      page: String(page),
      size: "50",
      keyWord: q,
      orderBy: "1",
      sort: "desc",
    });
    const l = await fetch(`${API}/product/listV2?${p}`, {
      headers: { "CJ-Access-Token": t },
    }).then((r) => r.json());
    for (const h of (l.data?.content || []).flatMap((g) => g.productList || [])) {
      const n = (h.nameEn || "").toLowerCase();
      if (!pred(n)) continue;
      const d = await queryPid(t, h.id);
      const v = d?.variants?.find((x) => Number(x.variantSellPrice) > 0) || d?.variants?.[0];
      const cost = Number(v?.variantSellPrice || 0);
      const imgs = supplierImages(d, v);
      if (cost < 0.5 || cost > 40 || imgs.length < 4) continue;
      console.log(d.productNameEn?.slice(0, 72));
      console.log(" pid", h.id, "cost", cost, "imgs", imgs.length);
      return h.id;
    }
    await sleep(900);
  }
  console.log("NONE");
  return null;
}

await hunt(
  "blender",
  "portable usb juicer blender cup",
  (n) => (n.includes("juicer") || n.includes("blender")) && n.includes("portable") && !n.includes("makeup") && !n.includes("garlic"),
);
await hunt(
  "mason",
  "mason jar storage lid pour",
  (n) => n.includes("mason") && n.includes("lid") && !n.includes("metal ring") && !n.includes("split-type"),
);
await hunt(
  "spoon",
  "silicone spoon rest",
  (n) => n.includes("spoon rest") && !n.includes("tier"),
);
await hunt(
  "rack",
  "roll up dish rack sink",
  (n) => n.includes("roll") && n.includes("dish") && n.includes("sink"),
);
await hunt(
  "jump",
  "jump rope speed fitness",
  (n) => n.includes("jump rope") && !n.includes("bluetooth") && !n.includes("smart"),
);
