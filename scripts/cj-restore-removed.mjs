/**
 * Re-fetch CJ matches for 11 removed products + merge into products.ts
 * Usage: node --env-file=.env.local scripts/cj-restore-removed.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { naturalSocialProof } from "./social-proof.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
if (!key) throw new Error("Set CJ_API_KEY (node --env-file=.env.local)");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TARGET_MARGIN = 0.2;
const PAYPAL_RATE = 0.034;

const REMOVED = [
  { slug: "cat-window-perch", store: "pet", q: "cat window perch suction seat bed", must: ["window", "cat"], ban: ["christmas", "tree", "dog"], ship: 5 },
  { slug: "ice-cube-tray-silicone", store: "home", q: "silicone ice cube tray with lid freezer", must: ["ice cube", "tray"], ban: ["face roller", "face mould", "beauty"], ship: 3.5 },
  { slug: "door-draft-stopper", store: "home", q: "door draft stopper under door seal blocker", must: ["draft", "door"], ban: ["cup holder", "car"], ship: 4 },
  { slug: "bed-sheet-organizer", store: "home", q: "bed sheet organizer storage closet bedding", must: ["sheet", "bedding"], ban: ["phone", "screen cleaner"], ship: 4 },
  { slug: "silicone-food-storage-bags", store: "home", q: "reusable silicone food storage bags ziplock", must: ["food", "bag"], ban: ["grip", "hand exerciser", "finger", "dog water"], ship: 4 },
  { slug: "meditation-cushion", store: "wellness", q: "meditation cushion zafu floor pillow buckwheat", must: ["meditation", "cushion"], ban: ["pendant", "necklace", "crystal"], ship: 5 },
  { slug: "jade-roller-gua-sha", store: "wellness", q: "jade roller gua sha facial tool set", must: ["jade", "roller"], ban: ["hair remover", "lint"], ship: 3.5 },
  { slug: "muscle-roller-stick", store: "wellness", q: "muscle roller stick massage legs", must: ["roller stick"], ban: ["lint roller", "pet hair", "foam roller 45"], ship: 4 },
  { slug: "webcam-cover-slide", store: "tech", q: "webcam cover slide laptop camera privacy", must: ["webcam", "camera cover"], ban: ["airtag", "collar", "dog"], ship: 3.5 },
  { slug: "monitor-light-bar", store: "tech", q: "monitor light bar screen lamp computer", must: ["monitor", "light bar"], ban: ["lantern", "camping", "reading book"], ship: 4.5 },
  { slug: "tablet-stand-adjustable", store: "tech", q: "tablet stand adjustable desk holder", must: ["tablet", "stand"], ban: ["phone ring only", "car mount only"], ship: 3.5 },
];

const DISPLAY = {
  "cat-window-perch": {
    name: "Cat Window Perch (Suction Mount)",
    description: "Sunny window seat so cats can watch birds all day.",
    longDescription:
      "Give indoor cats a front-row view with a sturdy suction-mounted perch that installs in minutes. Reinforced cups and a padded platform support daily lounging without tools or permanent mounts. Fleece cover removes for washing. Ships from our US warehouse in 3–5 business days.",
    features: ["Strong suction cups", "Removable fleece cover", "No tools required", "Supports up to 40 lbs"],
    tags: ["bestseller"],
  },
  "ice-cube-tray-silicone": {
    name: "Silicone Ice Cube Tray with Lid",
    description: "Flexible silicone tray releases cubes easily and stacks in the freezer.",
    longDescription:
      "Make perfect ice cubes without the crack-and-fight routine. Soft silicone flexes to pop cubes out cleanly, while the lid helps block freezer odors. Dishwasher-safe and reusable season after season. Ships from our US warehouse in 3–5 business days.",
    features: ["Flexible silicone release", "Stackable lid", "Dishwasher safe", "BPA-free material"],
    tags: ["bestseller"],
  },
  "door-draft-stopper": {
    name: "Under-Door Draft Stopper",
    description: "Blocks cold air and dust from slipping under doors.",
    longDescription:
      "Cut drafts and noise with a weighted stopper that slides under interior doors in seconds. Helps rooms stay warmer in winter and keeps dust from creeping under the gap. Machine-washable cover for easy upkeep. Ships from our US warehouse in 3–5 business days.",
    features: ["Blocks drafts and dust", "Weighted stay-put design", "Fits standard doors", "Washable cover"],
    tags: [],
  },
  "bed-sheet-organizer": {
    name: "Bed Sheet & Bedding Organizer",
    description: "Keeps folded sheets and pillowcases sorted in closets.",
    longDescription:
      "Stop digging through messy linen shelves. Labeled pockets or bins keep sheet sets together so making the bed takes less time. Breathable fabric helps prevent musty closet smells. Ships from our US warehouse in 3–5 business days.",
    features: ["Keeps sets together", "Closet-friendly size", "Breathable storage", "Easy label slots"],
    tags: [],
  },
  "silicone-food-storage-bags": {
    name: "Reusable Silicone Food Storage Bags",
    description: "Leak-resistant bags replace disposable zip bags for snacks and meal prep.",
    longDescription:
      "Pack lunches and leftovers in reusable silicone bags that seal tight and rinse clean. Safe for fridge and freezer use without the single-use plastic waste. Great for sandwiches, chopped fruit, and meal-prep portions. Ships from our US warehouse in 3–5 business days.",
    features: ["Leak-resistant seal", "Freezer and fridge safe", "Reusable silicone", "Easy to rinse clean"],
    tags: ["bestseller", "free-shipping"],
  },
  "meditation-cushion": {
    name: "Meditation Floor Cushion",
    description: "Elevated seat for comfortable meditation and floor sitting.",
    longDescription:
      "Sit taller and longer during meditation with a firm cushion that supports hips and posture. Removable cover washes easily after daily practice. Carry handle makes it easy to move between rooms. Ships from our US warehouse in 3–5 business days.",
    features: ["Firm posture support", "Removable washable cover", "Built-in carry handle", "Multiple colors"],
    tags: [],
  },
  "jade-roller-gua-sha": {
    name: "Jade Roller & Gua Sha Set",
    description: "Cooling facial tools for morning de-puff and self-care routines.",
    longDescription:
      "Refresh your skincare routine with a jade roller and gua sha tool designed for gentle facial massage. Store in the fridge for an extra cooling effect after serums and moisturizers. Smooth edges glide without tugging delicate skin. Ships from our US warehouse in 3–5 business days.",
    features: ["Natural jade stone", "Includes gua sha tool", "Fridge-friendly cooling", "Gift-ready set"],
    tags: ["bestseller"],
  },
  "muscle-roller-stick": {
    name: "Muscle Roller Stick",
    description: "Handheld stick targets sore legs, arms, and back after workouts.",
    longDescription:
      "Roll out tight muscles without lying on the floor. Independent handles let you control pressure on calves, quads, and shoulders after gym sessions or long shifts on your feet. Compact enough for gym bags and travel. Ships from our US warehouse in 3–5 business days.",
    features: ["Targeted muscle relief", "Independent grip handles", "Portable size", "Durable roller surface"],
    tags: [],
  },
  "webcam-cover-slide": {
    name: "Webcam Privacy Cover (Slide)",
    description: "Slide-open cover protects laptop cameras when not in use.",
    longDescription:
      "Cover your webcam in one swipe when meetings end. Ultra-thin adhesive mount fits most laptops and tablets without blocking the lid from closing. Durable slide mechanism opens and closes smoothly every day. Ships from our US warehouse in 3–5 business days.",
    features: ["One-swipe privacy", "Ultra-thin profile", "Strong adhesive mount", "Multi-pack value"],
    tags: ["bestseller"],
  },
  "monitor-light-bar": {
    name: "Monitor Light Bar",
    description: "Screen-mounted lamp lights your desk without glare on the monitor.",
    longDescription:
      "Reduce eye strain during late-night work with a light bar that sits on top of your monitor. Asymmetric optics illuminate the desk while keeping the screen free of harsh reflections. USB-powered with adjustable brightness for home offices. Ships from our US warehouse in 3–5 business days.",
    features: ["Monitor-top mount", "Glare-free asymmetric light", "USB powered", "Adjustable brightness"],
    tags: ["new"],
  },
  "tablet-stand-adjustable": {
    name: "Adjustable Tablet Stand",
    description: "Hands-free viewing for recipes, video calls, and streaming.",
    longDescription:
      "Prop tablets at the perfect angle on desks, kitchen counters, and nightstands. Adjustable hinge holds position for typing, drawing, or watching shows. Non-slip base keeps the stand steady on smooth surfaces. Ships from our US warehouse in 3–5 business days.",
    features: ["Adjustable viewing angle", "Non-slip base", "Fits most tablet sizes", "Foldable portable design"],
    tags: [],
  },
};

function okName(name, must, ban) {
  const n = (name || "").toLowerCase();
  if (ban.some((b) => n.includes(b))) return false;
  return must.every((m) => n.includes(m.toLowerCase()));
}

function retailPrice(cost, shipping) {
  const base = cost + shipping;
  return Math.max(Math.ceil(base / (1 - TARGET_MARGIN - PAYPAL_RATE)) - 0.01, base + 1.5);
}

function truncateCjName(name) {
  const clean = (name || "").trim();
  return clean.length <= 72 ? clean : clean.slice(0, 69) + "…";
}

async function getToken() {
  const auth = await fetch(`${API}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: key }),
  }).then((r) => r.json());
  if (!auth?.data?.accessToken) throw new Error(JSON.stringify(auth));
  return auth.data.accessToken;
}

async function queryPid(token, pid) {
  await sleep(1100);
  const res = await fetch(`${API}/product/query?pid=${encodeURIComponent(pid)}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());
  return res.result ? res.data : null;
}

async function search(token, item) {
  await sleep(1100);
  const p = new URLSearchParams({
    page: "1",
    size: "40",
    keyWord: item.q,
    countryCode: "US",
    orderBy: "1",
    sort: "desc",
  });
  const list = await fetch(`${API}/product/listV2?${p}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());
  const products = (list.data?.content || [])
    .flatMap((g) => g.productList || [])
    .sort((a, b) => (b.listedNum || 0) - (a.listedNum || 0));
  for (const hit of products) {
    if (!okName(hit.nameEn, item.must, item.ban)) continue;
    const data = await queryPid(token, hit.id);
    const v =
      data?.variants?.find((x) => Number(x.variantSellPrice) > 0) || data?.variants?.[0];
    if (!v?.vid) continue;
    const cost = Number(v.variantSellPrice ?? data.sellPrice ?? 0);
    if (cost < 0.4 || cost > 55) continue;
    const listed = Number(data.listedNum || 0);
    const images = (data.productImageSet?.length ? data.productImageSet : [data.bigImage]).slice(0, 8);
    const image = v.variantImage || images[0];
    if (image && !images.includes(image)) images.unshift(image);
    const price = retailPrice(cost, item.ship);
    const copy = DISPLAY[item.slug];
    return {
      slug: item.slug,
      store: item.store,
      pid: data.pid,
      cjName: data.productNameEn,
      name: copy.name,
      description: copy.description,
      longDescription: copy.longDescription,
      features: copy.features,
      tags: copy.tags,
      supplierSku: data.productSku,
      cjVid: v.vid,
      cjSku: v.variantSku,
      image,
      images,
      cost,
      shippingEst: item.ship,
      price,
      compareAtPrice: Math.ceil(price * 1.1) - 0.01,
      listedNum: listed,
      ...naturalSocialProof(item.slug, listed),
    };
  }
  return null;
}

function formatImages(images) {
  return JSON.stringify(images, null, 4)
    .split("\n")
    .map((line, idx) => (idx === 0 ? line : "      " + line.trim()))
    .join("\n");
}

function assignId(source, store) {
  const prefix = store === "wellness" ? "well" : store === "tech" ? "tech" : store;
  const nums = [...source.matchAll(new RegExp(`id: "${prefix}-(\\d+)"`, "g"))].map((m) => Number(m[1]));
  const max = nums.length ? Math.max(...nums) : 0;
  return `${prefix}-${max + 1}`;
}

function buildBlock(entry, id) {
  return `  {
    id: "${id}",
    slug: "${entry.slug}",
    name: ${JSON.stringify(entry.name)},
    description: ${JSON.stringify(entry.description)},
    longDescription:
      ${JSON.stringify(entry.longDescription)},
    price: ${entry.price.toFixed(2)},
    compareAtPrice: ${entry.compareAtPrice.toFixed(2)},
    store: "${entry.store}",
    image: ${JSON.stringify(entry.image)},
    images: ${formatImages(entry.images)},
    rating: ${entry.rating},
    reviews: ${entry.reviews},
    sold: ${entry.sold},
    inStock: true,
    shippingDays: "3–5 days",
    warehouse: "US",
    tags: ${JSON.stringify(entry.tags || [])},
    features: ${JSON.stringify(entry.features || [])},
    supplierSku: ${JSON.stringify(entry.supplierSku)},
    cjVid: ${JSON.stringify(entry.cjVid)},
    cjSku: ${JSON.stringify(entry.cjSku)}
  }`;
}

const token = await getToken();
const results = {};
const failed = [];

for (const item of REMOVED) {
  const mapped = await search(token, item);
  if (mapped) {
    results[item.slug] = mapped;
    console.log("OK", item.slug, "→", truncateCjName(mapped.cjName));
  } else {
    failed.push(item.slug);
    console.log("FAIL", item.slug);
  }
}

writeFileSync(resolve(__dirname, "cj-restore-results.json"), JSON.stringify(results, null, 2));

const productsPath = resolve(__dirname, "../src/data/products.ts");
let source = readFileSync(productsPath, "utf8");
const existing = new Set([...source.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]));

const toAdd = Object.values(results).filter((e) => !existing.has(e.slug));
if (!toAdd.length) {
  console.log("No new products to add.");
  process.exit(failed.length ? 1 : 0);
}

const blocks = [];
let idSource = source;
for (const entry of toAdd) {
  const id = assignId(idSource, entry.store);
  idSource += `\nid: "${id}"`;
  blocks.push(buildBlock(entry, id));
}

source = source.replace(/\n\];\n\nexport function getProductBySlug/, `,\n${blocks.join(",\n")}\n];\n\nexport function getProductBySlug`);
writeFileSync(productsPath, source);

const count = [...source.matchAll(/slug: "/g)].length;
console.log(`\nRestored ${toAdd.length} products. Catalog now: ${count}. Failed: ${failed.join(", ") || "none"}`);

// QA report
const site = process.env.NEXT_PUBLIC_SITE_URL || "https://trove-us.com";
const lines = [
  "# Trove — QA dos 11 produtos restaurados",
  "",
  `Gerado: ${new Date().toISOString().slice(0, 10)}`,
  "",
  "## Links diretos (confira um por um)",
  "",
  "| # | Produto | Link | Preço | CJ match |",
  "|---|---------|------|-------|----------|",
];

let n = 1;
for (const entry of toAdd) {
  lines.push(
    `| ${n++} | ${entry.name} | [Abrir](${site}/products/${entry.slug}) | $${entry.price.toFixed(2)} | ${truncateCjName(entry.cjName).replace(/\|/g, "/")} |`,
  );
}

lines.push(
  "",
  "## O que NÃO pode ter erro (checklist)",
  "",
  "### 1. Foto vs produto",
  "- A foto principal tem que ser **exatamente** o item vendido",
  "- ❌ Christmas tree, car cup holder, dog water bottle, phone cleaner, etc.",
  "- ❌ Foto genérica que não bate com o título",
  "",
  "### 2. Título e descrição",
  "- Nome em **inglês claro** (cliente americano)",
  "- ❌ Nome copiado da CJ com 80 palavras",
  "- ❌ Prometer \"Amazon\", \"warehouse tour\", \"dropshipping\"",
  "",
  "### 3. Preço",
  "- Preço faz sentido vs Amazon (não precisa ser o mais barato)",
  "- ❌ $200+ em item simples sem motivo",
  "- Frete: pedidos **≥ $35** = frete grátis na loja",
  "",
  "### 4. Página do produto",
  "- Galeria com **3+ fotos** reais",
  "- Features listadas batem com o produto",
  "- Botão **Add to cart** funciona",
  "",
  "### 5. Checkout / CJ",
  "- Produto tem `cjVid` (fulfillment automático)",
  "- ❌ \"Missing CJ configuration\" no checkout",
  "",
  "### 6. Copy proibida (já removida do site — não reintroduzir)",
  "- \"dropshipping\", \"US warehouse tour\", \"test product\", \"MVP\"",
  "",
  "## Lista rápida de URLs",
  "",
);

for (const entry of toAdd) {
  lines.push(`- ${entry.name}: ${site}/products/${entry.slug}`);
}

if (failed.length) {
  lines.push("", "## Falhou busca CJ (não restaurado)", "");
  for (const s of failed) lines.push(`- ${s}`);
}

writeFileSync(resolve(__dirname, "../reports/cj-restore-qa.md"), lines.join("\n"));
console.log("QA report: reports/cj-restore-qa.md");
