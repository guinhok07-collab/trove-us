/**
 * Apply curated CJ restore data to products.ts + QA report
 * Usage: node scripts/apply-restore-curated.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

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
    name: "Under-Door Draft Stopper Seal",
    description: "Blocks cold air, dust, and noise from slipping under doors.",
    longDescription:
      "Cut drafts and noise with a flexible under-door seal that installs in minutes. Helps rooms stay warmer in winter and keeps dust from creeping through the gap. Trim-to-fit design works on interior doors throughout the home. Ships from our US warehouse in 3–5 business days.",
    features: ["Blocks drafts and dust", "Sound-dampening seal", "Fits standard doors", "Easy peel-and-stick install"],
    tags: [],
  },
  "bed-sheet-organizer": {
    name: "Bed Sheet & Bedding Organizer (2-Pack)",
    description: "Keeps folded sheet sets sorted in closets — no more lost pillowcases.",
    longDescription:
      "Stop digging through messy linen shelves. Foldable fabric bins keep full sheet sets together with room for labels so making the bed takes less time. Breathable material helps prevent musty closet smells. Ships from our US warehouse in 3–5 business days.",
    features: ["Keeps sets together", "Foldable fabric bins", "Label-friendly design", "Set of 2 organizers"],
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
    name: "Floor Meditation Cushion",
    description: "Comfortable floor seat for meditation, stretching, and low tables.",
    longDescription:
      "Sit comfortably during meditation or floor dining with a firm cushion that supports hips and posture. Removable cover washes easily after daily practice. Lightweight design moves easily between rooms. Ships from our US warehouse in 3–5 business days.",
    features: ["Firm posture support", "Removable washable cover", "Floor-friendly size", "Multiple colors"],
    tags: [],
  },
  "jade-roller-gua-sha": {
    name: "Jade Facial Roller",
    description: "Cooling facial roller for morning de-puff and self-care routines.",
    longDescription:
      "Refresh your skincare routine with a natural jade roller designed for gentle facial massage. Store in the fridge for an extra cooling effect after serums and moisturizers. Smooth stone glides without tugging delicate skin. Ships from our US warehouse in 3–5 business days.",
    features: ["Natural jade stone", "Double-head design", "Fridge-friendly cooling", "Gift-ready packaging"],
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
    features: ["One-swipe privacy", "Ultra-thin profile", "Strong adhesive mount", "Multi-device fit"],
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

function formatImages(images) {
  return JSON.stringify(images, null, 4)
    .split("\n")
    .map((line, idx) => (idx === 0 ? line : "      " + line.trim()))
    .join("\n");
}

function assignId(source, store) {
  const prefix = store === "wellness" ? "well" : store === "tech" ? "tech" : store;
  const nums = [...source.matchAll(new RegExp(`id: "${prefix}-(\\d+)"`, "g"))].map((m) => Number(m[1]));
  return `${prefix}-${(nums.length ? Math.max(...nums) : 0) + 1}`;
}

function buildBlock(entry, id) {
  const copy = DISPLAY[entry.slug];
  const tags = copy.tags?.length ? copy.tags : entry.price >= 35 ? ["free-shipping"] : [];
  return `  {
    id: "${id}",
    slug: "${entry.slug}",
    name: ${JSON.stringify(copy.name)},
    description: ${JSON.stringify(copy.description)},
    longDescription:
      ${JSON.stringify(copy.longDescription)},
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
    tags: ${JSON.stringify(tags)},
    features: ${JSON.stringify(copy.features)},
    supplierSku: ${JSON.stringify(entry.supplierSku)},
    cjVid: ${JSON.stringify(entry.cjVid)},
    cjSku: ${JSON.stringify(entry.cjSku)}
  }`;
}

const curated = JSON.parse(readFileSync(resolve(__dirname, "cj-restore-curated.json"), "utf8"));
const productsPath = resolve(__dirname, "../src/data/products.ts");
let source = readFileSync(productsPath, "utf8");
source = source.replace(/\},\s*,/g, "},");

const existing = new Set([...source.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]));
const toAdd = Object.values(curated).filter((e) => !existing.has(e.slug));

if (!toAdd.length) {
  console.log("All restore products already in catalog.");
} else {
  const blocks = [];
  let idSource = source;
  for (const entry of toAdd) {
    const id = assignId(idSource, entry.store);
    idSource += `\nid: "${id}"`;
    blocks.push(buildBlock(entry, id));
  }
  source = source.replace(/\n\];\n\nexport function getProductBySlug/, `,\n${blocks.join(",\n")}\n];\n\nexport function getProductBySlug`);
  writeFileSync(productsPath, source);
  console.log(`Added ${toAdd.length} products. Catalog: ${[...source.matchAll(/slug: "/g)].length}`);
}

const site = "https://trove-us.com";
const all = Object.values(curated);
const lines = [
  "# Trove — QA dos 11 produtos restaurados (CJ corrigido)",
  "",
  `Gerado: ${new Date().toISOString().slice(0, 10)}`,
  "",
  "**Catálogo:** 72 produtos (61 + 11 restaurados)",
  "",
  "## Links diretos — confira um por um",
  "",
  "| # | Produto loja | Link | Preço | Nome CJ (fulfillment) |",
  "|---|--------------|------|-------|------------------------|",
];

let n = 1;
for (const entry of all) {
  const copy = DISPLAY[entry.slug];
  lines.push(
    `| ${n++} | ${copy.name} | [Abrir](${site}/products/${entry.slug}) | $${entry.price.toFixed(2)} | ${entry.cjName.replace(/\|/g, "/").slice(0, 60)}… |`,
  );
}

lines.push(
  "",
  "## O que NÃO pode ter erro (checklist)",
  "",
  "### 1. Foto vs produto (CRÍTICO — motivo da remoção anterior)",
  "- Foto principal = **exatamente** o item vendido",
  "- ❌ Christmas tree no lugar de cat perch",
  "- ❌ Car cup holder no lugar de draft stopper",
  "- ❌ Dog water cup no lugar de silicone food bags",
  "- ❌ Crystal necklace no lugar de meditation cushion",
  "- ❌ Hair lint roller no lugar de jade roller ou muscle stick",
  "- ❌ Airtag dog collar no lugar de webcam cover",
  "- ❌ Camping lantern no lugar de monitor light bar",
  "",
  "### 2. Título e descrição",
  "- Inglês claro para cliente americano",
  "- ❌ Nome CJ com 80 palavras no título da loja (já limpo)",
  "- ❌ Mencionar dropshipping, CJ, China, warehouse tour",
  "",
  "### 3. Preço",
  "- Faz sentido vs Amazon (~$7–$25 para estes itens)",
  "- ⚠️ **Bed Sheet Organizer** está em $52.99 (CJ cost alto) — confirmar se OK",
  "- Frete grátis automático em pedidos ≥ $35",
  "",
  "### 4. Página do produto",
  "- Galeria carrega (3+ fotos)",
  "- Features batem com produto real",
  "- Add to cart funciona",
  "",
  "### 5. Checkout / CJ",
  "- Produto tem `cjVid` configurado",
  "- ❌ Erro \"Missing CJ configuration\" no checkout",
  "",
  "### 6. Observações por produto",
  "- **Jade Roller:** CJ é roller only (sem gua sha no kit) — nome da loja ajustado",
  "- **Meditation Cushion:** futon/tatami style floor cushion — não é zafu buckwheat clássico",
  "- **Door Draft:** tira de vedação (strip), não almofada pesada de tecido",
  "",
  "## URLs rápidas",
  "",
);

for (const entry of all) {
  lines.push(`- **${DISPLAY[entry.slug].name}:** ${site}/products/${entry.slug}`);
}

writeFileSync(resolve(__dirname, "../reports/cj-restore-qa.md"), lines.join("\n"));
console.log("QA: reports/cj-restore-qa.md");
