/**
 * Hunt CJ bestsellers (orderBy=1) for impulse products not yet in catalog.
 * Usage: node --env-file=.env.local scripts/hunt-bestsellers-batch.mjs
 */
import { writeFileSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  getToken,
  queryPid,
  supplierImages,
  API,
  sleep,
  cjMatchesListing,
  retailPrice,
  MAX_RETAIL,
} from "./lib/cj-catalog-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const productsSrc = readFileSync(resolve(__dirname, "../src/data/products.ts"), "utf8");
const existing = new Set([...productsSrc.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]));

const t = await getToken(process.env.CJ_API_KEY);

/** High-demand impulse picks — easy to sell under $40 with frete embutido */
const TARGETS = [
  // PET
  {
    slug: "dog-raincoat-poncho",
    store: "pet",
    ship: 4,
    q: "dog raincoat waterproof poncho adjustable",
    pred: (n) =>
      n.includes("dog") &&
      (n.includes("raincoat") || n.includes("rain coat") || n.includes("poncho")) &&
      !n.includes("cat ") &&
      !n.includes("human"),
    name: "Waterproof Dog Raincoat Poncho",
    description: "Keeps dogs dry on wet walks without bulky jackets.",
    features: ["Waterproof shell", "Adjustable straps", "Easy on-off", "Reflective trim"],
  },
  {
    slug: "pet-drying-towel-bag",
    store: "pet",
    ship: 4,
    q: "pet drying bag towel bathrobe dog cat",
    pred: (n) =>
      (n.includes("pet") || n.includes("dog") || n.includes("cat")) &&
      (n.includes("drying") || n.includes("bathrobe") || n.includes("towel")) &&
      (n.includes("bag") || n.includes("robe") || n.includes("coat")) &&
      !n.includes("hair dryer") &&
      !n.includes("blower"),
    name: "Absorbent Pet Drying Robe",
    description: "Wraps wet dogs and cats after baths for faster drying.",
    features: ["Super absorbent", "Soft microfiber", "Adjustable fit", "Machine washable"],
  },
  {
    slug: "cat-treat-dispenser-toy",
    store: "pet",
    ship: 4,
    q: "cat treat dispenser puzzle toy ball interactive",
    pred: (n) =>
      n.includes("cat") &&
      (n.includes("treat") || n.includes("puzzle") || n.includes("dispenser")) &&
      (n.includes("toy") || n.includes("ball")) &&
      !n.includes("dog ") &&
      !n.includes("feeder automatic"),
    name: "Interactive Cat Treat Puzzle Toy",
    description: "Slow-release treat ball keeps cats busy and moving.",
    features: ["Treat dispensing", "BPA-free plastic", "Adjustable difficulty", "Indoor play"],
  },
  {
    slug: "dog-training-clicker",
    store: "pet",
    ship: 4,
    q: "dog training clicker whistle set",
    pred: (n) =>
      n.includes("dog") &&
      n.includes("clicker") &&
      (n.includes("training") || n.includes("train")) &&
      !n.includes("collar shock") &&
      !n.includes("electric"),
    name: "Dog Training Clicker Set",
    description: "Clicker training kit for basic commands and positive reinforcement.",
    features: ["Wrist strap", "Loud clear click", "Beginner friendly", "Portable"],
  },
  // HOME
  {
    slug: "kitchen-sink-strainer-plug",
    store: "home",
    ship: 4,
    q: "kitchen sink strainer drain catcher stainless",
    pred: (n) =>
      (n.includes("sink") || n.includes("drain")) &&
      (n.includes("strainer") || n.includes("catcher") || n.includes("filter")) &&
      !n.includes("bathtub") &&
      !n.includes("shower") &&
      !n.includes("hair catcher shower"),
    name: "Kitchen Sink Drain Strainer",
    description: "Catches food scraps so kitchen drains stay clear.",
    features: ["Stainless mesh", "Wide rim fit", "Easy to clean", "Multi-pack"],
  },
  {
    slug: "garlic-press-mincer",
    store: "home",
    ship: 4,
    q: "garlic press crusher stainless kitchen",
    pred: (n) =>
      n.includes("garlic") &&
      (n.includes("press") || n.includes("crusher") || n.includes("mincer")) &&
      !n.includes("peeler only") &&
      !n.includes("electric"),
    name: "Stainless Garlic Press",
    description: "Crush garlic cloves in one squeeze — no sticky knives.",
    features: ["Stainless build", "Easy squeeze", "Built-in cleaner", "Dishwasher safe"],
  },
  {
    slug: "egg-separator-tool",
    store: "home",
    ship: 4,
    q: "egg yolk separator white separator kitchen tool",
    pred: (n) =>
      n.includes("egg") &&
      (n.includes("separator") || n.includes("yolk")) &&
      !n.includes("cooker") &&
      !n.includes("boiler") &&
      !n.includes("carton"),
    name: "Egg Yolk Separator",
    description: "Separates yolks from whites for baking without the mess.",
    features: ["Food-grade silicone", "Fits bowls", "Easy clean", "Compact"],
  },
  {
    slug: "shoe-horn-long-handle",
    store: "home",
    ship: 4,
    q: "long handle shoe horn plastic elderly",
    pred: (n) =>
      n.includes("shoe horn") &&
      (n.includes("long") || n.includes("handle")) &&
      !n.includes("metal spoon") &&
      !n.includes("travel mini"),
    name: "Long-Handle Shoe Horn",
    description: "Slip on shoes without bending — helpful for daily dressing.",
    features: ["Long reach handle", "Smooth glide", "Lightweight", "Hang hole"],
  },
  {
    slug: "laundry-lint-remover",
    store: "home",
    ship: 4,
    q: "fabric lint remover sweater shaver clothes",
    pred: (n) =>
      (n.includes("lint remover") || n.includes("fabric shaver") || n.includes("sweater shaver")) &&
      !n.includes("pet hair") &&
      !n.includes("roller sticky"),
    name: "Fabric Lint Remover Shaver",
    description: "Removes pills and fuzz from sweaters, couches, and coats.",
    features: ["USB rechargeable", "Adjustable blade", "Lint catcher", "Travel size"],
  },
  // WELLNESS
  {
    slug: "yoga-block-foam",
    store: "wellness",
    ship: 3.5,
    q: "yoga block foam brick support stretch",
    pred: (n) =>
      (n.includes("yoga block") || n.includes("yoga brick")) &&
      !n.includes("wheel") &&
      !n.includes("mat ") &&
      !n.includes("strap"),
    name: "High-Density Yoga Block",
    description: "Supports balance and deeper stretches in yoga and pilates.",
    features: ["High-density foam", "Lightweight", "Non-slip surface", "Studio size"],
  },
  {
    slug: "ankle-weights-pair",
    store: "wellness",
    ship: 3.5,
    q: "ankle weights pair adjustable workout",
    pred: (n) =>
      n.includes("ankle") &&
      n.includes("weight") &&
      !n.includes("wrist only") &&
      !n.includes("dumbbell"),
    name: "Adjustable Ankle Weights Pair",
    description: "Add resistance to walks, pilates, and lower-body workouts.",
    features: ["Pair included", "Secure straps", "Comfort padding", "Home gym ready"],
  },
  {
    slug: "pill-organizer-weekly",
    store: "wellness",
    ship: 3.5,
    q: "weekly pill organizer 7 day medicine box",
    pred: (n) =>
      (n.includes("pill organizer") || n.includes("pill box") || n.includes("medicine box")) &&
      (n.includes("weekly") || n.includes("7 day") || n.includes("7-day")) &&
      !n.includes("alarm") &&
      !n.includes("smart bluetooth"),
    name: "Weekly Pill Organizer",
    description: "Seven-day compartments keep vitamins and meds sorted.",
    features: ["7-day boxes", "AM/PM lids", "Travel friendly", "Clear windows"],
  },
  {
    slug: "reusable-gel-ice-pack",
    store: "wellness",
    ship: 3.5,
    q: "reusable gel ice pack hot cold compress injury",
    pred: (n) =>
      (n.includes("ice pack") || n.includes("gel pack") || n.includes("hot cold")) &&
      (n.includes("reusable") || n.includes("gel") || n.includes("compress")) &&
      !n.includes("machine") &&
      !n.includes("cooler bag only"),
    name: "Reusable Hot & Cold Gel Pack",
    description: "Soothes sore muscles — freeze for cold or warm for heat therapy.",
    features: ["Hot & cold use", "Flexible gel", "Soft cover", "Reusable"],
  },
  // TECH
  {
    slug: "phone-tripod-flexible",
    store: "tech",
    ship: 3.5,
    q: "flexible phone tripod selfie stick bluetooth",
    pred: (n) =>
      n.includes("phone") &&
      (n.includes("tripod") || n.includes("octopus") || n.includes("flexible stand")) &&
      !n.includes("camera dslr") &&
      !n.includes("ring light only"),
    name: "Flexible Phone Tripod Stand",
    description: "Wraps around poles and desks for hands-free photos and calls.",
    features: ["Flexible legs", "Universal clamp", "Portrait & landscape", "Travel pouch"],
  },
  {
    slug: "desk-mouse-pad-extended",
    store: "tech",
    ship: 3.5,
    q: "extended desk mouse pad keyboard mat large",
    pred: (n) =>
      (n.includes("mouse pad") || n.includes("desk mat") || n.includes("mousepad")) &&
      (n.includes("large") || n.includes("extended") || n.includes("desk")) &&
      !n.includes("wireless charging") &&
      !n.includes("rgb only"),
    name: "Extended Desk Mouse Pad",
    description: "Wide mat covers keyboard and mouse for a cleaner desk setup.",
    features: ["Large surface", "Non-slip base", "Stitched edges", "Smooth tracking"],
  },
  {
    slug: "laptop-privacy-screen",
    store: "tech",
    ship: 3.5,
    q: "laptop privacy screen filter 14 inch anti spy",
    pred: (n) =>
      n.includes("privacy") &&
      (n.includes("screen") || n.includes("filter")) &&
      (n.includes("laptop") || n.includes("notebook")) &&
      !n.includes("phone") &&
      !n.includes("monitor arm"),
    name: "Laptop Privacy Screen Filter",
    description: "Blocks side views so only you see your screen on planes and cafes.",
    features: ["Anti-spy film", "Easy peel mount", "Scratch resistant", "Travel ready"],
  },
];

