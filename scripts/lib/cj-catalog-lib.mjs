/**
 * Shared CJ catalog utilities — single source of truth for add/sync/audit.
 */
import { variantLabel as parseVariantLabel, enrichVariantCatalog } from "./variant-label.mjs";

export { enrichVariantCatalog };
export const API = "https://developers.cjdropshipping.com/api2.0/v1";
export const TARGET_MARGIN = 0.2;
export const PAYPAL_RATE = 0.034;
export const MAX_RETAIL = 39.99;
export const MIN_IMAGES = 4;
export const MAX_IMAGES = 15;

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function parseImageField(value) {
  const out = [];
  if (!value) return out;
  if (Array.isArray(value)) {
    for (const item of value) out.push(...parseImageField(item));
    return out;
  }
  if (typeof value !== "string") return out;
  const trimmed = value.trim();
  if (trimmed.startsWith("http")) return [trimmed];
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      return parseImageField(JSON.parse(trimmed));
    } catch {
      return out;
    }
  }
  return out;
}

/** Preserve CJ API order — no re-sorting */
export function uniqueInOrder(urls) {
  const seen = new Set();
  const out = [];
  for (const u of urls) {
    if (typeof u !== "string" || !u.startsWith("http") || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

export function supplierImages(data, variant) {
  const productSet = parseImageField(data?.productImageSet);
  const fallback = [
    ...parseImageField(data?.bigImage),
    ...parseImageField(data?.productImage),
  ];
  const base = productSet.length ? productSet : fallback;
  const variantImgs = parseImageField(variant?.variantImage);
  return uniqueInOrder([...variantImgs, ...base]).slice(0, MAX_IMAGES);
}

export function extractVideo(data) {
  return typeof data?.productVideo === "string" && data.productVideo.startsWith("http")
    ? data.productVideo
    : undefined;
}

export function retailPrice(cost, shipping = 3.5) {
  const base = Number(cost) + Number(shipping);
  const raw = base / (1 - TARGET_MARGIN - PAYPAL_RATE);
  return Math.min(Math.max(Math.ceil(raw) - 0.01, base + 1.5), MAX_RETAIL);
}

export function compareAt(sell) {
  return Math.ceil(sell * 1.1) - 0.01;
}

export function variantLabel(variant, parentSku, productNameEn) {
  return parseVariantLabel(variant, parentSku, productNameEn);
}

export function okName(name, must, ban, { all = false } = {}) {
  const n = (name || "").toLowerCase();
  if (ban.some((b) => n.includes(b.toLowerCase()))) return false;
  if (all) return must.every((m) => n.includes(m.toLowerCase()));
  return must.some((m) => n.includes(m.toLowerCase()));
}

const MATCH_STOP = new Set([
  "the", "and", "for", "with", "from", "your", "our", "that", "this", "into",
  "set", "kit", "pack", "pair", "size", "inch", "free", "new", "best", "pro",
  "usb", "type", "mini", "plus", "ultra", "portable", "adjustable", "reusable",
  "silicone", "stainless", "steel", "plastic", "home", "daily", "quick", "easy",
]);

export function matchTokens(...parts) {
  const text = parts.filter(Boolean).join(" ").toLowerCase();
  return [
    ...new Set(
      text
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/[\s-]+/)
        .filter((w) => w.length > 2 && !MATCH_STOP.has(w)),
    ),
  ];
}

export function overlapScore(a, b) {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  let hit = 0;
  for (const t of a) if (setB.has(t)) hit++;
  return hit / a.length;
}

/** True when CJ product plausibly matches store listing (same rules as audit). */
export function cjMatchesListing(slug, listingName, listingDesc, features, cjName) {
  const storeTokens = matchTokens(slug.replace(/-/g, " "), listingName, listingDesc, ...(features || []));
  const cjTokens = matchTokens(cjName);
  const score = overlapScore(storeTokens, cjTokens);
  const nameTokens = matchTokens(listingName, slug.replace(/-/g, " "));
  const nameScore = overlapScore(nameTokens, cjTokens);
  const slugParts = slug.split("-").filter((w) => w.length > 3);
  const cjLower = (cjName || "").toLowerCase();
  const slugHits = slugParts.filter((w) => cjLower.includes(w)).length;
  const slugRatio = slugHits / Math.max(slugParts.length, 1);

  if (nameScore < 0.15) return { ok: false, score, slugRatio, nameScore };
  if (slugRatio >= 0.5 && nameScore >= 0.12) return { ok: true, score, slugRatio, nameScore };
  if (slugRatio >= 0.34 && score >= 0.18) return { ok: true, score, slugRatio, nameScore };
  if (nameScore >= 0.28) return { ok: true, score, slugRatio, nameScore };
  if (slugParts.length >= 2 && slugHits >= 2 && nameScore >= 0.18) return { ok: true, score, slugRatio, nameScore };
  return { ok: false, score, slugRatio, nameScore };
}

export function extractProductBlock(source, slug) {
  const needle = `slug: "${slug}"`;
  const idx = source.indexOf(needle);
  if (idx < 0) return null;

  // Only space indentation — \s+ would swallow blank lines and attach the wrong `{`.
  let start = -1;
  for (const m of source.slice(0, idx).matchAll(/\r?\n([ ]{2,8})\{/g)) {
    start = m.index;
  }
  if (start < 0) return null;

  const after = idx + needle.length;
  const nextMarkers = [
    source.indexOf("\n    slug:", after),
    source.indexOf("\r\n    slug:", after),
    source.indexOf("\n  {\r\n    id:", after),
    source.indexOf("\n  {\n    id:", after),
  ].filter((i) => i > idx);
  const next = nextMarkers.length ? Math.min(...nextMarkers) : -1;

  let end;
  if (next > idx) {
    end = source.lastIndexOf("\n  }", next);
    if (end < start) end = source.lastIndexOf("\r\n  }", next);
  } else {
    const closeArray = source.indexOf("\n];", idx);
    const bound = closeArray > 0 ? closeArray : source.length;
    end = source.lastIndexOf("\n  }", bound);
    if (end < start) end = source.lastIndexOf("\r\n  }", bound);
  }
  if (end <= start) return null;

  const block = source.slice(start, end);
  if (!block.includes(needle)) return null;
  return { block, start, end };
}

export function patchProductBlock(block, patches) {
  let out = block;
  for (const [field, re, value] of patches) {
    if (!re.test(out)) throw new Error(`Field ${field} not found in product block`);
    out = out.replace(re, value);
  }
  return out;
}

export function replaceProductBlock(source, slug, patchFn) {
  const hit = extractProductBlock(source, slug);
  if (!hit) throw new Error(`Product block not found: ${slug}`);
  const next = patchFn(hit.block);
  return source.slice(0, hit.start) + next + source.slice(hit.end);
}

export function formatImages(images) {
  return JSON.stringify(images, null, 4)
    .split("\n")
    .map((line, idx) => (idx === 0 ? line : "      " + line.trim()))
    .join("\n");
}

export function assignId(src, store) {
  const prefix = store === "wellness" ? "well" : store === "tech" ? "tech" : store;
  const nums = [...src.matchAll(new RegExp(`id: "${prefix}-(\\d+)"`, "g"))].map((m) => Number(m[1]));
  return `${prefix}-${(nums.length ? Math.max(...nums) : 0) + 1}`;
}

export function buildProductBlock(entry, id) {
  const videoLine = entry.video ? `\n    video: ${JSON.stringify(entry.video)},` : "";
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
    images: ${formatImages(entry.images)},${videoLine}
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

/** Media quality checks — returns warning strings for admin */
export function auditMedia({ slug, images = [], video, variantCount = 0, cjName = "" }) {
  const warnings = [];
  const imgs = images.filter((u) => typeof u === "string" && u.startsWith("http"));

  if (imgs.length < MIN_IMAGES) {
    warnings.push(`Poucas fotos (${imgs.length}/${MIN_IMAGES}) — revisar no CJ`);
  }
  if (imgs.length === 0) {
    warnings.push("Sem fotos válidas");
  }
  const tiny = imgs.filter((u) => u.includes("_trans") || u.endsWith(".png"));
  if (tiny.length >= imgs.length / 2 && imgs.length > 0) {
    warnings.push("Muitas imagens PNG/trans — podem não encaixar bem na galeria");
  }
  if (video && !video.startsWith("http")) {
    warnings.push("Vídeo inválido");
  }
  if (variantCount === 0) {
    warnings.push("Variantes não sincronizadas — rodar sync-all-variants");
  }
  const lower = (cjName || "").toLowerCase();
  if (lower.includes("cj dropshipping") || lower.includes("dropshipping")) {
    warnings.push("Nome CJ cru contém fornecedor — reescrever copy");
  }
  if (warnings.length) {
    return { slug, level: imgs.length < MIN_IMAGES ? "error" : "warn", messages: warnings };
  }
  return null;
}

export async function getToken(key) {
  const auth = await fetch(`${API}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: key }),
  }).then((r) => r.json());
  if (!auth.result) throw new Error(auth.message || "CJ auth failed");
  return auth.data.accessToken;
}

export async function queryBySku(token, cjSku) {
  await sleep(1100);
  const res = await fetch(`${API}/product/query?variantSku=${encodeURIComponent(cjSku)}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());
  if (!res.result) return null;
  const variant =
    res.data?.variants?.find((v) => v.variantSku === cjSku) ||
    res.data?.variants?.find((v) => Number(v.variantSellPrice) > 0) ||
    res.data?.variants?.[0];
  return { data: res.data, variant };
}

export async function queryPid(token, pid) {
  await sleep(1100);
  const res = await fetch(`${API}/product/query?pid=${encodeURIComponent(pid)}`, {
    headers: { "CJ-Access-Token": token },
  }).then((r) => r.json());
  return res.result ? res.data : null;
}

export function buildVariantsFromData(data, ship = 3.5) {
  const parentSku = data.productSku || "";
  const productNameEn = data.productNameEn || "";
  const sellable = (data.variants || []).filter((v) => Number(v.variantSellPrice) > 0);
  const pool = sellable.length ? sellable : data.variants || [];
  const variants = [];
  const seen = new Set();

  for (const v of pool) {
    if (!v?.vid || seen.has(v.vid)) continue;
    seen.add(v.vid);
    const images = supplierImages(data, v);
    if (!images.length) continue;
    const cost = Number(v.variantSellPrice ?? data.sellPrice ?? 0);
    const price = retailPrice(cost, ship);
    const key = (v.variantKey || "").trim();
    variants.push({
      id: v.vid,
      label: variantLabel(v, parentSku, productNameEn),
      cjVid: v.vid,
      cjSku: v.variantSku,
      price,
      compareAtPrice: compareAt(price),
      image: images[0],
      images,
      inStock: true,
      variantKey: key || undefined,
    });
  }
  return enrichVariantCatalog(variants, productNameEn);
}
