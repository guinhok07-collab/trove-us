/**
 * Gera relatório só com produtos visíveis sem erro CJ.
 * Usage: node scripts/generate-verified-catalog-report.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { extractProductBlock } from "./lib/cj-catalog-lib.mjs";
import { defaultHiddenForSlug } from "./lib/catalog-visibility.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const productsPath = resolve(__dirname, "../src/data/products.ts");
const auditPath = resolve(__dirname, "../src/data/catalog-cj-audit.json");
const outPath = resolve(__dirname, "../src/data/catalog-integrity-report.json");

const source = readFileSync(productsPath, "utf8");
const { summary: auditSummary, issues = [] } = JSON.parse(readFileSync(auditPath, "utf8"));

const slugs = [...source.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]);
const issueBySlug = new Map(issues.map((i) => [i.slug, i]));

const verified = [];
const hidden = [];
const withWarnings = [];

for (const slug of slugs) {
  const hit = extractProductBlock(source, slug);
  if (!hit) continue;
  const block = hit.block;
  const name = block.match(/name: "([^"]+)"/)?.[1] || slug;
  const store = block.match(/store: "([^"]+)"/)?.[1] || "";
  const catalogHidden = /catalogHidden:\s*true/.test(block);
  const hiddenFlag = defaultHiddenForSlug(slug, catalogHidden);
  const issue = issueBySlug.get(slug);

  if (hiddenFlag) {
    hidden.push({ slug, name, store, reason: issue?.messages?.[0] || "catalogHidden / sem match CJ" });
    continue;
  }

  if (issue?.level === "error") {
    hidden.push({ slug, name, store, reason: issue.messages?.[0] || "CJ error" });
    continue;
  }

  if (issue?.level === "warn") {
    withWarnings.push({ slug, name, store, warning: issue.messages?.[0] });
  }

  verified.push({
    slug,
    name,
    store,
    cjSku: block.match(/cjSku: "([^"]+)"/)?.[1],
    status: issue ? "live_warn" : "verified",
  });
}

const byStore = { pet: 0, home: 0, wellness: 0, tech: 0 };
for (const p of verified) {
  if (byStore[p.store] !== undefined) byStore[p.store]++;
}

const report = {
  updatedAt: new Date().toISOString(),
  policy: "Somente produtos visíveis sem erro CJ entram na loja. Sem PID verificado → oculto.",
  summary: {
    totalProducts: slugs.length,
    verifiedLive: verified.filter((p) => p.status === "verified").length,
    liveWithMinorWarnings: withWarnings.length,
    hidden: hidden.length,
    visibleErrors: auditSummary.visibleErrors ?? 0,
    byStore,
  },
  verifiedProducts: verified.filter((p) => p.status === "verified"),
  liveWithWarnings: withWarnings,
  hiddenProducts: hidden,
  deployGate: [
    "npm run catalog:check",
    "npm run catalog:audit",
    "npm run catalog:integrity",
    "npm run build",
  ],
  addProductWorkflow: [
    "node --env-file=.env.local scripts/hunt-tech-pids.mjs  (ou PID manual)",
    "node --env-file=.env.local scripts/expand-tech-catalog.mjs",
    "node scripts/generate-verified-catalog-report.mjs",
  ],
};

writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log("Report:", report.summary);
console.log("Written", outPath);
