/**
 * Sincroniza e aplica recomendações pendentes do Meta (Opportunity Score).
 * Usage:
 *   npm run ads:meta-recs           # aplica com guardrails
 *   npm run ads:meta-recs -- --dry-run
 *   npm run ads:meta-recs -- --list  # só lista, não aplica
 */
import { loadState, saveState } from "./lib/ads-auto-engine.mjs";
import { rankAds } from "./lib/ads-intelligence.mjs";
import {
  loadMetaRecommendationContext,
  processMetaRecommendations,
} from "./lib/meta-recommendation-executor.mjs";
import { isMetaAdsConfigured } from "./lib/meta-ads-api.mjs";
import { sendTelegramTyped } from "./lib/telegram-notify.mjs";

const dryRun = process.argv.includes("--dry-run");
const listOnly = process.argv.includes("--list");

if (!isMetaAdsConfigured()) {
  console.error("Meta API não configurada (.env.local)");
  process.exit(1);
}

const state = loadState();
const ctx = await loadMetaRecommendationContext(state);

console.log("═══ Meta Opportunity Score ═══");
console.log(`Score: ${ctx.opportunityScore ?? "—"}/100`);
console.log(`Pendentes: ${ctx.pendingCount ?? 0} (${ctx.autoApplyCount ?? 0} automatizável)`);
console.log("");

if (!ctx.ok) {
  console.error("Erro:", ctx.error);
  process.exit(1);
}

for (const rec of ctx.pending ?? []) {
  const mode = rec.canAuto ? rec.autoMode : "manual";
  const slugs = rec.slugs?.length ? ` [${rec.slugs.join(", ")}]` : "";
  console.log(`• ${rec.label}${slugs}`);
  console.log(`  modo: ${mode} · lift: ${rec.lift || "—"}`);
  if (rec.body) console.log(`  ${rec.body.slice(0, 120)}`);
}

if (listOnly) {
  process.exit(0);
}

const ads = Object.entries(state.ads ?? {}).map(([slug, meta]) => ({ slug, ...meta }));
const { top } = rankAds(ads);

console.log("");
console.log(dryRun ? "—— DRY RUN ——" : "—— Aplicando ——");

const result = await processMetaRecommendations({ state, dryRun, topAd: top });
for (const line of result.lines ?? []) {
  console.log(line);
}

if (!dryRun && result.ok) {
  const fresh = loadState();
  if (result.opportunityScore != null) fresh.lastOpportunityScore = result.opportunityScore;
  fresh.lastMetaRecsApplied = result.applied?.length ?? 0;
  fresh.lastWatch = new Date().toISOString();
  saveState(fresh);

  await sendTelegramTyped("meta", [
    `Score: ${result.opportunityScore ?? ctx.opportunityScore ?? "—"}/100`,
    `Aplicadas: ${result.applied?.length ?? 0} · Ignoradas: ${result.skipped?.length ?? 0}`,
    ...(result.lines?.length ? [result.lines.join("\n")] : []),
  ]);
}

console.log("");
console.log(`Aplicadas: ${result.applied?.length ?? 0} · Ignoradas: ${result.skipped?.length ?? 0}`);
process.exit(result.ok ? 0 : 1);
