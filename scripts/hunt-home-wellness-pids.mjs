/**
 * Hunt verified CJ PIDs for Home + Wellness expansion.
 * Usage: node --env-file=.env.local scripts/hunt-home-wellness-pids.mjs
 */
import { writeFileSync } from "fs";
import { getToken, queryPid, supplierImages, API, sleep, cjMatchesListing } from "./lib/cj-catalog-lib.mjs";

const t = await getToken(process.env.CJ_API_KEY);

const TARGETS = [
  // HOME — bestsellers em lojas US
  {
    store: "home",
    slug: "bamboo-cutting-board",
    q: "bamboo cutting board kitchen chopping",
    pred: (n) => n.includes("cutting board") && !n.includes("mat only") && !n.includes("phone"),
    name: "Bamboo Cutting Board",
    desc: "Durable bamboo board for everyday chopping and meal prep.",
    features: ["Natural bamboo", "Knife friendly", "Juice groove", "Easy to clean"],
    ship: 4,
  },
  {
    store: "home",
    slug: "silicone-oven-mitts",
    q: "silicone oven mitts heat resistant pair",
    pred: (n) => n.includes("oven mitt") && !n.includes("glove winter"),
    name: "Silicone Oven Mitts — Pair",
    desc: "Heat-resistant mitts protect hands when baking and grilling.",
    features: ["Heat resistant", "Non-slip grip", "Hanging loop", "Pair set"],
    ship: 4,
  },
  {
    store: "home",
    slug: "cascading-clothes-hangers",
    q: "cascading clothes hanger space saver",
    pred: (n) => n.includes("hanger") && (n.includes("cascad") || n.includes("space saver") || n.includes("magic")),
    name: "Cascading Closet Hangers — 5 Pack",
    desc: "Hang five shirts vertically in the space of one rod hook.",
    features: ["Space saving", "5-pack set", "Sturdy hooks", "Closet organizer"],
    ship: 4,
  },
  {
    store: "home",
    slug: "wall-toothbrush-holder",
    q: "wall mounted toothbrush holder bathroom",
    pred: (n) => n.includes("toothbrush") && n.includes("holder") && !n.includes("electric toothbrush only"),
    name: "Wall-Mount Toothbrush Holder",
    desc: "Keeps brushes and toothpaste tidy beside the bathroom sink.",
    features: ["Wall mount", "Drain slots", "Family capacity", "Rust resistant"],
    ship: 4,
  },
  {
    store: "home",
    slug: "silicone-bowl-covers",
    q: "silicone stretch lids bowl covers reusable",
    pred: (n) => (n.includes("bowl cover") || n.includes("stretch lid") || n.includes("silicone lid")) && !n.includes("mason jar ring"),
    name: "Reusable Silicone Bowl Covers",
    desc: "Stretch lids seal bowls and plates instead of plastic wrap.",
    features: ["Stretch fit", "Reusable lids", "Multi-size set", "Microwave safe"],
    ship: 3.5,
  },
  {
    store: "home",
    slug: "over-cabinet-hooks",
    q: "over cabinet door hooks kitchen towel",
    pred: (n) => n.includes("cabinet") && n.includes("hook") && !n.includes("under sink"),
    name: "Over-Cabinet Door Hooks",
    desc: "Hang towels and utensils on cabinet doors without drilling.",
    features: ["No-drill mount", "Over-door fit", "Towel hooks", "Kitchen helper"],
    ship: 3.5,
  },
  {
    store: "home",
    slug: "countertop-dish-drying-rack",
    q: "countertop dish drying rack compact",
    pred: (n) => n.includes("dish") && n.includes("rack") && n.includes("dry") && !n.includes("roll up") && !n.includes("over sink"),
    name: "Compact Countertop Dish Rack",
    desc: "Small rack air-dries plates and cups beside your sink.",
    features: ["Countertop fit", "Open drain", "Utensil holder", "Space saving"],
    ship: 4,
  },
  // WELLNESS
  {
    store: "wellness",
    slug: "ab-roller-wheel",
    q: "ab roller wheel abdominal exercise",
    pred: (n) => n.includes("ab roller") || (n.includes("abdominal") && n.includes("wheel")),
    name: "Ab Roller Wheel",
    desc: "Core trainer for abs and stability at home.",
    features: ["Dual wheel design", "Knee pad included", "Non-slip grip", "Home core workout"],
    ship: 4,
  },
  {
    store: "wellness",
    slug: "pilates-ring",
    q: "pilates ring fitness magic circle",
    pred: (n) => n.includes("pilates") && n.includes("ring"),
    name: "Pilates Resistance Ring",
    desc: "Adds light resistance to thighs, arms, and core exercises.",
    features: ["Foam padded grips", "Flexible ring", "Pilates & yoga", "Home gym"],
    ship: 3.5,
  },
  {
    store: "wellness",
    slug: "ankle-weights-pair",
    q: "ankle weights pair adjustable fitness",
    pred: (n) => n.includes("ankle weight") && !n.includes("wrist watch"),
    name: "Adjustable Ankle Weights — Pair",
    desc: "Add resistance to walks, leg lifts, and rehab exercises.",
    features: ["Adjustable straps", "Pair set", "Secure velcro", "Walk & workout"],
    ship: 4,
  },
  {
    store: "wellness",
    slug: "time-marker-water-bottle",
    q: "water bottle time marker motivational fitness",
    pred: (n) => n.includes("water bottle") && (n.includes("time") || n.includes("marker") || n.includes("motivat")),
    name: "Time-Marker Water Bottle",
    desc: "Hourly markings remind you to stay hydrated all day.",
    features: ["Time markers", "BPA-free bottle", "Leak-proof lid", "Gym & desk"],
    ship: 4,
  },
  {
    store: "wellness",
    slug: "hot-cold-gel-pack",
    q: "reusable hot cold gel ice pack therapy",
    pred: (n) => (n.includes("hot cold") || n.includes("ice pack")) && n.includes("reusable") && !n.includes("lunch box only"),
    name: "Reusable Hot & Cold Gel Pack",
    desc: "Soothes sore muscles, knees, and back after workouts.",
    features: ["Hot or cold use", "Reusable gel", "Flexible fit", "Post-workout recovery"],
    ship: 3.5,
  },
  {
    store: "wellness",
    slug: "fabric-hip-resistance-band",
    q: "fabric hip resistance band booty glute",
    pred: (n) => n.includes("resistance band") && (n.includes("hip") || n.includes("fabric") || n.includes("booty")),
    name: "Fabric Hip Resistance Band",
    desc: "Non-slip band for glute activation and leg day warmups.",
    features: ["Fabric non-slip", "Glute activation", "3 resistance levels", "Squat friendly"],
    ship: 3.5,
  },
  {
    store: "wellness",
    slug: "yoga-stretching-strap",
    q: "yoga stretching strap flexibility exercise",
    pred: (n) => n.includes("yoga") && n.includes("strap") && !n.includes("bag"),
    name: "Yoga Stretching Strap",
    desc: "Helps deepen stretches and improve flexibility safely.",
    features: ["D-ring buckle", "Cotton webbing", "Assist stretches", "Beginner friendly"],
    ship: 3.5,
  },
];

