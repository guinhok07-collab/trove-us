/**
 * Corrige placements Meta (miniatura em vídeos + recomendações).
 * Usage: node --env-file=.env.local scripts/ads-placement-fix.mjs [--dry-run]
 */
import { loadState, saveState } from "./lib/ads-auto-engine.mjs";
import { applyPlacementFixes } from "./lib/ads-placement-advisor.mjs";

const dryRun = process.argv.includes("--dry-run");

const state = loadState();
const result = await applyPlacementFixes({ state, saveState, dryRun });

console.log((result.lines ?? []).join("\n"));
if (result.advice?.issues?.length) {
  console.log("\n--- Diagnóstico ---");
  for (const i of result.advice.issues) {
    console.log(`${i.auto ? "🤖" : "👤"} ${i.title}`);
    console.log(`   ${i.detail}`);
    if (i.manual) console.log(`   → ${i.manual}`);
  }
}

process.exit(result.ok === false ? 1 : 0);
