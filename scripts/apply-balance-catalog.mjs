/**
 * Balance catalog across pet / home / wellness / tech using CJ best-sellers (orderBy=orders).
 * Usage: node --env-file=.env.local scripts/apply-balance-catalog.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { naturalSocialProof } from "./social-proof.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY;
if (!key) throw new Error("Set CJ_API_KEY in .env.local");

const TARGET_MARGIN = 0.2;
const PAYPAL_RATE = 0.034;
const MAX_RETAIL = 39.99;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const productsPath = resolve(__dirname, "../src/data/products.ts");
let source = readFileSync(productsPath, "utf8");
const existingSlugs = new Set([...source.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]));

/** Gaps to fill — CJ search sorted by orders (listedNum), US warehouse */
const TARGETS = [
  // WELLNESS (+12)
  {
    slug: "weighted-sleep-mask",
    store: "wellness",
    q: "weighted sleep mask blackout",
    must: ["eye mask", "sleep mask", "weighted"],
    ban: ["vr", "bluetooth", "wireless", "facial", "moisturizing", "cream"],
    ship: 3.5,
    name: "Weighted Sleep Mask",
    description: "Gentle weight blocks light and eases tension for deeper sleep.",
    longDescription:
      "Fall asleep faster with a blackout mask that adds light pressure around the eyes — like a calm hug for your face. Soft fabric and an adjustable strap fit most head sizes without pulling hair. Great for travel, naps, and light-sensitive sleepers. Ships from our US warehouse in 3–5 business days.",
    features: ["Blackout coverage", "Gentle weighted feel", "Adjustable strap", "Travel friendly"],
    tags: ["bestseller"],
  },
  {
    slug: "acupressure-mat-pillow",
    store: "wellness",
    q: "acupressure mat pillow set back pain",
    must: ["acupressure", "spike mat", "lotus mat"],
    ban: ["yoga mat only", "dog"],
    ship: 5,
    name: "Acupressure Mat & Pillow Set",
    description: "Spike mat and pillow release back and neck tension in minutes.",
    longDescription:
      "Lie down on thousands of gentle pressure points that help loosen tight muscles after desk work or workouts. Includes a matching neck pillow for shoulder and upper-back relief. Comes with a carry bag for storage. Start with a thin shirt and build up to 10–20 minutes per session. Ships from our US warehouse in 3–5 business days.",
    features: ["Mat + neck pillow", "Carry bag included", "Eco foam base", "Beginner friendly"],
    tags: ["bestseller"],
  },
  {
    slug: "jump-rope-weighted",
    store: "wellness",
    q: "speed jump rope weighted fitness adjustable",
    must: ["jump rope", "skipping rope"],
    ban: ["dog leash", "clothesline"],
    ship: 3.5,
    name: "Adjustable Speed Jump Rope",
    description: "Cardio anywhere — adjustable length for HIIT, boxing, and home workouts.",
    longDescription:
      "Burn calories in small spaces with a tangle-free jump rope built for fast spins and daily training. Foam grips stay comfortable during longer sessions and the length adjusts for different heights. Fits in a gym bag for travel workouts. Ships from our US warehouse in 3–5 business days.",
    features: ["Ball-bearing handles", "Adjustable length", "Foam grips", "Tangle-resistant cord"],
    tags: [],
  },
  {
    slug: "portable-blender-bottle",
    store: "wellness",
    q: "portable blender usb rechargeable smoothie cup",
    must: ["blender", "juicer cup"],
    ban: ["commercial juicer", "food processor large"],
    ship: 4.5,
    name: "Portable USB Smoothie Blender",
    description: "Rechargeable personal blender for protein shakes on the go.",
    longDescription:
      "Blend smoothies at the gym, office, or hotel with a compact USB-rechargeable cup blender. BPA-free jar rinses clean fast and the six-blade base handles frozen fruit and protein powder. One-button operation — no countertop space needed. Ships from our US warehouse in 3–5 business days.",
    features: ["USB rechargeable", "BPA-free cup", "6-blade base", "Travel size"],
    tags: ["bestseller"],
  },
  {
    slug: "foam-roller-recovery",
    store: "wellness",
    q: "EVA foam roller yoga muscle 45cm",
    must: ["foam roller", "yoga roller"],
    ban: ["electric", "massage gun", "vibrating"],
    ship: 4.5,
    name: "EVA Foam Roller — Muscle Recovery",
    description: "Roll out sore legs, back, and IT band after workouts.",
    longDescription:
      "Speed up recovery with a firm EVA foam roller that targets quads, hamstrings, and upper back without a gym appointment. Textured surface grips the floor while you control pressure. Lightweight enough to stash by the couch or in a gym bag. Ships from our US warehouse in 3–5 business days.",
    features: ["High-density EVA", "Full-body use", "Non-slip texture", "Lightweight"],
    tags: [],
  },
  {
    slug: "massage-ball-set",
    store: "wellness",
    q: "massage ball lacrosse peanut trigger point",
    must: ["massage ball", "lacrosse ball", "trigger point"],
    ban: ["foam roller only", "dog toy"],
    ship: 3.5,
    name: "Trigger Point Massage Ball Set",
    description: "Target knots in feet, glutes, and shoulders with firm massage balls.",
    longDescription:
      "Reach spots a foam roller misses with compact balls that dig into trigger points along the spine, feet, and hips. Includes single and peanut-style shapes for different muscle groups. Toss in a gym bag for post-run relief. Ships from our US warehouse in 3–5 business days.",
    features: ["Single + peanut shape", "Deep tissue pressure", "Portable", "Durable rubber"],
    tags: [],
  },
  {
    slug: "ear-plugs-sleep",
    store: "wellness",
    q: "soft foam ear plugs sleep noise reduction",
    must: ["ear plug", "earplug"],
    ban: ["bluetooth", "headphone"],
    ship: 3.5,
    name: "Soft Foam Ear Plugs — Sleep & Travel",
    description: "Block snoring and street noise for quieter sleep.",
    longDescription:
      "Moldable foam ear plugs expand to fit most ear canals and cut down on partner snoring, traffic, and hotel noise. Reusable carry case keeps pairs clean in a nightstand or travel pouch. A simple upgrade for light sleepers and frequent travelers. Ships from our US warehouse in 3–5 business days.",
    features: ["Noise reduction", "Soft slow-expand foam", "Carry case", "Multi-pair pack"],
    tags: [],
  },
  {
    slug: "scalp-massager-brush",
    store: "wellness",
    q: "scalp massager brush shampoo silicone",
    must: ["scalp"],
    ban: ["hair dryer", "straightener"],
    ship: 3.5,
    name: "Silicone Scalp Massager Brush",
    description: "Gentle scalp massage during shampoo — relaxes and cleanses roots.",
    longDescription:
      "Turn shower time into a mini spa with soft silicone bristles that massage the scalp while you lather shampoo. Helps distribute product and feels great after a long day. Waterproof and easy to rinse — fits in a shower caddy. Ships from our US warehouse in 3–5 business days.",
    features: ["Soft silicone bristles", "Shower safe", "Ergonomic grip", "All hair types"],
    tags: ["bestseller"],
  },
  {
    slug: "digital-kitchen-scale",
    store: "wellness",
    q: "digital kitchen food scale grams ounces",
    must: ["kitchen scale", "food scale", "digital scale"],
    ban: ["bathroom scale", "body scale", "luggage scale", "jewelry scale only"],
    ship: 4,
    name: "Digital Kitchen Food Scale",
    description: "Weigh portions for meal prep, baking, and macro tracking.",
    longDescription:
      "Hit your nutrition goals with a slim digital scale that switches between grams and ounces in one tap. Tempered glass surface wipes clean and the tare function zeroes out bowls and containers. Compact enough to leave on the counter. Ships from our US warehouse in 3–5 business days.",
    features: ["Gram & oz modes", "Tare function", "Tempered glass top", "Slim profile"],
    tags: [],
  },
  {
    slug: "balance-pad-foam",
    store: "wellness",
    q: "balance pad foam exercise stability training",
    must: ["balance pad", "balance board", "stability pad"],
    ban: ["yoga mat only", "dog bed"],
    ship: 4.5,
    name: "Foam Balance Pad",
    description: "Improve stability for rehab, yoga, and standing desk breaks.",
    longDescription:
      "Add an unstable surface to squats, single-leg stands, and physical therapy exercises without bulky equipment. Closed-cell foam is waterproof and wipes clean after sweat sessions. Great for ankle rehab and core activation at home. Ships from our US warehouse in 3–5 business days.",
    features: ["Closed-cell foam", "Non-slip bottom", "Rehab friendly", "Easy to clean"],
    tags: [],
  },
  {
    slug: "resistance-loop-bands",
    store: "wellness",
    q: "resistance loop bands set fabric glute",
    must: ["resistance band", "loop band", "exercise band"],
    ban: ["pull up bar", "yoga mat only"],
    ship: 3.5,
    name: "Fabric Resistance Loop Bands — Set of 3",
    description: "Glute and leg bands for home workouts — no rolling or pinching.",
    longDescription:
      "Train hips, glutes, and thighs with fabric loop bands that stay put better than rubber alone. Three resistance levels scale from rehab to strength work. Folds into a pouch for travel and fits under a desk for quick movement breaks. Ships from our US warehouse in 3–5 business days.",
    features: ["3 resistance levels", "Fabric non-slip", "Glute & leg focus", "Travel pouch"],
    tags: [],
  },
  {
    slug: "cooling-towel-sports",
    store: "wellness",
    q: "cooling towel instant chill sports gym",
    must: ["cooling towel", "ice towel", "chill towel"],
    ban: ["dog cooling mat", "ice pack only"],
    ship: 3.5,
    name: "Instant Cooling Sports Towel",
    description: "Wet, snap, and cool down fast after workouts or hot days.",
    longDescription:
      "Beat heat during runs, yard work, or gym sessions with a microfiber towel that stays cool for hours after a quick soak and snap. Re-wet anytime to refresh. Clips to a gym bag or golf cart — a summer essential. Ships from our US warehouse in 3–5 business days.",
    features: ["Instant chill tech", "Reusable microfiber", "Carabiner clip", "Machine washable"],
    tags: [],
  },

  // HOME (+7)
  {
    slug: "bed-sheet-organizer",
    store: "home",
    q: "bed sheet organizer storage foldable set",
    must: ["sheet organizer", "bedding organizer", "sheet storage"],
    ban: ["pillow case only", "mattress"],
    ship: 4,
    name: "Bed Sheet Organizer Set",
    description: "Keep matching sheet sets together — no more lost pillowcases.",
    longDescription:
      "Label and store folded sheet sets in breathable organizers so you grab the right size without digging through the linen closet. Fits standard queen and full sets and stacks neatly on shelves. A small change that makes laundry day faster. Ships from our US warehouse in 3–5 business days.",
    features: ["Labeled pockets", "Breathable fabric", "Closet stackable", "Set of 3"],
    tags: [],
  },
  {
    slug: "mason-jar-storage-lids",
    store: "home",
    q: "mason jar storage lids pour shaker pantry",
    must: ["mason jar", "canning jar"],
    ban: ["ring light", "canning machine"],
    ship: 3.5,
    name: "Mason Jar Storage Lid Set",
    description: "Turn jars into pantry pour spouts and shaker lids.",
    longDescription:
      "Repurpose mason jars for rice, pasta, spices, and snacks with leak-resistant lids that pour or shake without removing the ring. BPA-free plastic fits regular-mouth jars you already own. Less plastic waste and a cleaner pantry look. Ships from our US warehouse in 3–5 business days.",
    features: ["Pour & shaker lids", "Regular-mouth fit", "BPA-free", "Multi-pack"],
    tags: ["bestseller"],
  },
  {
    slug: "collapsible-colander",
    store: "home",
    q: "collapsible colander silicone strainer kitchen",
    must: ["colander", "strainer"],
    ban: ["laundry basket", "pet"],
    ship: 4,
    name: "Collapsible Silicone Colander",
    description: "Drain pasta and rinse produce — folds flat for small kitchens.",
    longDescription:
      "Save drawer space with a silicone colander that expands over the sink and collapses when you're done. Heat-resistant for hot pasta water and flexible enough to squeeze into tight cabinets. Dishwasher safe for everyday cooking. Ships from our US warehouse in 3–5 business days.",
    features: ["Collapsible design", "Heat-resistant silicone", "Over-sink handles", "Dishwasher safe"],
    tags: [],
  },
  {
    slug: "silicone-utensil-rest",
    store: "home",
    q: "silicone spoon rest utensil holder stove",
    must: ["spoon rest", "utensil rest", "spatula rest"],
    ban: ["toothbrush", "phone stand"],
    ship: 3.5,
    name: "Silicone Spoon Rest",
    description: "Keeps counters clean while cooking — holds ladles and spatulas.",
    longDescription:
      "Stop sauce drips on the counter with a heat-resistant spoon rest that sits beside the stove. Wide cradle fits ladles, tongs, and spatulas during busy meal prep. Dishwasher safe silicone rinses clean in seconds. Ships from our US warehouse in 3–5 business days.",
    features: ["Heat resistant", "Wide cradle", "Non-slip base", "Dishwasher safe"],
    tags: [],
  },
  {
    slug: "refrigerator-organizer-bins",
    store: "home",
    q: "refrigerator organizer bins clear stackable",
    must: ["fridge", "refrigerator", "pantry bin"],
    ban: ["vacuum sealer", "wine cooler"],
    ship: 4.5,
    name: "Fridge Organizer Bins — Clear Set",
    description: "Clear bins group snacks, drinks, and produce for a tidy fridge.",
    longDescription:
      "See everything at a glance with stackable clear bins that corral yogurt cups, soda cans, and produce drawers. Built-in handles slide out for quick grabs during meal prep. A simple organization upgrade that cuts food waste from forgotten items. Ships from our US warehouse in 3–5 business days.",
    features: ["Clear stackable bins", "Built-in handles", "Multiple sizes", "Easy wipe clean"],
    tags: ["bestseller"],
  },
  {
    slug: "over-sink-dish-rack",
    store: "home",
    q: "over sink dish drying rack roll up",
    must: ["dish rack", "drying rack", "dish drainer"],
    ban: ["dishwasher machine", "laundry rack"],
    ship: 4.5,
    name: "Over-Sink Roll-Up Dish Drying Rack",
    description: "Rolls out over the sink for extra drying space — stores flat.",
    longDescription:
      "Small kitchen? Roll this rack over the sink to air-dry plates and glasses without a bulky dish drainer on the counter. Silicone-coated steel bars support heavy pots and roll up for drawer storage when guests arrive. Ships from our US warehouse in 3–5 business days.",
    features: ["Roll-up design", "Over-sink fit", "Heat resistant bars", "Space saving"],
    tags: [],
  },
  {
    slug: "drawer-divider-expandable",
    store: "home",
    q: "expandable drawer divider adjustable bamboo",
    must: ["drawer divider", "drawer organizer"],
    ban: ["closet shelf hanging", "shoe rack"],
    ship: 4,
    name: "Expandable Drawer Dividers",
    description: "Adjustable dividers tame junk drawers and utensil chaos.",
    longDescription:
      "Custom-fit dividers expand to separate utensils, junk drawer gadgets, and office supplies without tools. Spring-loaded ends grip drawer walls and stay put when you pull items out. Set of 4 covers most kitchen and desk drawers. Ships from our US warehouse in 3–5 business days.",
    features: ["Spring-loaded grip", "No tools needed", "Set of 4", "Bamboo or plastic options"],
    tags: [],
  },

  // TECH (+8)
  {
    slug: "bluetooth-keyboard-mini",
    store: "tech",
    q: "bluetooth keyboard mini portable rechargeable",
    must: ["bluetooth keyboard", "wireless keyboard"],
    ban: ["mechanical gaming rgb only"],
    ship: 4,
    name: "Mini Bluetooth Keyboard",
    description: "Slim wireless keyboard for tablet, TV, and travel setups.",
    longDescription:
      "Type comfortably on an iPad, Fire TV, or phone with a rechargeable Bluetooth keyboard that pairs in seconds. Quiet keys won't disturb roommates and the slim profile fits in a laptop sleeve pocket. One keyboard for couch browsing and hotel work sessions. Ships from our US warehouse in 3–5 business days.",
    features: ["Bluetooth 5.0", "Rechargeable battery", "Quiet keys", "Pocket slim"],
    tags: [],
  },
  {
    slug: "wireless-mouse-silent",
    store: "tech",
    q: "wireless mouse silent ergonomic rechargeable",
    must: ["wireless mouse", "rechargeable mouse"],
    ban: ["gaming rgb only", "mouse pad only"],
    ship: 3.5,
    name: "Silent Wireless Mouse",
    description: "Quiet clicks and smooth tracking for office and travel.",
    longDescription:
      "Work in cafes and shared spaces without loud click sounds. Ergonomic shape supports all-day use and the USB receiver stores inside the mouse for travel. Plug-and-play on Windows and Mac — no driver hunt required. Ships from our US warehouse in 3–5 business days.",
    features: ["Silent clicks", "USB receiver storage", "Ergonomic shape", "Plug and play"],
    tags: ["bestseller"],
  },
  {
    slug: "laptop-sleeve-13",
    store: "tech",
    q: "laptop sleeve 13 14 inch neoprene case",
    must: ["laptop sleeve", "laptop case", "notebook sleeve"],
    ban: ["backpack only", "phone case"],
    ship: 4,
    name: "Neoprene Laptop Sleeve — 13–14\"",
    description: "Slim scratch protection for MacBook and ultrabooks.",
    longDescription:
      "Slide your laptop into a padded neoprene sleeve before tossing it in a tote or backpack. Soft interior prevents scratches and the zipper opens wide for quick airport security checks. Fits most 13–14 inch laptops and tablets with keyboards. Ships from our US warehouse in 3–5 business days.",
    features: ["Neoprene padding", "Scratch protection", "Wide zipper", "13–14 inch fit"],
    tags: [],
  },
  {
    slug: "screen-cleaner-kit",
    store: "tech",
    q: "screen cleaner spray microfiber phone laptop kit",
    must: ["screen clean", "lcd clean", "phone clean"],
    ban: ["vacuum", "dish soap"],
    ship: 3.5,
    name: "Screen Cleaner Kit",
    description: "Spray + cloth kit for phones, laptops, and monitors.",
    longDescription:
      "Remove fingerprints and smudges from screens without streaks or harsh chemicals. Includes a fine-mist spray and large microfiber cloth safe for phones, tablets, glasses, and monitors. Keep one at your desk and one in a travel pouch. Ships from our US warehouse in 3–5 business days.",
    features: ["Streak-free formula", "Large microfiber cloth", "Safe for coated screens", "Travel size bottle"],
    tags: [],
  },
  {
    slug: "usb-c-adapter-dual",
    store: "tech",
    q: "usb c to usb adapter otg dual pack",
    must: ["usb c", "usb-c", "type c"],
    ban: ["hdmi only", "sd card", "hub 7", "hub 8"],
    ship: 3.5,
    name: "USB-C to USB Adapter — 2 Pack",
    description: "Connect flash drives and accessories to USB-C laptops and phones.",
    longDescription:
      "Bridge the port gap when your new laptop only has USB-C. Tiny adapters plug in flash drives, mice, and legacy cables without bulky hubs. Aluminum shell dissipates heat during file transfers. Ships from our US warehouse in 3–5 business days.",
    features: ["USB-C to USB-A", "2-pack value", "Aluminum shell", "OTG friendly"],
    tags: [],
  },
  {
    slug: "phone-ring-holder",
    store: "tech",
    q: "phone ring holder stand grip kickstand",
    must: ["ring holder", "phone ring", "finger ring", "phone grip"],
    ban: ["car mount only", "pop socket trademark"],
    ship: 3.5,
    name: "Phone Ring Holder & Stand",
    description: "Secure grip and kickstand for one-handed texting and video.",
    longDescription:
      "Reduce drop anxiety with a metal ring that rotates into a stand for recipes, FaceTime, and scrolling. Strong adhesive attaches to most phone cases and can be repositioned once. A low-cost upgrade that makes big phones easier to hold. Ships from our US warehouse in 3–5 business days.",
    features: ["360° rotation", "Kickstand mode", "Strong adhesive", "Slim profile"],
    tags: ["bestseller"],
  },
  {
    slug: "bluetooth-item-finder",
    store: "tech",
    q: "bluetooth tracker key finder smart tag",
    must: ["tracker", "finder", "locator tag", "smart tag"],
    ban: ["gps watch", "pet collar gps"],
    ship: 3.5,
    name: "Bluetooth Item Finder Tag",
    description: "Ring your keys or wallet from your phone when they're misplaced.",
    longDescription:
      "Attach a slim Bluetooth tag to keys, bags, or remotes and ping them from a phone app when something goes missing. Replaceable battery lasts months of daily use. Affordable peace of mind for busy households. Ships from our US warehouse in 3–5 business days.",
    features: ["Phone app ping", "Replaceable battery", "Slim tag design", "Multi-item support"],
    tags: [],
  },
  {
    slug: "portable-ssd-enclosure",
    store: "tech",
    q: "nvme m2 ssd enclosure usb c 10gbps",
    must: ["ssd enclosure", "nvme enclosure", "m.2 enclosure"],
    ban: ["internal ssd only", "hard drive 3.5"],
    ship: 3.5,
    name: "NVMe SSD Enclosure — USB-C",
    description: "Turn an M.2 drive into fast portable USB storage.",
    longDescription:
      "Repurpose an NVMe SSD as an external drive for photo backups and video edits on the go. Tool-free tray and aluminum housing help manage heat during large transfers. USB-C connection up to 10Gbps when paired with a fast drive. Ships from our US warehouse in 3–5 business days.",
    features: ["NVMe M.2 fit", "USB-C 10Gbps", "Tool-free install", "Aluminum heat sink"],
    tags: [],
  },

  // PET (+5)
  {
    slug: "automatic-pet-feeder",
    store: "pet",
    q: "automatic pet feeder timer dog cat portion",
    must: ["feeder", "food dispenser"],
    ban: ["water fountain only", "fish tank"],
    ship: 5,
    name: "Automatic Pet Feeder — Timer",
    description: "Scheduled meals for cats and dogs when you're away.",
    longDescription:
      "Dispense kibble on a timer so pets eat on schedule during workdays and short trips. Portion control helps with weight management and the hopper holds several days of dry food. Easy to program and disassemble for cleaning. Ships from our US warehouse in 3–5 business days.",
    features: ["Programmable timer", "Portion control", "Dry food hopper", "Easy clean tray"],
    tags: ["bestseller"],
  },
  {
    slug: "cat-scratching-mat",
    store: "pet",
    q: "cat scratching mat sisal board flat",
    must: ["scratch", "scratching mat", "sisal"],
    ban: ["cat tree tower", "condo tall"],
    ship: 4,
    name: "Flat Cat Scratching Mat",
    description: "Sisal mat protects furniture and satisfies scratching instincts.",
    longDescription:
      "Give cats a dedicated scratching zone with a flat sisal mat that slides under a couch or leans against a wall. Saves sofas and door frames while keeping claws healthy. Lightweight and easy to move between rooms. Ships from our US warehouse in 3–5 business days.",
    features: ["Natural sisal", "Flat space-saving", "Furniture saver", "Non-slip base"],
    tags: [],
  },
  {
    slug: "cat-tunnel-toy",
    store: "pet",
    q: "cat tunnel toy collapsible play tube",
    must: ["cat tunnel", "play tunnel", "pet tunnel"],
    ban: ["dog crate", "hamster only"],
    ship: 4.5,
    name: "Collapsible Cat Play Tunnel",
    description: "Crinkle tunnel for hide-and-pounce indoor play.",
    longDescription:
      "Indoor cats love darting through a collapsible tunnel with crinkle sounds and peek holes for ambush play. Folds flat for storage and pops open in seconds for daily enrichment. Great paired with feather toys for exercise. Ships from our US warehouse in 3–5 business days.",
    features: ["Collapsible tube", "Crinkle material", "Peek holes", "Indoor enrichment"],
    tags: ["bestseller"],
  },
  {
    slug: "dog-squeaky-plush-toy",
    store: "pet",
    q: "dog squeaky plush toy durable stuffing",
    must: ["squeaky", "plush toy", "dog toy"],
    ban: ["cat only", "rope only"],
    ship: 3.5,
    name: "Squeaky Plush Dog Toy",
    description: "Soft squeaker toy for fetch, cuddles, and solo play.",
    longDescription:
      "Keep dogs entertained with a plush toy that squeaks during fetch and couch time. Reinforced stitching handles moderate chewers and the size fits small to medium breeds. An affordable add-on to any pet order. Ships from our US warehouse in 3–5 business days.",
    features: ["Built-in squeaker", "Soft plush", "Reinforced seams", "Fetch friendly"],
    tags: [],
  },
  {
    slug: "pet-bowl-mat-silicone",
    store: "pet",
    q: "pet bowl mat silicone waterproof food",
    must: ["bowl mat", "pet mat", "feeding mat"],
    ban: ["splash pad", "kids pool", "sprinkler"],
    ship: 3.5,
    name: "Silicone Pet Bowl Mat",
    description: "Waterproof mat catches spills around food and water bowls.",
    longDescription:
      "Protect floors from kibble crumbs and water splashes with a raised-edge silicone mat that stays put under bowls. Wipe clean after every meal or toss in the dishwasher. Fits double bowls and single feeders alike. Ships from our US warehouse in 3–5 business days.",
    features: ["Raised edges", "Non-slip silicone", "Dishwasher safe", "Fits double bowls"],
    tags: [],
  },
];

