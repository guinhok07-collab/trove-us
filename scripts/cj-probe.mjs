const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const auth = await fetch(`${API}/authentication/getAccessToken`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ apiKey: key }),
}).then((r) => r.json());
const token = auth.data.accessToken;
const terms = [
  "solid foam roller epp 45cm",
  "memory foam keyboard wrist rest",
  "expandable drawer organizer tray",
];
for (const q of terms) {
  await sleep(1400);
  const p = new URLSearchParams({
    page: "1",
    size: "8",
    keyWord: q,
    countryCode: "US",
    orderBy: "1",
    sort: "desc",
  });
  const list = await fetch(`${API}/product/listV2?${p}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());
  const prods = (list.data?.content || []).flatMap((g) => g.productList || []);
  console.log(`\n=== ${q} (${prods.length}) ===`);
  for (const x of prods.slice(0, 4)) {
    console.log("-", x.nameEn?.slice(0, 70));
    console.log(" ", x.id, "listed:", x.listedNum);
  }
}
