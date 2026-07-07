/**
 * Live HTTP audit of every catalog image URL + duplicate-hero detection.
 * Usage: node scripts/audit-live-product-images.mjs
 */
import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { extractProductBlock } from "./lib/cj-catalog-lib.mjs";
import { defaultHiddenForSlug } from "./lib/catalog-visibility.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const productsPath = resolve(__dirname, "../src/data/products.ts");
const variantsPath = resolve(__dirname, "../src/data/product-variants.json");
const outPath = resolve(__dirname, "../src/data/catalog-image-live-audit.json");
const reportPath = resolve(__dirname, "../src/data/catalog-integrity-report.json");
const fallbackPath = resolve(__dirname, "../public/product-image-fallback.svg");

if (!existsSync(fallbackPath)) {
  console.error("✗ Missing public/product-image-fallback.svg");
  process.exit(1);
}


const source = readFileSync(productsPath, "utf8");
const variants = JSON.parse(readFileSync(variantsPath, "utf8"));
const slugs = [...source.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]);

const CONCURRENCY = 12;
const TIMEOUT_MS = 12000;

async function checkUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });
    if (res.status === 405 || res.status === 403) {
      const getRes = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: { Range: "bytes=0-0" },
      });
      return { ok: getRes.ok, status: getRes.status };
    }
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: e.message };
  } finally {
    clearTimeout(timer);
  }
}

async function mapPool(items, fn, limit) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function parseImages(block) {
  const image = block.match(/image: "(https:[^"]+)"/)?.[1];
  const imagesMatch = block.match(/images: \[([\s\S]*?)\]/);
  const images = imagesMatch
    ? [...imagesMatch[1].matchAll(/"(https:[^"]+)"/g)].map((m) => m[1])
    : [];
  return [...new Set([image, ...images].filter(Boolean))];
}

const products = [];
const urlToSlugs = new Map();

for (const slug of slugs) {
  const hit = extractProductBlock(source, slug);
  if (!hit) continue;
  const name = hit.block.match(/name: "([^"]+)"/)?.[1] || slug;
  const store = hit.block.match(/store: "([^"]+)"/)?.[1] || "";
  const catalogHidden = /catalogHidden:\s*true/.test(hit.block);
  const urls = parseImages(hit.block);
  const variantUrls = (variants[slug]?.variants ?? []).flatMap((v) => [
    v.image,
    ...(v.images ?? []),
  ]);
  const allUrls = [...new Set([...urls, ...variantUrls].filter((u) => typeof u === "string"))];

  for (const u of allUrls) {
    if (!urlToSlugs.has(u)) urlToSlugs.set(u, []);
    urlToSlugs.get(u).push(slug);
  }

  products.push({
    slug,
    name,
    store,
    catalogHidden,
    hidden: defaultHiddenForSlug(slug, catalogHidden),
    image: urls[0],
    urls: allUrls,
  });
}

const uniqueUrls = [...urlToSlugs.keys()];
console.log(`Checking ${uniqueUrls.length} unique image URLs across ${products.length} products...`);

const urlResults = new Map();
const checked = await mapPool(
  uniqueUrls,
  async (url) => {
    const result = await checkUrl(url);
    urlResults.set(url, result);
    process.stdout.write(result.ok ? "." : "x");
    return { url, ...result };
  },
  CONCURRENCY,
);
console.log("");

const issues = [];

for (const p of products) {
  const bad = p.urls.filter((u) => !urlResults.get(u)?.ok);
  const heroBroken = p.image ? !urlResults.get(p.image)?.ok : true;
  const workingAlts = p.urls.filter((u) => u !== p.image && urlResults.get(u)?.ok);
  const dupPeers = urlToSlugs.get(p.image)?.filter((s) => s !== p.slug) ?? [];
  const messages = [];

  if (!p.image) {
    messages.push("missing primary image");
  } else if (heroBroken) {
    messages.push(
      workingAlts.length
        ? `primary image broken — swap to alternate: ${workingAlts[0]}`
        : `primary image broken and no working alternate: ${p.image}`,
    );
  }
  if (bad.length) {
    messages.push(`${bad.length} broken URL(s): ${bad.slice(0, 2).join(", ")}`);
  }
  if (dupPeers.length && !p.hidden) {
    messages.push(`hero image shared with: ${dupPeers.join(", ")}`);
  }
  if (p.urls.length < 4 && !p.hidden) {
    messages.push(`only ${p.urls.length} image(s) — minimum 4 recommended`);
  }

  if (messages.length) {
    issues.push({
      slug: p.slug,
      name: p.name,
      store: p.store,
      hidden: p.hidden,
      level: heroBroken || bad.length || dupPeers.length ? "error" : "warn",
      messages,
      badUrls: bad,
      heroBroken,
      suggestedPrimary: heroBroken ? workingAlts[0] ?? null : null,
      dupPeers,
    });
  }
}

const visibleErrors = issues.filter((i) => i.level === "error" && !i.hidden);
const shouldHide = visibleErrors.map((i) => i.slug);

const summary = {
  auditedAt: new Date().toISOString(),
  totalProducts: products.length,
  uniqueUrls: uniqueUrls.length,
  brokenUrls: checked.filter((c) => !c.ok).length,
  issueCount: issues.length,
  visibleErrors: visibleErrors.length,
  visibleWarnings: issues.filter((i) => i.level === "warn" && !i.hidden).length,
  recommendHide: shouldHide,
};

writeFileSync(
  outPath,
  JSON.stringify({ summary, issues, brokenUrls: checked.filter((c) => !c.ok) }, null, 2),
);

// Update integrity report section
let integrity = { summary: {}, issues: [] };
try {
  integrity = JSON.parse(readFileSync(reportPath, "utf8"));
} catch {
  /* fresh */
}
integrity.imageLiveAudit = summary;
integrity.imageLiveIssues = issues.filter((i) => !i.hidden).slice(0, 50);
writeFileSync(reportPath, JSON.stringify(integrity, null, 2));

console.log("\nSUMMARY", summary);
if (visibleErrors.length) {
  console.log("\nVISIBLE ERRORS (hide or fix):");
  for (const i of visibleErrors.slice(0, 30)) {
    console.log(`  ✗ ${i.slug} — ${i.messages.join("; ")}`);
  }
}
if (shouldHide.length) {
  console.log("\nRECOMMEND ADD TO DEFAULT_HIDDEN_SLUGS:");
  console.log(shouldHide.map((s) => `  "${s}",`).join("\n"));
}

process.exit(visibleErrors.length ? 1 : 0);