const found = {};

for (const item of TARGETS) {
  console.log("\n===", item.store, item.slug);
  let pid = null;
  for (let page = 1; page <= 5 && !pid; page++) {
    const p = new URLSearchParams({ page: String(page), size: "50", keyWord: item.q, orderBy: "1", sort: "desc" });
    const l = await fetch(`${API}/product/listV2?${p}`, { headers: { "CJ-Access-Token": t } }).then((r) => r.json());
    for (const h of (l.data?.content || []).flatMap((g) => g.productList || [])) {
      const n = (h.nameEn || "").toLowerCase();
      if (!item.pred(n)) continue;
      const d = await queryPid(t, h.id);
      const v = d?.variants?.find((x) => Number(x.variantSellPrice) > 0) || d?.variants?.[0];
      const cost = Number(v?.variantSellPrice || 0);
      const imgs = supplierImages(d, v);
      if (cost < 0.5 || cost > 40 || imgs.length < 4) continue;
      const match = cjMatchesListing(item.slug, item.name, item.desc, item.features, d.productNameEn || "");
      if (!match.ok || match.nameScore < 0.18) {
        console.log("  skip", Math.round(match.nameScore * 100) + "%", d.productNameEn?.slice(0, 55));
        continue;
      }
      console.log("OK", d.productNameEn?.slice(0, 70));
      console.log(" pid", h.id, "cost", cost, "imgs", imgs.length);
      pid = h.id;
      found[item.slug] = { ...item, pid: h.id, cjName: d.productNameEn, cost, imgs: imgs.length };
      break;
    }
    await sleep(900);
  }
  if (!pid) console.log("NONE");
}

writeFileSync("scripts/hunt-home-wellness-pids-results.json", JSON.stringify(found, null, 2));
console.log("\nSaved —", Object.keys(found).length, "PIDs");
