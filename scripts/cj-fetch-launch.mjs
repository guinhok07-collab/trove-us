import { writeFileSync } from "fs";

const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
if (!key) throw new Error("CJ_API_KEY missing");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const curated = [
  {
    slug: "orthopedic-dog-bed",
    pid: "1932639907792334849",
    pick: (v) => /-L$|-XL$|Large/i.test(v.variantKey || v.variantNameEn || ""),
    sell: 64.99,
  },
  {
    slug: "pet-water-fountain",
    pid: "1651788214971146240",
    sell: 34.99,
  },
  {
    slug: "percussion-massage-gun",
    pid: "1463778127867154432",
    sell: 59.99,
  },
  {
    slug: "led-motion-night-light",
    pid: "10A2E8CF-227C-49D0-AF4E-FAE2945E2D3D",
    sell: 19.99,
  },
];

const searches = [
  {
    slug: "no-pull-dog-harness",
    q: "dog harness no pull reflective",
    must: ["harness"],
    ban: ["leash", "seat belt", "car seat", "collar only"],
    sell: 27.99,
  },
  {
    slug: "closet-organizer-6-shelf",
    q: "6 layers hanging closet organizer shelf",
    must: ["closet", "organizer"],
    ban: ["car", "vehicle", "cosmetic bag", "travel bag"],
    sell: 32.99,
  },
  {
    slug: "foam-roller-recovery",
    q: "EVA foam roller yoga 45",
    must: ["foam roller"],
    ban: ["electric", "massage gun", "neck massager", "six-wheel"],
    sell: 29.99,
  },
  {
    slug: "ergonomic-laptop-stand",
    q: "portable folding laptop stand",
    must: ["laptop stand"],
    ban: ["ring", "jewelry", "watch", "keyboard leather"],
    sell: 39.99,
  },
  {
    slug: "usb-c-hub-7in1",
    q: "7 in 1 usb c hub hdmi sd",
    must: ["hub"],
    ban: ["magnetic cable", "charger cable", "charging cable"],
    sell: 44.99,
  },
  {
    slug: "ergonomic-wrist-rest",
    q: "keyboard wrist rest gel pad",
    must: ["wrist rest", "wrist pad"],
    ban: ["watch", "mouse pad"],
    sell: 24.99,
  },
];

function okName(name, must, ban) {
  const n = (name || "").toLowerCase();
  if (ban.some((b) => n.includes(b))) return false;
  return must.some((m) => n.includes(m.toLowerCase()));
}

async function getToken() {
  const auth = await fetch(`${API}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: key }),
  }).then((r) => r.json());
  if (!auth.result) throw new Error(auth.message || "auth failed");
  return auth.data.accessToken;
}

async function queryPid(token, pid, pick) {
  await sleep(1300);
  const res = await fetch(`${API}/product/query?pid=${encodeURIComponent(pid)}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());
  if (!res.result) return null;
  const d = res.data;
  const variants = d.variants || [];
  let variant = variants[0];
  if (pick && variants.length) {
    variant = variants.find(pick) || variant;
  }
  return {
    name: d.productNameEn,
    sku: d.productSku,
    pid: d.pid,
    cjVid: variant?.vid,
    cjSku: variant?.variantSku,
    variantPrice: Number(variant?.variantSellPrice ?? d.sellPrice ?? 0),
    image: variant?.variantImage || d.bigImage,
    images: (d.productImageSet || [d.bigImage]).slice(0, 5),
    listedNum: d.listedNum,
    variantLabel: variant?.variantKey || variant?.variantNameEn,
  };
}

async function searchOne(token, item) {
  await sleep(1300);
  const params = new URLSearchParams({
    page: "1",
    size: "40",
    keyWord: item.q,
    countryCode: "US",
    orderBy: "1",
    sort: "desc",
  });
  const list = await fetch(`${API}/product/listV2?${params}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());
  const products = (list.data?.content || []).flatMap((g) => g.productList || []);
  const hit = products.find((p) => okName(p.nameEn, item.must, item.ban));
  if (!hit) return null;
  return queryPid(token, hit.id);
}

const token = await getToken();
const results = [];

for (const item of curated) {
  const product = await queryPid(token, item.pid, item.pick);
  results.push({ slug: item.slug, sell: item.sell, ...product });
  console.log(item.slug, product?.cjVid, product?.variantPrice, product?.name?.slice(0, 50));
}

for (const item of searches) {
  const product = await searchOne(token, item);
  results.push({ slug: item.slug, sell: item.sell, ...product });
  console.log(item.slug, product?.cjVid, product?.variantPrice, product?.name?.slice(0, 50) || "NOT FOUND");
}

writeFileSync("scripts/cj-launch-results.json", JSON.stringify(results, null, 2));
