/**
 * Aplica recomendações do Meta (Opportunity Score) com regras de segurança.
 * Inspirado em Madgicx / AdAdvisor: lê pendentes → aplica só o seguro.
 */
import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import {
  applyMetaRecommendation,
  fetchMetaRecommendations,
  getOpportunityScore,
  isMetaAdsConfigured,
  metaConfig,
  updateAdsetDailyBudget,
} from "./meta-ads-api.mjs";
import { translateMetaError } from "./meta-error-i18n.mjs";
import { appendLog } from "./ads-log.mjs";
import { getWeeklyBudgetContext, canIncreaseBudget } from "./ads-budget-weekly.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const statePath = resolve(root, "marketing/social/autopilot-state.json");

function loadState() {
  if (!existsSync(statePath)) return { ads: {} };
  return JSON.parse(readFileSync(statePath, "utf8"));
}

const AUTO_APPLY = process.env.META_REC_AUTO_APPLY !== "0";
const MAX_BUDGET_ADD_CENTS = Number(process.env.META_REC_MAX_BUDGET_INCREASE_CENTS ?? 1000);
const MAX_DAILY_BUDGET_CENTS = Number(process.env.META_AD_MAX_BUDGET_CENTS ?? 2000);
const ONLY_TOP_SCALE = process.env.META_REC_ONLY_WINNER_SCALE !== "0";
const MIN_TOP_SCORE = Number(process.env.META_REC_MIN_WINNER_SCORE ?? 55);

/** Tipos que podemos aplicar automaticamente (com guardrails). */
const AUTO_TYPES = new Set([
  "REELS_PC_RECOMMENDATION",
  "PERFORMANT_CREATIVE_REELS_OPT_IN",
  "MUSIC",
  "SCALE_GOOD_CAMPAIGN",
  "AUTOMATIC_PLACEMENTS",
  "UNCROP_IMAGE",
]);

const TYPE_LABELS = {
  REELS_PC_RECOMMENDATION: "Vídeo Reels 9:16",
  PERFORMANT_CREATIVE_REELS_OPT_IN: "Ativar placement Reels",
  MUSIC: "Adicionar música automática",
  SCALE_GOOD_CAMPAIGN: "Escalar budget (campanha boa)",
  AUTOMATIC_PLACEMENTS: "Placements automáticos",
  UNCROP_IMAGE: "Expandir imagem (uncrop)",
};

export function mapObjectIdsToSlugs(state, objectIds = []) {
  const slugs = new Set();
  for (const id of objectIds) {
    for (const [slug, meta] of Object.entries(state.ads ?? {})) {
      if (
        meta.adId === id ||
        meta.adsetId === id ||
        meta.campaignId === id ||
        meta.videoAdsetId === id
      ) {
        slugs.add(slug);
      }
    }
  }
  return [...slugs];
}

export function normalizeMetaRecommendations(raw = [], state = {}) {
  return raw.map((rec) => {
    const slugs = mapObjectIdsToSlugs(state, rec.object_ids ?? []);
    const canAuto = AUTO_TYPES.has(rec.type);
    const hasSignature = Boolean(rec.recommendation_signature);
    const needsCustom =
      rec.type === "REELS_PC_RECOMMENDATION" && !hasSignature;
    return {
      type: rec.type,
      label: TYPE_LABELS[rec.type] ?? rec.type,
      signature: rec.recommendation_signature ?? null,
      objectIds: rec.object_ids ?? [],
      slugs,
      lift: rec.recommendation_content?.lift_estimate ?? "",
      body: rec.recommendation_content?.body ?? "",
      scoreLift: Number(rec.recommendation_content?.opportunity_score_lift ?? 0),
      url: rec.url ?? null,
      canAuto,
      autoMode: hasSignature ? "meta_api" : needsCustom ? "custom_workflow" : "manual",
      stage: rec.recommendation_stage ?? "",
    };
  });
}

export async function loadMetaRecommendationContext(state) {
  if (!isMetaAdsConfigured()) {
    return { ok: false, error: "Meta não configurada" };
  }
  try {
    const [opportunityScore, raw] = await Promise.all([
      getOpportunityScore(),
      fetchMetaRecommendations(),
    ]);
    const pending = normalizeMetaRecommendations(raw, state);
    return {
      ok: true,
      opportunityScore,
      pending,
      pendingCount: pending.length,
      autoApplyCount: pending.filter((p) => p.canAuto).length,
    };
  } catch (err) {
    const pt = translateMetaError(err);
    return { ok: false, error: pt.message, opportunityScore: null, pending: [] };
  }
}