function retailPrice(cost, shipping) {
  const base = cost + shipping;
  const raw = base / (1 - TARGET_MARGIN - PAYPAL_RATE);
  return Math.min(Math.max(Math.ceil(raw) - 0.01, base + 1.5), MAX_RETAIL);
}

function compareAt(sell) {
  return Math.ceil(sell * 1.1) - 0.01;
}

function okName(name, must, ban) {
  const n = (name || "").toLowerCase();
  if (ban.some((b) => n.includes(b))) return false;
  return must.some((m) => n.includes(m.toLowerCase()));
}

function rankImages(urls) {
  return [...new Set(urls.filter(Boolean))].slice(0, 8);
}

function formatImages(images) {
  return JSON.stringify(images, null, 4)
    .split("\n")
    .map((line, idx) => (idx === 0 ? line : "      " + line.trim()))
    .join("\n");
}

function assignId(src, store) {
  const prefix = store === "wellness" ? "well" : store === "tech" ? "tech" : store;
  const nums = [...src.matchAll(new RegExp(`id: "${prefix}-(\\d+)"`, "g"))].map((m) => Number(m[1]));
  return `${prefix}-${(nums.length ? Math.max(...nums) : 0) + 1}`;
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
    features: ${JSON.stringify(entry.features)},
    supplierSku: ${JSON.stringify(entry.supplierSku)},
    cjVid: ${JSON.stringify(entry.cjVid)},
    cjSku: ${JSON.stringify(entry.cjSku)}
  }`;
}

async function getToken() {
  const auth = await fetch(`${API}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: key }),
  }).then((r) => r.json());
  if (!auth.result) throw new Error(auth.message || "CJ auth failed");
  return auth.data.accessToken;
}

