import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.production.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      const k = l.slice(0, i);
      const v = l.slice(i + 1).replace(/^"|"$/g, "");
      return [k, v];
    }),
);

const API = "https://developers.cjdropshipping.com/api2.0/v1";

async function token() {
  const res = await fetch(`${API}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: env.CJ_API_KEY }),
  });
  const json = await res.json();
  if (!json.result) throw new Error(json.message || "auth failed");
  return json.data.accessToken;
}

async function cjGet(path, accessToken) {
  const res = await fetch(`${API}${path}`, {
    headers: { "CJ-Access-Token": accessToken },
  });
  return res.json();
}

const launch = [
  { slug: "orthopedic-dog-bed", keyWord: "orthopedic memory foam dog bed" },
  { slug: "no-pull-dog-harness", keyWord: "no pull dog harness reflective" },
  { slug: "pet-water-fountain", keyWord: "pet water fountain filter automatic" },
  { slug: "closet-organizer-6-shelf", keyWord: "closet hanging organizer 6 shelf" },
  { slug: "led-motion-night-light", keyWord: "LED motion sensor night light plug" },
  { slug: "percussion-massage-gun", keyWord: "mini massage gun percussion" },
  { slug: "foam-roller-recovery", keyWord: "high density foam roller 18" },
  { slug: "ergonomic-laptop-stand", keyWord: "aluminum laptop stand adjustable" },
  { slug: "usb-c-hub-7in1", keyWord: "USB C hub 7 in 1 HDMI" },
  { slug: "ergonomic-wrist-rest", keyWord: "keyboard wrist rest memory foam" },
];

const accessToken = await token();

for (const item of launch) {
  const params = new URLSearchParams({
    page: "1",
    size: "5",
    keyWord: item.keyWord,
    countryCode: "US",
    orderBy: "1",
    sort: "desc",
  });
  const list = await cjGet(`/product/listV2?${params}`, accessToken);
  const products =
    list.data?.content?.flatMap((c) => c.productList ?? []) ?? [];

  console.log(`\n=== ${item.slug} ===`);
  if (!products.length) {
    console.log("  (no US results)");
    continue;
  }

  const top = products[0];
  const detail = await cjGet(
    `/product/query?productSku=${encodeURIComponent(top.sku)}&countryCode=US`,
    accessToken,
  );
  const variants = detail.data?.variants ?? [];
  const usVariant =
    variants.find((v) => v.variantSellPrice && Number(v.variantSellPrice) > 0) ??
    variants[0];

  console.log(`  name: ${top.nameEn?.slice(0, 70)}`);
  console.log(`  sku: ${top.sku}`);
  console.log(`  pid: ${top.id ?? detail.data?.pid}`);
  console.log(`  sellPrice: ${top.sellPrice ?? top.nowPrice}`);
  console.log(`  listedNum: ${top.listedNum}`);
  if (usVariant) {
    console.log(`  cjVid: ${usVariant.vid}`);
    console.log(`  cjSku: ${usVariant.variantSku}`);
    console.log(`  variant: ${usVariant.variantKey ?? usVariant.variantNameEn}`);
    console.log(`  variantPrice: ${usVariant.variantSellPrice}`);
    console.log(`  image: ${usVariant.variantImage ?? top.bigImage}`);
  } else {
    console.log("  (no variant with US stock)");
  }
}