function publishVideoForSlug(slug, { dryRun }) {
  if (dryRun) return { ok: true, dryRun: true, slug };

  const r = spawnSync(
    process.execPath,
    [
      "--env-file=.env.local",
      resolve(root, "scripts/meta-ads-video-publish.mjs"),
      "--slug",
      slug,
    ],
    { cwd: root, encoding: "utf8", env: process.env },
  );
  return {
    ok: r.status === 0,
    slug,
    output: (r.stdout ?? "") + (r.stderr ?? ""),
  };
}

async function applyReelsRecommendation(rec, ctx) {
  const lines = [];
  const applied = [];

  if (!rec.slugs.length) {
    return { ok: false, reason: "sem slug mapeado", lines };
  }

  for (const slug of rec.slugs) {
    const meta = ctx.state.ads?.[slug];
    if (meta?.videoAdId) {
      lines.push(`⏭ ${slug} — vídeo Reels já publicado`);
      continue;
    }

    const file = meta?.file ?? slug;
    const webm = [
      resolve(root, `marketing/social/output/videos/${file}.webm`),
      resolve(root, `marketing/social/output/videos/${slug}.webm`),
    ].find((p) => existsSync(p));

    if (!webm) {
      lines.push(`🎬 ${slug} — gera vídeo (npm run social:pack) e reaplica`);
      if (!ctx.dryRun) {
        spawnSync(process.execPath, [resolve(root, "scripts/build-social-pack.mjs"), "3"], {
          cwd: root,
          stdio: "inherit",
          env: process.env,
        });
      }
    }

    if (ctx.dryRun) {
      lines.push(`🎬 [dry] Publicar Reels · ${slug}`);
      applied.push({ slug, type: rec.type, mode: "custom" });
      continue;
    }

    const result = publishVideoForSlug(slug, ctx);
    if (result.ok) {
      ctx.state = loadState();
      lines.push(`✅ Reels publicado · ${slug} (recomendação Meta)`);
      applied.push({ slug, type: rec.type, mode: "custom" });
      appendLog({ action: "meta_rec_reels", slug, type: rec.type });
    } else {
      lines.push(`⚠️ Falha Reels · ${slug}`);
    }
  }

  return { ok: applied.length > 0, lines, applied };
}

