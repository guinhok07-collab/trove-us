/**
 * Harvest high-volume CJ products (US, sorted by orders) into cj-bulk-catalog.json.
 * Usage: npx vercel env run --environment=production -- node scripts/cj-bulk-harvest.mjs
 */
import { writeFileSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { naturalSocialProof } from "./social-proof.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
if (!key) throw new Error("Set CJ_API_KEY");

const TARGET_MARGIN = 0.2;
const PAYPAL_RATE = 0.034;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const existingSlugs = new Set(
  [...readFileSync(resolve(__dirname, "../src/data/products.ts"), "utf8").matchAll(/slug: "([^"]+)"/g)].map(
    (m) => m[1],
  ),
);

/** Trending niches — CJ orderBy=1 (orders), US warehouse */
const targets = [
  // PET (14)
  { slug: "retractable-dog-leash", store: "pet", q: "retractable dog leash 16ft", must: ["leash"], ban: ["harness set", "collar only", "cat"], ship: 4, desc: "Extendable leash for safe walks with lock button.", features: ["16ft range", "One-button lock", "Comfort grip", "Reflective tape"] },
  { slug: "dog-chew-toy-durable", store: "pet", q: "dog chew toy durable rubber", must: ["dog", "toy"], ban: ["cat", "bird", "fish"], ship: 4, desc: "Tough chew toy keeps dogs busy and reduces boredom.", features: ["Natural rubber", "Tooth cleaning", "Non-toxic", "Heavy chewer safe"] },
  { slug: "cat-scratching-post", store: "pet", q: "cat scratching post sisal", must: ["scratch"], ban: ["dog harness", "leash"], ship: 5.5, desc: "Sisal scratching post saves furniture and trims claws.", features: ["Sisal wrapped", "Stable base", "Catnip ready", "Compact footprint"] },
  { slug: "pet-nail-clipper", store: "pet", q: "pet nail clipper grinder dog cat", must: ["nail"], ban: ["human", "fake nail"], ship: 3.5, desc: "Trim nails at home safely with guard and sharp blade.", features: ["Safety guard", "Sharp stainless", "Non-slip grip", "Cats & dogs"] },
  { slug: "dog-poop-bag-dispenser", store: "pet", q: "dog poop bag dispenser holder", must: ["poop bag", "waste bag"], ban: ["diaper", "baby"], ship: 3.5, desc: "Clip-on dispenser for walks — always have bags ready.", features: ["Carabiner clip", "Includes rolls", "Leak-proof", "One-hand pull"] },
  { slug: "cat-litter-mat", store: "pet", q: "cat litter mat trap litter", must: ["litter mat"], ban: ["dog bed", "harness"], ship: 4.5, desc: "Catches litter from paws before it spreads through the house.", features: ["Honeycomb layer", "Waterproof base", "Easy shake clean", "Large size"] },
  { slug: "dog-cooling-mat", store: "pet", q: "dog cooling mat pad summer", must: ["cooling"], ban: ["heating pad", "cat tree"], ship: 5, desc: "Self-cooling mat helps pets beat summer heat indoors.", features: ["No water needed", "Pressure activated", "Wipe clean", "Foldable"] },
  { slug: "interactive-cat-toy", store: "pet", q: "interactive cat toy automatic", must: ["cat toy"], ban: ["dog", "bird"], ship: 4, desc: "Automatic toy keeps indoor cats active and entertained.", features: ["Random movement", "USB/battery", "Feather attachments", "Quiet motor"] },
  { slug: "pet-food-storage-container", store: "pet", q: "pet food storage container airtight", must: ["food storage", "pet food"], ban: ["human cereal", "lunch box"], ship: 5.5, desc: "Airtight kibble bin keeps food fresh and pests out.", features: ["Airtight seal", "Scoop included", "BPA-free", "Stackable lid"] },
  { slug: "dog-seat-belt-harness", store: "pet", q: "dog seat belt harness car safety", must: ["seat belt", "car"], ban: ["baby car seat"], ship: 4, desc: "Secure your dog in the car for safer road trips.", features: ["Adjustable fit", "Quick release", "Universal clip", "Padded chest"] },
  { slug: "pet-deshedding-tool", store: "pet", q: "pet deshedding brush undercoat", must: ["deshed"], ban: ["vacuum", "lint roller only"], ship: 3.5, desc: "Removes loose undercoat and cuts shedding up to 90%.", features: ["Stainless edge", "Ejector button", "Ergonomic handle", "All coat types"] },
  { slug: "cat-window-perch", store: "pet", q: "cat window perch suction cup", must: ["window"], ban: ["dog", "bird cage"], ship: 5, desc: "Sunny window seat — cats love bird-watching all day.", features: ["Strong suction", "Fleece cover", "No tools", "Up to 40 lbs"] },
  { slug: "dog-treat-pouch", store: "pet", q: "dog training treat pouch belt", must: ["treat pouch"], ban: ["lunch bag", "cosmetic"], ship: 3.5, desc: "Hands-free treat bag for training sessions and walks.", features: ["Clip-on belt", "Magnetic closure", "Waste bag slot", "Washable"] },
  { slug: "pet-paw-cleaner-cup", store: "pet", q: "dog paw cleaner cup portable", must: ["paw clean"], ban: ["nail clip", "brush only"], ship: 4, desc: "Quick paw wash after muddy walks — no more dirty floors.", features: ["Soft silicone bristles", "One-hand use", "Portable", "Multiple sizes"] },

  // HOME (14)
  { slug: "shower-caddy-organizer", store: "home", q: "shower caddy adhesive no drill", must: ["shower", "caddy"], ban: ["kitchen only", "car"], ship: 4, desc: "Rust-proof shower storage — no drilling required.", features: ["Adhesive mount", "Rust resistant", "Drain holes", "2-tier design"] },
  { slug: "silicone-food-storage-bags", store: "home", q: "reusable silicone food storage bags", must: ["silicone", "food bag"], ban: ["vacuum sealer machine"], ship: 4, desc: "Reusable bags replace plastic — freezer and microwave safe.", features: ["Leak-proof seal", "Dishwasher safe", "Freezer safe", "Multi-size set"] },
  { slug: "adhesive-wall-hooks", store: "home", q: "adhesive wall hooks heavy duty", must: ["hook"], ban: ["curtain rod only", "car"], ship: 3.5, desc: "Strong sticky hooks for towels, keys, and kitchen tools.", features: ["No drill", "Removable tabs", "Stainless hook", "Multi-pack"] },
  { slug: "spice-rack-organizer", store: "home", q: "spice rack organizer cabinet door", must: ["spice"], ban: ["perfume", "makeup"], ship: 4.5, desc: "Organize spices and free up counter space instantly.", features: ["Tiered shelves", "Easy install", "Fits standard jars", "Pantry or wall"] },
  { slug: "door-draft-stopper", store: "home", q: "door draft stopper under door seal", must: ["draft"], ban: ["window film only"], ship: 4, desc: "Block cold air, dust, and noise under any door.", features: ["Adjustable length", "Machine washable cover", "Double-sided", "Easy install"] },
  { slug: "foldable-laundry-hamper", store: "home", q: "foldable laundry hamper basket", must: ["laundry"], ban: ["washing machine", "dryer"], ship: 5, desc: "Collapsible hamper for bedroom or bathroom laundry.", features: ["Foldable frame", "Breathable fabric", "Carry handles", "Lightweight"] },
  { slug: "ice-cube-tray-silicone", store: "home", q: "silicone ice cube tray with lid", must: ["ice cube"], ban: ["ice maker machine"], ship: 3.5, desc: "Flexible trays release cubes easily — stackable with lid.", features: ["Flexible silicone", "Spill-proof lid", "Stackable", "Dishwasher safe"] },
  { slug: "bed-sheet-organizer", store: "home", q: "bed sheet organizer storage foldable", must: ["sheet organizer", "bedding"], ban: ["pillow case only"], ship: 4, desc: "Keep sheet sets together — no more lost pillowcases.", features: ["Labeled pockets", "Foldable box", "Closet friendly", "Set of 3"] },
  { slug: "over-door-hook-rack", store: "home", q: "over door hook rack hanger", must: ["over door", "hook"], ban: ["mirror", "organizer shelf only"], ship: 4, desc: "Instant extra hanging space behind any door.", features: ["No install", "Soft pads", "Multiple hooks", "Fits standard doors"] },
  { slug: "kitchen-sink-organizer", store: "home", q: "kitchen sink organizer sponge holder", must: ["sink organizer"], ban: ["bathroom only"], ship: 3.5, desc: "Neat sink caddy for sponges, soap, and scrubbers.", features: ["Drain slots", "Rust proof", "Suction or adhesive", "Compact"] },
  { slug: "cable-clips-adhesive", store: "home", q: "adhesive cable clips organizer", must: ["cable clip"], ban: ["phone case"], ship: 3.5, desc: "Route cables neatly along desk, wall, or nightstand.", features: ["Strong adhesive", "Multiple sizes", "Easy release", "20+ pack"] },
  { slug: "garbage-bag-holder", store: "home", q: "garbage bag holder kitchen cabinet", must: ["bag holder"], ban: ["trash can sensor"], ship: 4, desc: "Mount grocery bags as liners — recycle and save money.", features: ["Cabinet mount", "One-hand use", "Steel construction", "Adjustable"] },
  { slug: "mason-jar-storage-lids", store: "home", q: "mason jar storage lids organizer", must: ["mason jar"], ban: ["ring light"], ship: 3.5, desc: "Turn jars into pantry storage with pour and shaker lids.", features: ["Leak-proof lids", "Wide mouth fit", "BPA-free", "Multi-pack"] },
  { slug: "motion-sensor-trash-can", store: "home", q: "touchless motion sensor trash can", must: ["trash can", "sensor"], ban: ["bag only", "mini desktop"], ship: 6, desc: "Hands-free bin for kitchen or bathroom hygiene.", features: ["Motion sensor", "Soft-close lid", "Removable bucket", "Battery/USB"] },

  // WELLNESS (14)
  { slug: "neck-shoulder-massager", store: "wellness", q: "shiatsu neck shoulder massager pillow", must: ["massager", "neck"], ban: ["gun only", "foot spa"], ship: 5, desc: "Deep kneading relief for neck, shoulders, and upper back.", features: ["Shiatsu nodes", "Heat optional", "Home & office", "Adjustable strap"] },
  { slug: "heating-pad-electric", store: "wellness", q: "electric heating pad back pain", must: ["heating pad"], ban: ["ice pack only", "pet"], ship: 4.5, desc: "Soothing heat for back pain, cramps, and muscle tension.", features: ["6 heat levels", "Auto shut-off", "Soft cover", "Machine washable"] },
  { slug: "jade-roller-gua-sha", store: "wellness", q: "jade roller gua sha facial set", must: ["jade roller", "gua sha"], ban: ["makeup brush only"], ship: 3.5, desc: "Facial massage duo for puffiness and product absorption.", features: ["Natural stone", "Dual-sided roller", "Gua sha tool", "Gift box"] },
  { slug: "ice-roller-face", store: "wellness", q: "ice roller face eye puffiness", must: ["ice roller"], ban: ["paint roller"], ship: 3.5, desc: "Cooling roller depuffs eyes and calms skin in the morning.", features: ["Freezer safe", "Ergonomic grip", "Refillable gel", "Travel size"] },
  { slug: "hand-grip-strengthener", store: "wellness", q: "hand grip strengthener adjustable", must: ["hand grip", "grip strengthener"], ban: ["finger exercise silicone only"], ship: 3.5, desc: "Build forearm strength — rehab, climbing, and desk breaks.", features: ["Adjustable resistance", "Counter optional", "Quiet spring", "Pair set"] },
  { slug: "compression-socks-pair", store: "wellness", q: "compression socks 20 30 mmhg", must: ["compression sock"], ban: ["stockings fashion only"], ship: 3.5, desc: "Support circulation for travel, standing jobs, and running.", features: ["Graduated pressure", "Breathable knit", "Unisex sizing", "All-day comfort"] },
  { slug: "acupressure-mat-pillow", store: "wellness", q: "acupressure mat pillow set back", must: ["acupressure mat"], ban: ["yoga mat only"], ship: 5, desc: "Thousands of points release back tension in 10–20 minutes.", features: ["Spike mat + pillow", "Carry bag", "Eco foam", "Beginner guide"] },
  { slug: "weighted-sleep-mask", store: "wellness", q: "weighted sleep mask blackout", must: ["sleep mask"], ban: ["eye patch medical"], ship: 3.5, desc: "Gentle weight blocks light and eases tension for deep sleep.", features: ["Blackout design", "Adjustable strap", "Soft fabric", "Travel pouch"] },
  { slug: "yoga-mat-thick", store: "wellness", q: "thick yoga mat non slip exercise", must: ["yoga mat"], ban: ["yoga block only", "resistance band"], ship: 5.5, desc: "Cushioned non-slip mat for yoga, pilates, and home workouts.", features: ["6mm+ thickness", "Non-slip texture", "Carrying strap", "Easy clean"] },
  { slug: "jump-rope-weighted", store: "wellness", q: "speed jump rope weighted fitness", must: ["jump rope"], ban: ["dog leash", "clothesline"], ship: 3.5, desc: "Cardio anywhere — adjustable length for HIIT and boxing.", features: ["Ball bearings", "Adjustable length", "Foam grips", "Tangle-free"] },
  { slug: "muscle-roller-stick", store: "wellness", q: "muscle roller stick leg massage", must: ["roller stick"], ban: ["foam roller ball only"], ship: 4, desc: "Target quads, calves, and IT band after runs or leg day.", features: ["Independent rollers", "Travel size", "Deep tissue", "Non-slip handles"] },
  { slug: "portable-blender-bottle", store: "wellness", q: "portable blender usb rechargeable smoothie", must: ["blender"], ban: ["commercial juicer"], ship: 4.5, desc: "USB smoothie blender for gym, office, and travel.", features: ["USB rechargeable", "BPA-free cup", "Self-clean mode", "6 blades"] },
  { slug: "back-posture-trainer", store: "wellness", q: "smart posture corrector vibration reminder", must: ["posture"], ban: ["dog harness"], ship: 3.5, desc: "Gentle vibration reminds you to sit and stand straight.", features: ["Vibration alert", "Adjustable fit", "Rechargeable", "Discreet wear"] },
  { slug: "meditation-cushion", store: "wellness", q: "meditation cushion floor pillow buckwheat", must: ["meditation"], ban: ["dog bed", "sofa"], ship: 5, desc: "Elevated seat for comfortable meditation and floor sitting.", features: ["Removable cover", "Firm fill", "Carry handle", "Multiple colors"] },

  // TECH (14)
  { slug: "power-bank-10000", store: "tech", q: "power bank 10000mah portable charger", must: ["power bank"], ban: ["wireless charger pad only"], ship: 3.5, desc: "Fast portable charge for phone, earbuds, and tablet.", features: ["10,000mAh", "Dual USB", "Compact", "LED indicator"] },
  { slug: "usb-c-charging-cable", store: "tech", q: "usb c cable fast charging braided", must: ["usb c", "cable"], ban: ["adapter only", "hdmi only"], ship: 3.5, desc: "Durable braided cable for fast charging and data sync.", features: ["Fast charge", "Braided nylon", "6ft length", "Reinforced tips"] },
  { slug: "wireless-charger-pad", store: "tech", q: "wireless charger pad 15w qi", must: ["wireless charg"], ban: ["car mount only"], ship: 3.5, desc: "Qi pad charges iPhone and Android on desk or nightstand.", features: ["15W fast", "Case friendly", "LED status", "Non-slip base"] },
  { slug: "ring-light-phone", store: "tech", q: "ring light clip phone selfie", must: ["ring light"], ban: ["studio stand only"], ship: 3.5, desc: "Clip-on light for video calls, selfies, and content.", features: ["3 color modes", "Rechargeable", "Clip mount", "10 brightness"] },
  { slug: "monitor-light-bar", store: "tech", q: "monitor light bar screen lamp", must: ["monitor light", "screen light"], ban: ["desk lamp floor"], ship: 4.5, desc: "Eye-care lamp mounts on monitor — no screen glare.", features: ["No screen glare", "Touch dimmer", "USB powered", "Space saving"] },
  { slug: "gaming-mouse-pad-large", store: "tech", q: "large gaming mouse pad desk mat", must: ["mouse pad"], ban: ["mouse only", "wrist rest only"], ship: 4, desc: "Extended desk mat for mouse, keyboard, and smooth tracking.", features: ["Non-slip rubber", "Stitched edges", "Water resistant", "XL size"] },
  { slug: "webcam-cover-slide", store: "tech", q: "webcam cover slide laptop privacy", must: ["webcam cover"], ban: ["camera security system"], ship: 3.5, desc: "Thin sliding cover protects laptop privacy when not on calls.", features: ["Ultra-thin", "Strong adhesive", "Slide open/close", "3-pack"] },
  { slug: "hdmi-cable-4k", store: "tech", q: "hdmi cable 4k 6ft braided", must: ["hdmi"], ban: ["adapter hub only"], ship: 3.5, desc: "4K HDMI for TV, monitor, projector, and game console.", features: ["4K 60Hz", "Gold plated", "Braided", "6ft length"] },
  { slug: "sd-card-reader-usb", store: "tech", q: "sd card reader usb c adapter", must: ["card reader"], ban: ["memory card only"], ship: 3.5, desc: "Transfer photos and files from SD and microSD cards.", features: ["SD + microSD", "USB-C", "Plug and play", "Aluminum shell"] },
  { slug: "tablet-stand-adjustable", store: "tech", q: "tablet stand adjustable desk aluminum", must: ["tablet stand"], ban: ["phone case"], ship: 3.5, desc: "Stable stand for iPad, Kindle, and recipes in the kitchen.", features: ["Adjustable angle", "Aluminum", "Anti-slip pads", "Foldable"] },
  { slug: "car-charger-usb-c", store: "tech", q: "car charger usb c fast charging dual port", must: ["car charger"], ban: ["jump starter"], ship: 3.5, desc: "Fast dual-port car charger for road trips and commutes.", features: ["PD fast charge", "Dual port", "Compact", "Universal 12V"] },
  { slug: "bluetooth-keyboard-mini", store: "tech", q: "bluetooth keyboard mini portable", must: ["bluetooth keyboard"], ban: ["mechanical switch only"], ship: 4, desc: "Slim wireless keyboard for tablet, phone, and travel.", features: ["Bluetooth 5.0", "Rechargeable", "Quiet keys", "Pocket size"] },
  { slug: "smartwatch-band-silicone", store: "tech", q: "silicone smart watch band replacement", must: ["watch band"], ban: ["smart watch device", "screen protector only"], ship: 3.5, desc: "Comfortable sport band swap for Apple Watch and similar.", features: ["Soft silicone", "Multiple sizes", "Quick release", "Sweat resistant"] },
  { slug: "portable-ssd-enclosure", store: "tech", q: "nvme ssd enclosure usb c", must: ["ssd enclosure"], ban: ["internal ssd only"], ship: 3.5, desc: "Turn an NVMe drive into fast portable USB storage.", features: ["USB 3.2", "Tool-free", "Aluminum heat sink", "10Gbps"] },
];

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function retailPrice(cost, shipping) {
  const base = cost + shipping;
  return Math.max(Math.ceil(base / (1 - TARGET_MARGIN - PAYPAL_RATE)) - 0.01, base + 1.5);
}

