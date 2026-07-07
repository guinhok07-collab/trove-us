/**
 * Aplica ações do AI Marketer (1 clique).
 */
import { setAdStatus, isMetaAdsConfigured } from "./meta-ads-api.mjs";
import { pauseEmptyTroveCampaigns } from "./meta-campaigns.mjs";
import { loadState, saveState } from "./ads-auto-engine.mjs";
import { processMetaRecommendations } from "./meta-recommendation-executor.mjs";
import { rankAds } from "./ads-intelligence.mjs";

import { applyConsolidation } from "./ads-delivery-advisor.mjs";
import { applyPlacementFixes } from "./ads-placement-advisor.mjs";

export async function applyMarketerAction(action, { slug, adId } = {}) {
  if (!isMetaAdsConfigured()) {
    throw new Error("Meta API não configurada");
  }

  switch (action) {
    case "cleanup": {
      const state = loadState();
      const r = await pauseEmptyTroveCampaigns(state.campaignId, { dryRun: false });
      return { ok: true, message: `${r.paused?.length ?? 0} campanha(s) vazia(s) pausada(s)` };
    }

    case "pause": {
      const state = loadState();
      const meta = slug ? state.ads?.[slug] : null;
      const id = adId ?? meta?.adId;
      if (!id) throw new Error("Anúncio não encontrado");
      await setAdStatus(id, "PAUSED");
      if (meta) {
        meta.status = "PAUSED";
        meta.pausedAt = new Date().toISOString();
        meta.pauseReason = "AI Marketer (1 clique)";
        saveState(state);
      }
      return { ok: true, message: "Anúncio pausado no Meta" };
    }

    case "consolidate": {
      const state = loadState();
      const ads = Object.entries(state.ads ?? {}).map(([s, meta]) => ({
        slug: s,
        product: meta.product,
        status: meta.status,
        intelligenceScore: meta.intelligenceScore,
      }));
      const result = await applyConsolidation({ state, ads, dryRun: false });
      saveState(state);
      const parts = [];
      if (result.paused.length) parts.push(`${result.paused.length} pausado(s)`);
      parts.push(`${result.kept.length} mantido(s)`);
      if (result.budgetUpdated.length) parts.push(`budget ↑ em ${result.budgetUpdated.length}`);
      return { ok: true, message: `Concentração aplicada: ${parts.join(" · ")}` };
    }

    case "meta-recs": {
      const state = loadState();
      const ads = Object.entries(state.ads ?? {}).map(([slug, meta]) => ({ slug, ...meta }));
      const { top } = rankAds(ads);
      const result = await processMetaRecommendations({ state, dryRun: false, topAd: top });
      const fresh = loadState();
      if (result.opportunityScore != null) {
        fresh.lastOpportunityScore = result.opportunityScore;
      }
      fresh.lastMetaRecsApplied = result.applied?.length ?? 0;
      fresh.lastWatch = new Date().toISOString();
      saveState(fresh);
      const applied = result.applied?.length ?? 0;
      const skipped = result.skipped?.length ?? 0;
      if (!result.ok) {
        return {
          ok: false,
          error: result.error ?? "Não foi possível aplicar recomendações Meta.",
        };
      }
      return {
        ok: true,
        message:
          applied > 0
            ? `${applied} recomendação(ões) Meta aplicada(s)${skipped ? ` · ${skipped} ignorada(s)` : ""}`
            : skipped
              ? `${skipped} recomendação(ões) pendente(s) — nada aplicável agora`
              : "Meta OK — nenhuma recomendação pendente",
      };
    }

    case "placement-fix": {
      const state = loadState();
      const ads = Object.entries(state.ads ?? {}).map(([slug, meta]) => ({ slug, ...meta }));
      const { top } = rankAds(ads);
      const result = await applyPlacementFixes({
        state,
        saveState,
        dryRun: false,
        topAd: top,
      });
      const fresh = loadState();
      fresh.lastPlacementFixAt = new Date().toISOString();
      fresh.lastMetaRecsApplied =
        (fresh.lastMetaRecsApplied ?? 0) + (result.applied?.length ?? 0);
      saveState(fresh);
      const n = result.applied?.length ?? 0;
      const manual = result.advice?.manualCount ?? 0;
      return {
        ok: result.ok !== false,
        message:
          n > 0
            ? `${n} correção(ões) de placement aplicada(s)${manual ? ` · ${manual} manual no Ads Manager` : ""}`
            : manual
              ? `Nada automático agora — ${manual} passo(s) manual(is) listados no painel IA`
              : "Placements OK — sem correções necessárias",
      };
    }

    case "optimize":
    case "watch":
    case "autopilot":
      return { ok: true, async: true, script: action === "watch" ? "watch" : action === "autopilot" ? "autopilot" : "optimize" };

    default:
      throw new Error("Ação inválida");
  }
}