const found = {};

for (const item of TARGETS) {
  if (existing.has(item.slug)) {
    console.log("SKIP exists", item.slug);
    continue;
  }
  console.log("\n===", item.slug);
  let pid = null;

  for (let page = 1; page <= 6 && !pid; page++) {
    const p = new URLSearchParams({
      page: String(page),
      size: "40",
      keyWord: item.q,
      orderBy: "1",
      sort: "desc",
    });
    const l = await fetch(`${API}/product/listV2?${p}`, {
      headers: { "CJ-Access-Token": t },
    }).then((r) => r.json());

    const hits = (l.data?.content || []).flatMap((g) => g.productList || []);
    for (const h of hits) {
      const n = (h.nameEn || "").toLowerCase();
      if (!item.pred(n)) continue;

      const d = await queryPid(t, h.id);
      if (!d?.variants?.length) continue;
      const v = d.variants.find((x) => Number(x.variantSellPrice) > 0) || d.variants[0];
      const cost = Number(v?.variantSellPrice || 0);
      const imgs = supplierImages(d, v);
      if (cost < 0.4 || cost > 28 || imgs.length < 4) continue;

      const price = retailPrice(cost, item.ship);
      if (price > MAX_RETAIL) continue;

      const match = cjMatchesListing(
        item.slug,
        item.name,
        item.description,
        item.features,
        d.productNameEn || "",
      );
      if (!match.ok || match.nameScore < 0.18) {
        console.log(
          "  skip",
          Math.round(match.nameScore * 100) + "%",
          (d.productNameEn || "").slice(0, 60),
        );
        continue;
      }

      const listed = Number(d.listedNum || h.listedNum || 0);
      console.log(
        "OK",
        (d.productNameEn || "").slice(0, 70),
        `| pid ${h.id} cost $${cost} imgs ${imgs.length} listed ${listed} → $${price}`,
      );
      pid = h.id;
      found[item.slug] = {
        ...item,
        pid: h.id,
        cjName: d.productNameEn,
        cost,
        imgs: imgs.length,
        listedNum: listed,
        desc: item.description,
      };
      break;
    }
    await sleep(1100);
  }
  if (!pid) console.log("NONE");
}

const out = resolve(__dirname, "hunt-bestsellers-batch-results.json");
writeFileSync(out, JSON.stringify(found, null, 2));
console.log(`\nSaved ${Object.keys(found).length} picks → ${out}`);