function compareAt(sell) {
  return Math.ceil(sell * 1.1) - 0.01;
}

function okName(name, must, ban) {
  const n = (name || "").toLowerCase();
  if (ban.some((b) => n.includes(b))) return false;
  return must.every((m) => n.includes(m.toLowerCase()));
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
  await sleep(1100);
  const res = await fetch(`${API}/product/query?pid=${encodeURIComponent(pid)}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());
  return res.result ? res.data : null;
}

async function searchTop(token, item, usedPids) {
  await sleep(1100);
  const params = new URLSearchParams({
    page: "1",
    size: "30",
    keyWord: item.q,
    countryCode: "US",
    orderBy: "1",
    sort: "desc",
  });
  const list = await fetch(`${API}/product/listV2?${params}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());
  const products = (list.data?.content || []).flatMap((g) => g.productList || []);
  products.sort((a, b) => (b.listedNum || 0) - (a.listedNum || 0));

  for (const hit of products) {
    if (!hit?.id || usedPids.has(hit.id)) continue;
    if (!okName(hit.nameEn, item.must, item.ban)) continue;
    const listed = Number(hit.listedNum || 0);
    if (listed < 15) continue;

    const data = await queryPid(token, hit.id);
    if (!data) continue;
    const variant = data.variants?.find((v) => Number(v.variantSellPrice) > 0) || data.variants?.[0];
    if (!variant?.vid) continue;

    const cost = Number(variant.variantSellPrice ?? data.sellPrice ?? 0);
    if (cost < 0.4 || cost > 48) continue;

    usedPids.add(hit.id);
    const images = (data.productImageSet?.length ? data.productImageSet : [data.bigImage]).slice(0, 7);
    const image = variant.variantImage || images[0] || data.bigImage;
    if (image && !images.includes(image)) images.unshift(image);

    const price = retailPrice(cost, item.ship);
    const social = naturalSocialProof(item.slug, listed);
    const tags = [];
    if (listed > 1500) tags.push("bestseller");
    if (listed < 120) tags.push("new");
    if (price >= 24.99) tags.push("free-shipping");

    return {
      slug: item.slug,
      store: item.store,
      pid: data.pid,
      name: data.productNameEn,
      description: item.desc,
      longDescription: `${item.desc} Ships from US warehouse in 3–5 business days. Popular pick with strong seller volume on CJ (${listed.toLocaleString()} stores listing similar items).`,
      features: item.features,
      tags,
      supplierSku: data.productSku,
      cjVid: variant.vid,
      cjSku: variant.variantSku,
      image,
      images,
      cost,
      shippingEst: item.ship,
      price,
      compareAtPrice: compareAt(price),
      listedNum: listed,
      ...social,
      variantLabel: variant.variantKey || variant.variantNameEn,
    };
  }
  return null;
}

const token = await getToken();
const usedPids = new Set();
const results = {};
let ok = 0;
let fail = 0;

for (const item of targets) {
  if (existingSlugs.has(item.slug)) {
    console.log("SKIP existing slug", item.slug);
    continue;
  }
  const mapped = await searchTop(token, item, usedPids);
  if (!mapped) {
    fail++;
    console.log("FAIL", item.slug);
    continue;
  }
  results[item.slug] = mapped;
  ok++;
  console.log("OK", item.slug, `$${mapped.price.toFixed(2)}`, "listed:", mapped.listedNum);
}

writeFileSync(resolve(__dirname, "cj-bulk-catalog.json"), JSON.stringify(results, null, 2));
console.log(`\nDone: ${ok} added, ${fail} failed → scripts/cj-bulk-catalog.json`);
