/**
 * Full catalog audit vs CJ API — names, variants, prices, labels.
 * Usage: node --env-file=.env.local scripts/audit-catalog-cj.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  API,
  extractProductBlock,
  getToken,
  queryBySku,
  retailPrice,
  sleep,
} from "./lib/cj-catalog-lib.mjs";
import { variantLabel } from "./lib/variant-label.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const key = process.env.CJ_API_KEY;
if (!key) throw new Error("Set CJ_API_KEY");

const productsPath = resolve(__dirname, "../src/data/products.ts");
const variantsPath = resolve(__dirname, "../src/data/product-variants.json");
const outPath = resolve(__dirname, "../src/data/catalog-cj-audit.json");

const SHIP_BY_STORE = { pet: 4, home: 4, wellness: 3.5, tech: 3.5 };

const STOP = new Set([
  "the", "and", "for", "with", "from", "your", "our", "that", "this", "into",
  "set", "kit", "pack", "pair", "size", "inch", "free", "new", "best", "pro",
  "usb", "type", "mini", "plus", "ultra", "portable", "adjustable", "reusable",
  "silicone", "stainless", "steel", "plastic", "home", "daily", "quick", "easy",
]);

function tokens(...parts) {
  const text = parts.filter(Boolean).join(" ").toLowerCase();
  return [
    ...new Set(
      text
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/[\s-]+/)
        .filter((w) => w.length > 2 && !STOP.has(w)),
    ),
  ];
}

function overlapScore(a, b) {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  let hit = 0;
  for (const t of a) if (setB.has(t)) hit++;
  return hit / a.length;
}

function isSkuLabel(label) {
  return /^CJ[A-Z0-9]{8,}$/i.test(label?.replace(/[\s-]/g, "") ?? "");
}

function parseProducts(source) {
  const slugs = [...source.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]);
  return slugs.map((slug) => {
    const hit = extractProductBlock(source, slug);
    if (!hit) {
      return { slug, name: "", description: "", store: "", price: 0, cjSku: "", cjVid: "", supplierSku: "", features: [] };
    }
    const block = hit.block;
    const grab = (re) => block.match(re)?.[1];
    return {
      slug,
      name: grab(/name: "([^"]+)"/),
      description: grab(/description: "([^"]+)"/),
      store: grab(/store: "([^"]+)"/),
      catalogHidden: /catalogHidden:\s*true/.test(block),
      price: Number(grab(/price: ([\d.]+)/)),
      cjSku: grab(/cjSku: "([^"]+)"/),
      cjVid: grab(/cjVid: "([^"]+)"/),
      supplierSku: grab(/supplierSku: "([^"]+)"/),
      features: [...block.matchAll(/features: \[([\s\S]*?)\]/g)].flatMap((m) =>
        [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]),
      ),
    };
  });
}

function countCjSellableVariants(data) {
  const pool = (data.variants || []).filter((v) => Number(v.variantSellPrice) > 0);
  const use = pool.length ? pool : data.variants || [];
  const keys = new Set();
  for (const v of use) {
    const k = (v.variantKey || v.variantSku || v.vid || "").trim();
    if (k) keys.add(k);
  }
  return { total: use.length, distinct: keys.size, keys: [...keys] };
}

const source = readFileSync(productsPath, "utf8");
let variantCatalog = {};
try {
  variantCatalog = JSON.parse(readFileSync(variantsPath, "utf8"));
} catch {
  variantCatalog = {};
}

const products = parseProducts(source);
const token = await getToken(key);
const issues = [];
let ok = 0;

for (const p of products) {
  const msgs = [];
  const level = { critical: false, error: false, warn: false };
  const catalogVariants = variantCatalog[p.slug]?.variants ?? [];
  const shipDefault = SHIP_BY_STORE[p.store] ?? 3.5;

  if (!p.cjSku) {
    issues.push({
      slug: p.slug,
      name: p.name,
      level: "error",
      types: ["missing_cj"],
      messages: ["Sem cjSku — não envia pedido CJ"],
    });
    continue;
  }

  await sleep(1100);
  const hit = await queryBySku(token, p.cjSku);
  if (!hit?.data) {
    issues.push({
      slug: p.slug,
      name: p.name,
      level: "error",
      types: ["cj_not_found"],
      messages: [`CJ não encontrou SKU ${p.cjSku}`],
    });
    continue;
  }
  const data = hit.data;

  const cjName = data.productNameEn || "";
  const storeTokens = tokens(p.slug, p.name, p.description, ...p.features);
  const cjTokens = tokens(cjName);
  const score = overlapScore(storeTokens, cjTokens);

  const variantOnCj = data.variants?.find((v) => v.vid === p.cjVid || v.variantSku === p.cjSku);
  if (!variantOnCj) {
    level.error = true;
    msgs.push("cjVid/cjSku não existe mais neste produto CJ");
  }

  const slugParts = p.slug.split("-").filter((w) => w.length > 3);
  const cjLower = cjName.toLowerCase();
  const slugHits = slugParts.filter((w) => cjLower.includes(w)).length;
  const slugRatio = slugHits / Math.max(slugParts.length, 1);

  if (slugRatio < 0.34 && score < 0.15 && slugParts.length >= 1) {
    level.critical = true;
    msgs.push(`Produto CJ provavelmente errado (slug match ${Math.round(slugRatio * 100)}%)`);
    msgs.push(`Trove: ${p.name}`);
    msgs.push(`CJ: ${cjName.slice(0, 90)}`);
  } else if (slugRatio < 0.5 && score < 0.22 && slugParts.length >= 2) {
    level.warn = true;
    msgs.push(`Revise se CJ bate com anúncio (overlap ${Math.round(score * 100)}%)`);
    msgs.push(`CJ: ${cjName.slice(0, 80)}`);
  }

  const cjVars = countCjSellableVariants(data);
  const distinctCatalog = new Set(catalogVariants.map((v) => v.cjVid)).size;

  if (cjVars.distinct >= 2 && distinctCatalog < 2) {
    level.error = true;
    msgs.push(
      `CJ tem ${cjVars.distinct} variantes (${cjVars.keys.slice(0, 4).join(", ")}…) — loja só ${distinctCatalog}`,
    );
  }

  const badLabels = catalogVariants.filter(
    (v) =>
      !v.label ||
      v.label === "Default" ||
      v.label === "As picture" ||
      v.label === "As Picture" ||
      isSkuLabel(v.label),
  );
  if (badLabels.length) {
    level.warn = true;
    msgs.push(`${badLabels.length} variante(s) com label ruim (SKU/Default/As picture)`);
  }

  if (variantOnCj) {
    const cost = Number(variantOnCj.variantSellPrice ?? data.sellPrice ?? 0);
    const expected = retailPrice(cost, shipDefault);
    if (Math.abs(p.price - expected) > 0.02 && Math.abs(p.price - expected) / expected > 0.08) {
      level.warn = true;
      msgs.push(`Preço loja $${p.price} vs esperado $${expected.toFixed(2)} (custo CJ $${cost})`);
    }
  }

  const asPictureOnly =
    cjVars.distinct === 1 &&
    cjVars.keys.some((k) => /^as picture$/i.test(k)) &&
    catalogVariants.length <= 1;
  if (asPictureOnly && /color|colour|style|size|pack|set/i.test(p.name + p.description)) {
    level.warn = true;
    msgs.push('CJ só "As picture" — cliente não escolhe cor/tamanho');
  }

  if (msgs.length) {
    const types = [];
    if (level.critical) types.push("name_mismatch");
    if (cjVars.distinct >= 2 && distinctCatalog < 2) types.push("variant_gap");
    if (badLabels.length) types.push("bad_labels");
    if (msgs.some((m) => m.includes("Preço"))) types.push("price_drift");
    if (msgs.some((m) => m.includes("cjVid"))) types.push("stale_cj");
    if (asPictureOnly) types.push("as_picture_only");

    issues.push({
      slug: p.slug,
      name: p.name,
      store: p.store,
      catalogHidden: Boolean(p.catalogHidden),
      level: level.critical || level.error ? "error" : "warn",
      types,
      overlap: Math.round(score * 100),
      cjName: cjName.slice(0, 120),
      cjPid: data.pid,
      cjVariants: cjVars.distinct,
      catalogVariants: distinctCatalog,
      messages: msgs,
      autoFix: ["variant_gap", "bad_labels", "price_drift", "stale_cj"].some((t) =>
        types.includes(t),
      ),
    });
  } else {
    ok++;
  }
}

const summary = {
  auditedAt: new Date().toISOString(),
  total: products.length,
  ok,
  issueCount: issues.length,
  errors: issues.filter((i) => i.level === "error").length,
  warnings: issues.filter((i) => i.level === "warn").length,
  nameMismatch: issues.filter((i) => i.types?.includes("name_mismatch")).length,
  variantGap: issues.filter((i) => i.types?.includes("variant_gap")).length,
  autoFixable: issues.filter((i) => i.autoFix).length,
  visibleErrors: issues.filter((i) => i.level === "error" && !i.catalogHidden).length,
  visibleWarnings: issues.filter((i) => i.level === "warn" && !i.catalogHidden).length,
};

writeFileSync(outPath, JSON.stringify({ summary, issues }, null, 2));

console.log("CJ AUDIT", summary);
for (const item of issues.filter((i) => i.level === "error").slice(0, 25)) {
  console.log("ERROR", item.slug, "—", item.messages[0]);
}
for (const item of issues.filter((i) => i.types?.includes("name_mismatch")).slice(0, 15)) {
  console.log("MISMATCH", item.slug, item.overlap + "%", "—", item.cjName?.slice(0, 50));
}
if (issues.length > 25) console.log(`... +${issues.length - 25} more → catalog-cj-audit.json`);
