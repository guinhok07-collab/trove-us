/**
 * Testa consultor LLM (sem executar ações).
 * Usage: node --env-file=.env.local scripts/test-llm-advisor.mjs
 */
import { loadState } from "./lib/ads-auto-engine.mjs";
import { buildDashboardPayload } from "./lib/ads-dashboard-data.mjs";
import { consultLlmAdvisor } from "./lib/ads-llm-advisor.mjs";

const data = await buildDashboardPayload({ syncFirst: false, skipHealth: true });
const state = loadState();

const result = await consultLlmAdvisor(
  {
    ads: data.ads,
    totals: data.totals,
    weeklyBudget: data.weeklyBudget,
    deliveryAdvice: data.deliveryAdvice,
    placementAdvice: data.placementAdvice,
    metaRecs: data.metaRecommendations,
    review: { paused: [], boosted: [], scaled: [], intelLines: [] },
    state,
  },
  { dryRun: true },
);

if (!result.ok) {
  console.error("Falhou:", result.error ?? result.reason);
  process.exit(1);
}

console.log("\n🧠 Consultora LLM (teste)\n");
console.log(result.messageToOwner || result.briefing);
if (result.marketInsight) console.log("\n🌍 Mercado:", result.marketInsight);
if (result.creativePlans?.length) {
  console.log("\nCriativos sugeridos:");
  for (const c of result.creativePlans) {
    console.log(`  • ${c.slug} [${c.verdict}]: "${c.hook}" — ${c.angle}`);
  }
}
if (result.budgetAnalysis) {
  console.log("\nOrçamento:", result.budgetAnalysis.proposedChange || "sem mudança");
  if (result.budgetAnalysis.ifWeDoThis) console.log("  Se fizer:", result.budgetAnalysis.ifWeDoThis);
  if (result.budgetAnalysis.ifWeDont) console.log("  Se não:", result.budgetAnalysis.ifWeDont);
}
if (result.permissionRequest?.needed) {
  console.log("\n🔐 Permissão:", result.permissionRequest.ask);
}
if (result.actions?.length) {
  console.log("\nAções sugeridas:");
  for (const a of result.actions) {
    console.log(`  • ${a.action}${a.slug ? ` (${a.slug})` : ""}: ${a.reason}`);
  }
}
console.log("\nModelo:", result.model);
