/** Deep CJ search — multi-query, multi-page, word scoring */
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const items = [
  { slug: "cat-window-perch", queries: ["cat window perch suction", "cat hammock window seat", "suction cup cat bed window"] },
  { slug: "ice-cube-tray-silicone", queries: ["silicone ice cube tray lid", "ice tray silicone freezer", "ice cube mould silicone"] },
  { slug: "door-draft-stopper", queries: ["door draft stopper under door", "door bottom seal draft blocker", "draft excluder door"] },
  { slug: "bed-sheet-organizer", queries: ["bed sheet organizer storage", "bedding organizer foldable", "linen closet sheet storage"] },
  { slug: "silicone-food-storage-bags", queries: ["silicone reusable food bag", "silicone ziplock food storage", "reusable silicone snack bag"] },
  { slug: "meditation-cushion", queries: ["meditation cushion floor pillow", "zafu meditation pillow", "yoga meditation seat cushion"] },
  { slug: "jade-roller-gua-sha", queries: ["jade roller gua sha set", "facial jade roller gua sha", "natural jade face roller"] },
  { slug: "muscle-roller-stick", queries: ["muscle roller stick massage", "massage stick roller legs", "body roller stick recovery"] },
  { slug: "webcam-cover-slide", queries: ["webcam cover slide laptop", "camera privacy cover slider", "laptop webcam privacy cover"] },
  { slug: "monitor-light-bar", queries: ["monitor light bar screen", "computer screen light bar usb", "monitor hanging lamp desk"] },
];

function score(name, query) {
  const n = (name || "").toLowerCase();
  return query.toLowerCase().split(/\s+/).filter((w) => w.length > 2 && n.includes(w)).length;
}

async function getToken() {
  const auth = await fetch(`${API}/authentication/getAccessToken`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: key }),
  }).then((r) => r.json());
  return auth.data.accessToken;
}

const token = await getToken();

for (const item of items) {
  const seen = new Map();
  for (const q of item.queries) {
    for (const page of [1, 2, 3]) {
      await sleep(900);
      const p = new URLSearchParams({ page: String(page), size: "40", keyWord: q, orderBy: "1", sort: "desc" });
      const list = await fetch(`${API}/product/listV2?${p}`, { headers: { "CJ-Access-Token": token } }).then((r) => r.json());
      for (const hit of (list.data?.content || []).flatMap((g) => g.productList || [])) {
        const s = score(hit.nameEn, q);
        if (s < 2) continue;
        const prev = seen.get(hit.id);
        if (!prev || s > prev.s) seen.set(hit.id, { hit, s, q });
      }
    }
  }
  const ranked = [...seen.values()].sort((a, b) => b.s - a.s || (b.hit.listedNum || 0) - (a.hit.listedNum || 0)).slice(0, 5);
  console.log(`\n=== ${item.slug} (${ranked.length} candidates) ===`);
  for (const { hit, s, q } of ranked) {
    console.log(`[${s}] ${(hit.nameEn || "").slice(0, 85)}`);
    console.log(`    pid=${hit.id} listed=${hit.listedNum} q=${q}`);
  }
}
