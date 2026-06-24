/**
 * Fail if any VISIBLE product has CJ audit errors.
 * Run after: node --env-file=.env.local scripts/audit-catalog-cj.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { extractProductBlock } from "./lib/cj-catalog-lib.mjs";
import { defaultHiddenForSlug } from "./lib/catalog-visibility.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const auditPath = resolve(__dirname, "../src/data/catalog-cj-audit.json");
const productsPath = resolve(__dirname, "../src/data/products.ts");

if (!existsSync(auditPath)) {
  console.error("✗ Missing catalog-cj-audit.json — run audit-catalog-cj.mjs first");
  process.exit(1);
}

const { summary, issues = [] } = JSON.parse(readFileSync(auditPath, "utf8"));
const source = readFileSync(productsPath, "utf8");

function isHidden(slug) {
  const hit = extractProductBlock(source, slug);
  const catalogHidden = hit ? /catalogHidden:\s*true/.test(hit.block) : false;
  return defaultHiddenForSlug(slug, catalogHidden);
}

const visibleErrors = issues.filter((i) => i.level === "error" && !isHidden(i.slug));
const visibleMismatches = visibleErrors.filter((i) => i.types?.includes("name_mismatch"));

console.log(`\nCatalog integrity — audited ${summary.total}, visible errors ${visibleErrors.length}\n`);

if (visibleMismatches.length) {
  console.log("VISIBLE CJ MISMATCHES (must relink or hide):");
  for (const i of visibleMismatches) {
    console.log(`  ✗ ${i.slug} — ${i.messages?.[0]}`);
  }
}

if (visibleErrors.length) {
  const other = visibleErrors.filter((i) => !i.types?.includes("name_mismatch"));
  if (other.length) {
    console.log("\nOTHER VISIBLE ERRORS:");
    for (const i of other) {
      console.log(`  ✗ ${i.slug} — ${i.messages?.[0]}`);
    }
  }
  console.log("\nFAILED — loja visível não pode ter erro CJ. Relink com PID ou catalogHidden: true.\n");
  process.exit(1);
}

console.log("✓ Nenhum produto visível com erro CJ");
console.log("PASS — catálogo visível íntegro\n");