async function queryPid(token, pid) {
  await sleep(1200);
  const res = await fetch(`${API}/product/query?pid=${encodeURIComponent(pid)}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());
  return res.result ? res.data : null;
}

async function searchTop(token, item, usedPids) {
  await sleep(1200);
  const params = new URLSearchParams({
    page: "1",
    size: "50",
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
    if (listed < 10) continue;

    const data = await queryPid(token, hit.id);
    if (!data) continue;
    const variant = data.variants?.find((v) => Number(v.variantSellPrice) > 0) || data.variants?.[0];
    if (!variant?.vid) continue;

    const cost = Number(variant.variantSellPrice ?? data.sellPrice ?? 0);
    if (cost < 0.5 || cost > 42) continue;

    usedPids.add(hit.id);
    const images = rankImages([variant.variantImage, data.bigImage, ...(data.productImageSet || [])]);
    const price = retailPrice(cost, item.ship);
    if (price >= MAX_RETAIL) continue;

    const social = naturalSocialProof(item.slug, listed);
    const tags = [...(item.tags || [])];
    if (listed > 1500 && !tags.includes("bestseller")) tags.push("bestseller");
    if (listed < 150 && !tags.includes("new")) tags.push("new");

    return {
      ...item,
      image: images[0],
      images,
      price,
      compareAtPrice: compareAt(price),
      supplierSku: data.productSku,
      cjVid: variant.vid,
      cjSku: variant.variantSku,
      listedNum: listed,
      ...social,
    };
  }
  return null;
}

const token = await getToken();
const usedPids = new Set();
const toAdd = [];
let fail = 0;

for (const item of TARGETS) {
  if (existingSlugs.has(item.slug)) {
    console.log("SKIP exists", item.slug);
    continue;
  }
  const mapped = await searchTop(token, item, usedPids);
  if (!mapped) {
    fail++;
    console.log("FAIL", item.slug);
    continue;
  }
  toAdd.push(mapped);
  console.log("OK", item.store, item.slug, `$${mapped.price.toFixed(2)}`, "listed:", mapped.listedNum);
}

if (!toAdd.length) {
  console.log(`Nothing new to add (${fail} failed).`);
  process.exit(0);
}

const blocks = [];
let idSource = source;
for (const entry of toAdd) {
  const id = assignId(idSource, entry.store);
  idSource += `\nid: "${id}"`;
  blocks.push(buildBlock(entry, id));
}

source = source.replace(
  /\n\];\n\nexport function getProductBySlug/,
  `,\n${blocks.join(",\n")}\n];\n\nexport function getProductBySlug`,
);
writeFileSync(productsPath, source);

const byStore = { pet: 0, home: 0, wellness: 0, tech: 0 };
for (const e of toAdd) byStore[e.store]++;
const total = [...source.matchAll(/slug: "/g)].length;

console.log(`\nAdded ${toAdd.length} products (${fail} failed)`);
console.log("NEW_BY_STORE", byStore);
console.log("TOTAL_SLUGS", total);
