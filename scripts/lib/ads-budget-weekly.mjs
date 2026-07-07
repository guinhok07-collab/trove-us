/**
 * Orçamento semanal total — teto R$ 120 (configurável).
 */
import { getAdInsights, insightSpendBrl, isMetaAdsConfigured, metaConfig, currentWeekTimeRange } from "./meta-ads-api.mjs";

export function getWeeklyCapBrl() {
  return Number(process.env.META_WEEKLY_BUDGET_BRL ?? 120);
}

export function getWeeklyCapCents() {
  return Math.round(getWeeklyCapBrl() * 100);
}

/** @deprecated use getWeeklyCapBrl() */
export const WEEKLY_CAP_BRL = getWeeklyCapBrl();

export const WARN_PCT = Number(process.env.META_WEEKLY_WARN_PCT ?? 85);

/** Orçamento diário máximo por anúncio para respeitar o teto semanal. */
export function maxDailyBudgetCentsPerAd(activeCount = 1) {
  const n = Math.max(1, activeCount);
  return Math.floor(getWeeklyCapCents() / 7 / n);
}

export async function fetchWeeklySpend(adIds = []) {
  if (!isMetaAdsConfigured() || !adIds.length) {
    return { spendBrl: 0, byAd: new Map(), ok: false };
  }
  const insights = await getAdInsights(adIds, { timeRange: currentWeekTimeRange() });
  const byAd = new Map();
  let spendCents = 0;
  for (const ins of insights) {
    const cents = insightSpendBrl(ins);
    byAd.set(ins.ad_id, cents / 100);
    spendCents += cents;
  }
  return { spendBrl: spendCents / 100, byAd, ok: true };
}

export function buildWeeklyBudgetStatus({ spendBrl, activeCount, projectedDailyCents = 0 }) {
  const capBrl = getWeeklyCapBrl();
  const capCents = getWeeklyCapCents();
  const remainingBrl = Math.max(0, capBrl - spendBrl);
  const pct = capBrl > 0 ? Math.min(100, (spendBrl / capBrl) * 100) : 0;
  const maxDailyPerAd = maxDailyBudgetCentsPerAd(activeCount) / 100;
  const maxDailyTotal = (capCents / 7) / 100;
  const atCap = spendBrl >= capBrl;
  const nearCap = pct >= WARN_PCT;
  const blocked = atCap || (projectedDailyCents > 0 && spendBrl + (projectedDailyCents / 100) * 7 > capBrl);

  let status = "ok";
  if (atCap) status = "blocked";
  else if (nearCap) status = "warning";

  return {
    capBrl,
    spentBrl: spendBrl,
    remainingBrl,
    pct: Math.round(pct),
    maxDailyPerAdBrl: maxDailyPerAd,
    maxDailyTotalBrl: maxDailyTotal,
    activeCount,
    status,
    atCap,
    nearCap,
    blocked,
    label:
      status === "blocked"
        ? "Teto semanal atingido"
        : status === "warning"
          ? "Perto do teto semanal"
          : "Dentro do orçamento",
  };
}

/** Bloqueia aumento de budget se passar do teto semanal projetado. */
export function canIncreaseBudget({ weeklyStatus, addDailyCents = 0 }) {
  const capBrl = getWeeklyCapBrl();
  if (weeklyStatus.atCap) {
    return {
      ok: false,
      reason: `Teto R$ ${capBrl}/semana atingido (gasto R$ ${weeklyStatus.spentBrl.toFixed(2)})`,
      needsMoreBudget: true,
    };
  }
  const projectedWeek = weeklyStatus.spentBrl + (addDailyCents / 100) * 7;
  if (projectedWeek > capBrl) {
    return {
      ok: false,
      reason: `Aumento passaria de R$ ${capBrl}/semana (projeção R$ ${projectedWeek.toFixed(2)})`,
      needsMoreBudget: true,
    };
  }
  const maxDaily = maxDailyBudgetCentsPerAd(weeklyStatus.activeCount);
  if (addDailyCents > maxDaily) {
    return {
      ok: false,
      reason: `Máx R$ ${(maxDaily / 100).toFixed(2)}/dia por anúncio (teto semanal R$ ${capBrl})`,
      needsMoreBudget: false,
    };
  }
  return { ok: true };
}

export async function getWeeklyBudgetContext(state) {
  const adIds = Object.values(state.ads ?? {})
    .flatMap((m) => [m.adId, m.videoAdId].filter(Boolean));
  const activeCount = Object.values(state.ads ?? {}).filter((m) => m.status === "ACTIVE").length;
  const { spendBrl, byAd, ok } = await fetchWeeklySpend([...new Set(adIds)]);
  const status = buildWeeklyBudgetStatus({ spendBrl, activeCount });
  return { ...status, byAd, ok, maxDailyCentsPerAd: maxDailyBudgetCentsPerAd(activeCount) };
}

export function budgetAlertMessage(status, extra = "") {
  const lines = [`💰 Orçamento semanal Trove`, `Gasto: R$ ${status.spentBrl.toFixed(2)} / R$ ${status.capBrl}`, `Restante: R$ ${status.remainingBrl.toFixed(2)}`];
  if (extra) lines.push(extra);
  if (status.needsMoreBudget || status.atCap) {
    lines.push("", "⚠️ Para escalar mais, aumente o orçamento semanal em Configurações no painel.");
  }
  return lines.join("\n");
}
