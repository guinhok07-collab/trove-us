/**

 * Sync Trove catalog with verified CJ products (real vid + photos + pricing).

 * Volume pricing: ~20% margin after CJ cost, US ship est., PayPal 3.4%.

 *

 * Usage: CJ_API_KEY=... node scripts/cj-sync-catalog.mjs

 */

import { writeFileSync } from "fs";

import { resolve, dirname } from "path";

import { fileURLToPath } from "url";

import { naturalSocialProof } from "./social-proof.mjs";



const __dirname = dirname(fileURLToPath(import.meta.url));

const API = "https://developers.cjdropshipping.com/api2.0/v1";

const key = process.env.CJ_API_KEY;

if (!key) throw new Error("Set CJ_API_KEY");



const TARGET_MARGIN = 0.2;

const PAYPAL_RATE = 0.034;



/** Verified CJ pid list — no keyword guessing */

const catalog = [

  { slug: "orthopedic-dog-bed", pid: "1932639907792334849", pick: /Brown-L|Large|-L$/i, ship: 6 },

  { slug: "no-pull-dog-harness", pid: "1846398052585066496", ship: 4 },

  { slug: "pet-water-fountain", pid: "1651788214971146240", ship: 5 },

  { slug: "pet-grooming-brush-set", pid: "1377182883625701376", ship: 3.5 },

  { slug: "portable-pet-carrier", pid: "1392428662283964416", ship: 5 },

  { slug: "led-motion-night-light", pid: "10A2E8CF-227C-49D0-AF4E-FAE2945E2D3D", ship: 3.5 },

  { slug: "vacuum-storage-bags", pid: "1895322443570647042", ship: 4 },

  { slug: "cordless-cabinet-light", pid: "842B5DB4-E59C-42FC-BEAB-01893C169776", ship: 3.5 },

  { slug: "percussion-massage-gun", pid: "1463778127867154432", ship: 4.5 },

  { slug: "posture-corrector-brace", pid: "1357500854936145920", ship: 3.5 },

  { slug: "essential-oil-diffuser", pid: "1737779611431346176", ship: 4.5 },

  { slug: "yoga-resistance-bands", pid: "F1B26962-F15C-41B6-A6BB-438B9FB64108", ship: 3.5 },

  { slug: "ergonomic-laptop-stand", pid: "DCB495CC-80F8-4ED9-B5BD-26E39B751776", ship: 4.5 },

  { slug: "usb-c-hub-7in1", pid: "075CA168-D0CB-47FB-93B6-2C6A6DAA4984", ship: 3.5 },

  { slug: "wireless-earbuds-pro", pid: "1544596715590922240", ship: 3.5 },

  { slug: "magsafe-car-mount", pid: "1676766755672305664", ship: 3.5 },

  { slug: "cable-management-box", pid: "1763402968205897728", ship: 4.5 },

];



const sleep = (ms) => new Promise((r) => setTimeout(r, ms));



function retailPrice(cost, shipping) {

  const base = cost + shipping;

  const raw = base / (1 - TARGET_MARGIN - PAYPAL_RATE);

  const rounded = Math.ceil(raw) - 0.01;

  return Math.max(rounded, base + 1.5);

}



function compareAt(sell) {

  return Math.ceil(sell * 1.1) - 0.01;

}



async function getToken() {

  const auth = await fetch(`${API}/authentication/getAccessToken`, {

    method: "POST",

    headers: { "Content-Type": "application/json" },

    body: JSON.stringify({ apiKey: key }),

  }).then((r) => r.json());

  if (!auth.result) throw new Error(auth.message);

  return auth.data.accessToken;

}



async function queryPid(token, pid) {

  await sleep(1300);

  const res = await fetch(`${API}/product/query?pid=${encodeURIComponent(pid)}`, {

    headers: { "CJ-Access-Token": token },

  }).then((r) => r.json());

  if (!res.result) return null;

  return res.data;

}



function pickVariant(data, pick) {

  const variants = data.variants || [];

  if (!variants.length) return null;

  if (pick) {

    return variants.find((v) => pick.test(v.variantKey || v.variantNameEn || "")) || variants[0];

  }

  return variants[0];

}



function mapCj(slug, data, variant, ship) {

  const cost = Number(variant?.variantSellPrice ?? data.sellPrice ?? 0);

  const price = retailPrice(cost, ship);

  const images = (data.productImageSet?.length ? data.productImageSet : [data.bigImage]).slice(0, 6);

  const image = variant?.variantImage || images[0] || data.bigImage;

  if (image && !images.includes(image)) images.unshift(image);



  const listed = Number(data.listedNum || 0);

  const social = naturalSocialProof(slug, listed);



  return {

    name: data.productNameEn,

    supplierSku: data.productSku,

    cjVid: variant?.vid,

    cjSku: variant?.variantSku,

    image,

    images,

    cost,

    shippingEst: ship,

    price,

    compareAtPrice: compareAt(price),

    listedNum: listed,

    rating: social.rating,

    reviews: social.reviews,

    sold: social.sold,

    variantLabel: variant?.variantKey || variant?.variantNameEn,

  };

}



const token = await getToken();

const slugBlocks = {};



for (const item of catalog) {

  const data = await queryPid(token, item.pid);

  if (!data) {

    console.log("FAIL", item.slug);

    slugBlocks[item.slug] = null;

    continue;

  }



  const variant = pickVariant(data, item.pick);

  if (!variant?.vid) {

    console.log("NO VID", item.slug);

    slugBlocks[item.slug] = null;

    continue;

  }



  const mapped = mapCj(item.slug, data, variant, item.ship);

  slugBlocks[item.slug] = mapped;

  const margin = (

    ((mapped.price - mapped.cost - item.ship - mapped.price * PAYPAL_RATE) / mapped.price) *

    100

  ).toFixed(0);

  console.log(

    item.slug,

    `$${mapped.cost}+$${item.ship} → $${mapped.price.toFixed(2)} (${margin}% margin)`,

  );

}



writeFileSync(

  resolve(__dirname, "cj-catalog-sync.json"),

  JSON.stringify(slugBlocks, null, 2),

);