async function applySignatureRecommendation(rec, ctx) {
  if (!rec.signature) {
    return { ok: false, reason: "sem signature", lines: [`⏭ ${rec.label} — requer ação manual no Ads Manager`] };
  }

  const extra = {};
  if (rec.type === "MUSIC" && rec.objectIds.length) {
    extra.object_selection = rec.objectIds.join(",");
  }
  if (rec.type === "PERFORMANT_CREATIVE_REELS_OPT_IN" && rec.objectIds.length) {
    extra.object_selection = rec.objectIds.join(",");
  }

  if (rec.type === "SCALE_GOOD_CAMPAIGN") {
    if (ONLY_TOP_SCALE && ctx.topAd) {
      const topAdset = ctx.state.ads?.[ctx.topAd.slug]?.adsetId;
      if (!topAdset || !rec.objectIds.includes(topAdset)) {
        return {
          ok: false,
          reason: "scale bloqueado — só melhor score",
          lines: [`🛡️ Scale Meta bloqueado — só no anúncio com melhor score (${ctx.topAd.product})`],
        };
      }
      if ((ctx.topAd.intelligenceScore ?? 0) < MIN_TOP_SCORE) {
        return {
          ok: false,
          reason: "score baixo",
          lines: [`🛡️ Scale bloqueado — score ${ctx.topAd.intelligenceScore} < ${MIN_TOP_SCORE}`],
        };
      }
    }
    const add = Math.min(MAX_BUDGET_ADD_CENTS, 1000);
    const adsetId = rec.objectIds[0];
    const slug = mapObjectIdsToSlugs(ctx.state, [adsetId])[0];
    const meta = slug ? ctx.state.ads?.[slug] : null;
    const current = meta?.dailyBudgetCents ?? metaConfig().dailyBudgetCents;
    const weekly = await getWeeklyBudgetContext(ctx.state);
    const budgetCheck = canIncreaseBudget({ weeklyStatus: weekly, addDailyCents: add });
    if (!budgetCheck.ok) {
      return { ok: false, lines: [`🛡️ Scale Meta bloqueado — ${budgetCheck.reason}`] };
    }
    const next = Math.min(current + add, MAX_DAILY_BUDGET_CENTS, weekly.maxDailyCentsPerAd ?? current + add);
    if (next <= current) {
      return { ok: false, lines: [`🛡️ Budget já no teto para ${slug ?? adsetId}`] };
    }
    if (ctx.dryRun) {
      return {
        ok: true,
        lines: [`💰 [dry] Scale ${slug ?? adsetId}: $${(current / 100).toFixed(2)} → $${(next / 100).toFixed(2)}`],
        applied: [{ type: rec.type, slug, mode: "budget" }],
      };
    }
    await updateAdsetDailyBudget(adsetId, next);
    if (meta) meta.dailyBudgetCents = next;
    appendLog({ action: "meta_rec_scale", adsetId, slug, budgetCents: next });
    return {
      ok: true,
      lines: [`💰 Scale Meta aplicado · ${slug ?? adsetId} → $${(next / 100).toFixed(2)}/dia`],
      applied: [{ type: rec.type, slug, mode: "budget" }],
    };
  }

  if (ctx.dryRun) {
    return {
      ok: true,
      lines: [`✨ [dry] ${rec.label} via API Meta`],
      applied: [{ type: rec.type, mode: "meta_api" }],
    };
  }

  await applyMetaRecommendation(rec.signature, extra);
  appendLog({ action: "meta_rec_apply", type: rec.type, signature: rec.signature });
  return {
    ok: true,
    lines: [`✅ ${rec.label} aplicado via API Meta`],
    applied: [{ type: rec.type, mode: "meta_api" }],
  };
}

/**
 * Processa recomendações pendentes do Meta com regras de segurança.
 */
export async function processMetaRecommendations({ state, dryRun = false, topAd = null } = {}) {
  const ctx = await loadMetaRecommendationContext(state);
  const lines = [];
  const applied = [];
  const skipped = [];

  if (!ctx.ok) {
    const msg = ctx.error ?? "Não foi possível ler recomendações da Meta.";
    return { ok: false, error: msg, lines: [`⚠️ Recomendações Meta: ${msg}`], applied, skipped };
  }

  lines.push(
    `📋 Meta Opportunity Score: ${ctx.opportunityScore}/100 · ${ctx.pendingCount} pendente(s)`,
  );

  if (!ctx.pendingCount) {
    lines.push("✅ Nenhuma recomendação pendente no Meta");
    return { ok: true, opportunityScore: ctx.opportunityScore, pending: [], lines, applied, skipped };
  }

  if (!AUTO_APPLY && !dryRun) {
    lines.push("⏭ Auto-apply desligado (META_REC_AUTO_APPLY=0) — só listando");
    for (const rec of ctx.pending) {
      lines.push(`• ${rec.label}: ${rec.lift || rec.body.slice(0, 80)}`);
    }
    return {
      ok: true,
      opportunityScore: ctx.opportunityScore,
      pending: ctx.pending,
      lines,
      applied,
      skipped: ctx.pending,
    };
  }

  const execCtx = { state, dryRun, topAd };

  for (const rec of ctx.pending) {
    if (!rec.canAuto) {
      skipped.push(rec);
      lines.push(`⏭ ${rec.label} — não automatizável`);
      continue;
    }

    let result;
    if (rec.type === "REELS_PC_RECOMMENDATION" || rec.autoMode === "custom_workflow") {
      result = await applyReelsRecommendation(rec, execCtx);
    } else if (rec.autoMode === "meta_api") {
      result = await applySignatureRecommendation(rec, execCtx);
    } else {
      skipped.push(rec);
      lines.push(`⏭ ${rec.label} — manual (${rec.url ? "Ads Manager" : "sem URL"})`);
      continue;
    }

    lines.push(...(result.lines ?? []));
    if (result.applied) applied.push(...result.applied);
    if (!result.ok) skipped.push(rec);
  }

  return {
    ok: true,
    opportunityScore: ctx.opportunityScore,
    pending: ctx.pending,
    lines,
    applied,
    skipped,
  };
}
