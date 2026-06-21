const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const probes = [
  "cat window perch suction",
  "dog food container airtight",
  "silicone ice cube tray lid",
  "door draft stopper seal",
  "over door hook rack",
  "bedding sheet organizer storage",
  "meditation cushion floor pillow",
  "jade roller gua sha face",
  "hand grip strengthener adjustable",
  "massage roller stick muscle",
  "face ice roller skin",
  "webcam privacy cover laptop",
  "monitor screen light bar usb",
  "spice rack kitchen cabinet",
  "silicone reusable food bag",
];

const auth = await fetch(`${API}/authentication/getAccessToken`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ apiKey: key }),
}).then((r) => r.json());
const token = auth.data.accessToken;

for (const q of probes) {
  await sleep(1200);
  const p = new URLSearchParams({ page: "1", size: "6", keyWord: q, countryCode: "US", orderBy: "1", sort: "desc" });
  const list = await fetch(`${API}/product/listV2?${p}`, { headers: { "CJ-Access-Token": token } }).then((r) => r.json());
  const prods = (list.data?.content || []).flatMap((g) => g.productList || []);
  console.log(`\n=== ${q} ===`);
  for (const x of prods.slice(0, 4)) {
    console.log(`- ${x.nameEn?.slice(0, 72)}`);
    console.log(`  ${x.id} | listed ${x.listedNum}`);
  }
}
