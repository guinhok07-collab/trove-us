/**
 * Hunt verified CJ PIDs for tech expansion — strict name predicates.
 * Usage: node --env-file=.env.local scripts/hunt-tech-pids.mjs
 */
import { writeFileSync } from "fs";
import { getToken, queryPid, supplierImages, API, sleep, cjMatchesListing } from "./lib/cj-catalog-lib.mjs";

const t = await getToken(process.env.CJ_API_KEY);

const TARGETS = [
  {
    slug: "ergonomic-keyboard-wrist-rest",
    q: "keyboard wrist rest memory foam",
    pred: (n) =>
      (n.includes("wrist rest") || n.includes("keyboard rest")) &&
      !n.includes("watch") &&
      !n.includes("blood pressure"),
    name: "Ergonomic Keyboard Wrist Rest",
    desc: "Memory foam pad supports wrists during long typing sessions.",
    features: ["Memory foam cushion", "Non-slip base", "Keyboard width fit", "Easy to clean"],
  },
  {
    slug: "usb-wall-charger-fast",
    q: "dual port wall charger plug adapter",
    pred: (n) =>
      (n.includes("wall charger") || n.includes("charger plug") || n.includes("charging plug")) &&
      !n.includes("power bank") &&
      !n.includes("wireless charger") &&
      !n.includes("car "),
    name: "Dual USB Wall Charger Block",
    desc: "Fast-charge two phones or earbuds from one compact outlet plug.",
    features: ["Dual USB ports", "Compact plug", "Travel friendly", "Device protection"],
  },
  {
    slug: "laptop-cooling-pad",
    q: "laptop cooling pad fan usb",
    pred: (n) =>
      n.includes("laptop") &&
      (n.includes("cooling pad") || n.includes("cooler pad") || n.includes("cooling stand")) &&
      !n.includes("pet") &&
      !n.includes("dog") &&
      !n.includes("cat "),
    name: "USB Laptop Cooling Pad",
    desc: "Quiet fans help laptops run cooler during work and gaming.",
    features: ["Dual quiet fans", "Adjustable tilt", "USB powered", "11–17 inch fit"],
  },
  {
    slug: "capacitive-stylus-pen",
    q: "capacitive stylus pen touch screen",
    pred: (n) => n.includes("stylus") && !n.includes("brush") && !n.includes("makeup"),
    name: "Capacitive Touch Stylus Pen",
    desc: "Smooth drawing and tapping on iPad, Android tablets, and phones.",
    features: ["No battery needed", "Soft capacitive tip", "Pocket clip", "Tablet & phone"],
  },
  {
    slug: "three-in-one-charging-cable",
    q: "3 in 1 charging cable multi connector",
    pred: (n) =>
      (n.includes("3 in 1") || n.includes("3in1")) &&
      n.includes("cable") &&
      !n.includes("brush") &&
      !n.includes("shovel"),
    name: "3-in-1 Charging Cable",
    desc: "One cord with USB-C, Lightning, and Micro-USB tips for travel.",
    features: ["3 connector tips", "Braided cable", "Travel ready", "Shared charging"],
  },
  {
    slug: "headphone-stand-hook",
    q: "headphone hook under desk hanger",
    pred: (n) =>
      n.includes("headphone") &&
      (n.includes("hook") || n.includes("hanger") || n.includes("holder")) &&
      !n.includes("bluetooth") &&
      !n.includes("earbuds") &&
      !n.includes("wireless"),
    name: "Under-Desk Headphone Hook",
    desc: "Keeps headsets off the desk and within arm's reach.",
    features: ["Clamp mount", "Padded hook", "No tools", "Cable friendly"],
  },
  {
    slug: "usbc-ethernet-adapter",
    q: "usb c ethernet adapter rj45",
    pred: (n) => n.includes("ethernet") && n.includes("adapter") && !n.includes("cable 10m"),
    name: "USB-C to Ethernet Adapter",
    desc: "Wired internet for laptops without a built-in RJ45 port.",
    features: ["Gigabit ethernet", "USB-C plug", "Compact design", "Stable wired link"],
  },
  {
    slug: "bluetooth-usb-adapter-pc",
    q: "bluetooth usb adapter dongle receiver",
    pred: (n) =>
      n.includes("bluetooth") &&
      (n.includes("adapter") || n.includes("dongle") || n.includes("receiver")) &&
      !n.includes("printer") &&
      !n.includes("speaker") &&
      !n.includes("headset"),
    name: "Bluetooth USB Adapter for PC",
    desc: "Adds Bluetooth to desktops and laptops for earbuds and mice.",
    features: ["Plug and play", "Bluetooth 5.0", "Compact dongle", "PC & laptop fit"],
  },
];

const found = {};

for (const item of TARGETS) {
  console.log("\n===", item.slug);
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
      if (!match.ok || match.nameScore < 0.2) {
        console.log("  skip match", Math.round(match.nameScore * 100) + "%", d.productNameEn?.slice(0, 55));
        continue;
      }
      console.log("OK", d.productNameEn?.slice(0, 70));
      console.log(" pid", h.id, "cost", cost, "imgs", imgs.length);
      pid = h.id;
      found[item.slug] = { pid: h.id, cjName: d.productNameEn, cost, imgs: imgs.length };
      break;
    }
    await sleep(900);
  }
  if (!pid) console.log("NONE");
}

writeFileSync("scripts/hunt-tech-pids-results.json", JSON.stringify(found, null, 2));
console.log("\nSaved hunt-tech-pids-results.json —", Object.keys(found).length, "found");
