/**
 * Consultor de entrega — detecta zero impressões, excesso de anúncios e concentra budget.
 * Estilo orientação humana (IA local, regras + texto claro).
 */
import { setAdStatus, updateAdsetDailyBudget, metaConfig } from "./meta-ads-api.mjs";
import { maxDailyBudgetCentsPerAd, getWeeklyCapBrl } from "./ads-budget-weekly.mjs";
import { appendLog } from "./ads-log.mjs";

const TARGET_ACTIVE = Number(process.env.META_AD_TARGET_ACTIVE ?? 3);
const NO_DELIVERY_HOURS = Number(process.env.META_NO_DELIVERY_HOURS ?? 36);
const NO_DELIVERY_MAX_IMP = Number(process.env.META_NO_DELIVERY_MAX_IMP ?? 50);

function adAgeHours(meta) {
  if (!meta?.createdAt) return 0;
  return (Date.now() - new Date(meta.createdAt).getTime()) / 3600000;
}

/** Anúncios ativos com quase zero entrega há tempo suficiente. */
export function detectNoDelivery(ads = [], state = {}) {
  const active = ads.filter((a) => a.status === "ACTIVE");
  if (!active.length) return { noDelivery: false, activeCount: 0 };

  const stale = active.filter((a) => {
    const meta = state.ads?.[a.slug] ?? {};
    const imp = a.impressions ?? 0;
    const spend = a.spendBrl ?? 0;
    return imp <= NO_DELIVERY_MAX_IMP && spend === 0 && adAgeHours(meta) >= NO_DELIVERY_HOURS;
  });

  const allStale = stale.length === active.length && active.length > 0;
  const oldestH = Math.max(...active.map((a) => adAgeHours(state.ads?.[a.slug] ?? {})));

  return {
    noDelivery: allStale && oldestH >= NO_DELIVERY_HOURS,
    activeCount: active.length,
    staleCount: stale.length,
    oldestHours: Math.round(oldestH),
    slugs: stale.map((a) => a.slug),
  };
}

/** Quais manter (prioridade: mais antigos na campanha, depois score). */
export function pickAdsToKeep(activeAds = [], state = {}, target = TARGET_ACTIVE) {
  const ranked = [...activeAds].sort((a, b) => {
    const ageA = adAgeHours(state.ads?.[a.slug]);
    const ageB = adAgeHours(state.ads?.[b.slug]);
    if (ageB !== ageA) return ageB - ageA;
    return (b.intelligenceScore ?? 0) - (a.intelligenceScore ?? 0);
  });
  const keep = ranked.slice(0, target);
  const pause = ranked.slice(target);
  return { keep, pause, target };
}

export function buildDeliveryAdvice({ ads = [], totals = {}, state = {}, weeklyBudget = {} }) {
  const active = ads.filter((a) => a.status === "ACTIVE");
  const delivery = detectNoDelivery(ads, state);
  const target = Number(process.env.META_AD_TARGET_ACTIVE ?? TARGET_ACTIVE);
  const excess = active.length > target;
  const { keep, pause } = excess ? pickAdsToKeep(active, state, target) : { keep: active, pause: [] };

  const maxDailyPerAd = maxDailyBudgetCentsPerAd(Math.max(1, Math.min(target, keep.length))) / 100;
  const insights = [];
  const actions = [];

  if (delivery.noDelivery) {
    insights.push({
      type: "error",
      title: "Sem entrega no Meta",
      detail: `${active.length} anúncio(s) ativo(s) há ${delivery.oldestHours}h+ com ~0 impressões e R$ 0 gasto. Isso não é “aprendizado” — o budget está diluído ou a conta precisa de foco.`,
    });
    insights.push({
      type: "warn",
      title: "O que a IA recomenda",
      detail: `Manter só ${target} anúncio(s) (~R$ ${maxDailyPerAd.toFixed(2)}/dia cada no teto R$ ${getWeeklyCapBrl()}/semana) e pausar o resto. Mercado EUA exige budget concentrado.`,
    });
  } else if (excess) {
    insights.push({
      type: "warn",
      title: `${active.length} anúncios competindo`,
      detail: `Ideal: ${target} ativos. Sobram ${pause.length} — autopilot pode pausar os mais novos e concentrar orçamento.`,
    });
  }

  if (delivery.noDelivery || excess) {
    actions.push({
      id: "consolidate",
      title: `Concentrar em ${target} anúncio(s)`,
      detail: pause.length
        ? `Manter: ${keep.map((a) => a.product || a.slug).join(", ")} · Pausar: ${pause.map((a) => a.product || a.slug).join(", ")}`
        : `Ajustar orçamento diário nos ${keep.length} ativos`,
      applyAction: "consolidate",
      button: "Aplicar agora",
      priority: 99,
      auto: true,
      keep: keep.map((a) => a.slug),
      pause: pause.map((a) => a.slug),
    });
  }

  if (totals.spend === 0 && totals.clicks === 0 && active.length > 0 && !delivery.noDelivery) {
    insights.push({
      type: "info",
      title: "Fase inicial",
      detail: `${active.length} anúncio(s) no ar — aguardando primeiras impressões (até ${NO_DELIVERY_HOURS}h é normal).`,
    });
  }

  return {
    delivery,
    excess,
    target,
    keep: keep.map((a) => a.slug),
    pause: pause.map((a) => a.slug),
    maxDailyPerAdBrl: maxDailyPerAd,
    insights,
    actions,
  };
}

/** Pausa excesso e opcionalmente sobe budget dos que ficam. */
export async function applyConsolidation({ state, ads = [], dryRun = false, target = TARGET_ACTIVE } = {}) {
  const active = ads.filter((a) => a.status === "ACTIVE");
  const { keep, pause } = pickAdsToKeep(active, state, target);
  const paused = [];
  const budgetUpdated = [];
  const lines = [];

  for (const ad of pause) {
    const meta = state.ads?.[ad.slug];
    if (!meta?.adId) continue;
    lines.push(`⏸ Pausar ${ad.slug} — concentrar budget nos ${target} principais`);
    if (!dryRun) {
      await setAdStatus(meta.adId, "PAUSED");
      meta.status = "PAUSED";
      meta.pausedAt = new Date().toISOString();
      meta.pauseReason = "IA: concentrar budget (excesso de anúncios / sem entrega)";
      if (meta.videoAdId) {
        try {
          await setAdStatus(meta.videoAdId, "PAUSED");
        } catch {
          /* ignore */
        }
      }
      appendLog({ action: "consolidate_pause", slug: ad.slug, reason: meta.pauseReason });
    }
    paused.push(ad.slug);
  }

  const capCents = maxDailyBudgetCentsPerAd(keep.length);
  let cfgDaily = 1000;
  try {
    cfgDaily = metaConfig().dailyBudgetCents;
  } catch {
    /* ignore */
  }
  for (const ad of keep) {
    const meta = state.ads?.[ad.slug];
    if (!meta?.adsetId || dryRun) continue;
    const current = meta.dailyBudgetCents ?? cfgDaily;
    const target = capCents;
    if (target !== current) {
      await updateAdsetDailyBudget(meta.adsetId, target);
      meta.dailyBudgetCents = target;
      budgetUpdated.push(ad.slug);
      lines.push(
        `💰 ${ad.slug} — orçamento R$ ${(current / 100).toFixed(2)} → R$ ${(target / 100).toFixed(2)}/dia (foco semanal)`,
      );
      appendLog({ action: "consolidate_budget", slug: ad.slug, budgetCents: target });
    }
  }

  return { ok: true, paused, kept: keep.map((a) => a.slug), budgetUpdated, lines, dryRun };
}
