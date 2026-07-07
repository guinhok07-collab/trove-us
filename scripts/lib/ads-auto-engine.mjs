/**
 * Motor automático — busca métricas, pausa ruins, impulsiona bons, cria novos.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import {
  getAdInsights,
  setAdStatus,
  updateAdsetDailyBudget,
  extractAction,
  insightSpendBrl,
  isMetaAdsConfigured,
  metaConfig,
  extractPurchases,
  verifyMetaToken,
} from "./meta-ads-api.mjs";
import { sendWatchTelegram } from "./telegram-notify.mjs";
import { loadDashboardData } from "./ads-dashboard-data.mjs";
import { detectFatigue, loadMetricsHistory } from "./ads-fatigue.mjs";
import { rankAds, intelligenceSummary, scoreAd } from "./ads-intelligence.mjs";
import { getSalesByProductSlug } from "./trove-orders-stats.mjs";
import { processMetaRecommendations } from "./meta-recommendation-executor.mjs";
import { appendLog } from "./ads-log.mjs";
import {
  getWeeklyBudgetContext,
  canIncreaseBudget,
  maxDailyBudgetCentsPerAd,
  getWeeklyCapBrl,
} from "./ads-budget-weekly.mjs";
import {
  buildDeliveryAdvice,
  applyConsolidation,
  detectNoDelivery,
} from "./ads-delivery-advisor.mjs";
import {
  buildPlacementAdvice,
  applyPlacementFixes,
} from "./ads-placement-advisor.mjs";
import { bootstrapAutopilotBrain } from "./ads-autopilot-brain.mjs";

const AUTO_CONSOLIDATE = process.env.META_AUTO_CONSOLIDATE !== "0";

export { appendLog } from "./ads-log.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const statePath = resolve(root, "marketing/social/autopilot-state.json");
const historyPath = resolve(root, "marketing/social/metrics-history.json");
const logPath = resolve(root, "marketing/social/autopilot-log.jsonl");

const PAUSE_SPEND_CENTS = Number(process.env.META_AD_PAUSE_SPEND_CENTS ?? 1500);
const MIN_IMPRESSIONS = Number(process.env.META_AD_MIN_IMPRESSIONS ?? 400);
const MIN_CTR = Number(process.env.META_AD_MIN_CTR ?? 0.25);
const TARGET_ACTIVE = Number(process.env.META_AD_TARGET_ACTIVE ?? 3);
const AUTO_BOOST = process.env.META_AD_AUTO_BOOST !== "0";
const BOOST_MIN_CLICKS = Number(process.env.META_AD_BOOST_MIN_CLICKS ?? 5);
const BOOST_BUDGET_ADD_CENTS = Number(process.env.META_AD_BOOST_BUDGET_ADD_CENTS ?? 500);
const MAX_BUDGET_CENTS = Number(process.env.META_AD_MAX_BUDGET_CENTS ?? 2000);
const WINNER_BOOST_CENTS = Number(process.env.META_AD_WINNER_BOOST_CENTS ?? 1000);
const SMART_PAUSE = process.env.META_AD_SMART_PAUSE !== "0";
const WINNER_REBOOST_HOURS = Number(process.env.META_AD_WINNER_REBOOST_HOURS ?? 48);

export function loadState() {
  if (!existsSync(statePath)) return { ads: {}, lastRun: null, lastReview: null, lastWatch: null };
  return JSON.parse(readFileSync(statePath, "utf8"));
}

export function saveState(state) {
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, JSON.stringify(state, null, 2), "utf8");
}

function saveMetricsSnapshot(rows) {
  mkdirSync(dirname(historyPath), { recursive: true });
  let history = { snapshots: [] };
  if (existsSync(historyPath)) {
    try {
      history = JSON.parse(readFileSync(historyPath, "utf8"));
    } catch {
      history = { snapshots: [] };
    }
  }
  history.snapshots.push({ at: new Date().toISOString(), ads: rows });
  history.snapshots = history.snapshots.slice(-96);
  writeFileSync(historyPath, JSON.stringify(history, null, 2), "utf8");
}

export async function fetchMetrics(state) {
  const entries = Object.entries(state.ads ?? {}).filter(([, v]) => v.adId);
  if (!entries.length) return [];

  const tokenCheck = await verifyMetaToken();
  if (!tokenCheck.ok) {
    throw new Error(
      tokenCheck.expired
        ? `Token Meta EXPIROU — renove em business.facebook.com → Configurações → Token. ${tokenCheck.error}`
        : tokenCheck.error ?? "Token Meta inválido",
    );
  }

  const insights = await getAdInsights(
    entries.map(([, v]) => v.adId),
    { datePreset: "last_7d" },
  );
  const byAdId = new Map(insights.map((i) => [i.ad_id, i]));

  return entries.map(([slug, meta]) => {
    const ins = byAdId.get(meta.adId);
    const spendCents = ins ? insightSpendBrl(ins) : 0;
    const linkClicks = ins ? extractAction(ins, "link_click") || Number(ins.clicks ?? 0) : 0;
    const purchases = ins ? extractPurchases(ins) : 0;
    return {
      slug,
      adId: meta.adId,
      adsetId: meta.adsetId,
      product: meta.product,
      status: meta.status,
      spendBrl: spendCents / 100,
      impressions: ins ? Number(ins.impressions ?? 0) : 0,
      linkClicks,
      purchases,
      ctr: ins ? Number(ins.ctr ?? 0) : 0,
    };
  });
}

export async function reviewAndAdjust({ dryRun = false, cautious = null } = {}) {
  if (!isMetaAdsConfigured()) {
    throw new Error("Meta API não configurada");
  }

  const cautiousMode = cautious ?? await (await import("./ads-cautious-mode.mjs")).getCautiousMode();
  const mode = await Promise.resolve(cautiousMode);

  const state = loadState();
  const metrics = await fetchMetrics(state);
  saveMetricsSnapshot(metrics);

  const siteSales = await getSalesByProductSlug();
  const enriched = metrics.map((m) => {
    const site = siteSales.bySlug[m.slug] ?? { orders: 0, revenue: 0 };
    const salesTotal = (m.purchases ?? 0) + site.orders;
    const spend = m.spendBrl ?? 0;
    const roas = spend > 0 ? (site.revenue + 0) / spend : salesTotal > 0 ? 1 : 0;
    return {
      ...m,
      siteOrders: site.orders,
      siteRevenue: site.revenue,
      salesTotal,
      roas,
      status: state.ads[m.slug]?.status ?? m.status,
    };
  });

  const { top, bottom } = rankAds(enriched);

  const weeklyBudget = await getWeeklyBudgetContext(state);
  const paused = [];
  const kept = [];
  const boosted = [];
  const rotated = [];
  const scaled = [];
  const report = [];
  const consolidated = [];

  if (mode.active) {
    report.push(`🛡️ ${mode.headline}`);
    report.push(`   Permito: ${mode.allows.join(" · ")}`);
    if (mode.blocks.length) report.push(`   Bloqueado: ${mode.blocks.join(" · ")}`);
  }

  const deliveryAdvice = buildDeliveryAdvice({
    ads: enriched.map((m) => ({
      slug: m.slug,
      product: m.product,
      status: state.ads[m.slug]?.status ?? m.status,
      impressions: m.impressions,
      spendBrl: m.spendBrl,
      intelligenceScore: state.ads[m.slug]?.intelligenceScore,
    })),
    totals: {
      active: enriched.filter((m) => state.ads[m.slug]?.status === "ACTIVE").length,
      spend: enriched.reduce((s, m) => s + m.spendBrl, 0),
      clicks: enriched.reduce((s, m) => s + m.linkClicks, 0),
    },
    state,
    weeklyBudget,
  });

  if (
    AUTO_CONSOLIDATE &&
    (deliveryAdvice.delivery.noDelivery || deliveryAdvice.excess) &&
    deliveryAdvice.pause.length
  ) {
    report.push("🎯 IA: concentrar budget — pausando anúncios extras");
    const result = await applyConsolidation({
      state,
      ads: enriched.map((m) => ({
        slug: m.slug,
        product: m.product,
        status: state.ads[m.slug]?.status,
        intelligenceScore: state.ads[m.slug]?.intelligenceScore,
      })),
      dryRun,
    });
    report.push(...result.lines);
    consolidated.push(...result.paused);
    paused.push(...result.paused);
    for (const slug of result.paused) {
      const m = enriched.find((x) => x.slug === slug);
      if (m) m.status = "PAUSED";
    }
  }

  if (weeklyBudget.atCap && !dryRun) {
    report.push(`🛡️ Teto semanal R$ ${getWeeklyCapBrl()} atingido — sem aumentos de budget`);
  } else if (weeklyBudget.nearCap) {
    report.push(`⚠️ Orçamento semanal ${weeklyBudget.pct}% usado (R$ ${weeklyBudget.spentBrl.toFixed(2)} / R$ ${weeklyBudget.capBrl})`);
  }

  const history = loadMetricsHistory(historyPath);
  const fatigue = detectFatigue({ metrics, history, stateAds: state.ads ?? {} });

  for (const m of enriched) {
    const meta = state.ads[m.slug];
    if (!meta) continue;

    if (meta.status === "PAUSED") {
      report.push(`⏸ ${m.slug} — pausado`);
      continue;
    }

    const fatigueHit = fatigue.fatigued.find((f) => f.slug === m.slug);
    if (fatigueHit) {
      const line = `${m.product}: R$${m.spendBrl.toFixed(2)} · ${m.impressions} imp · CTR ${m.ctr.toFixed(2)}%`;
      report.push(`🔄 FADIGA ${m.slug} — ${fatigueHit.reason}\n   ${line}`);
      if (!dryRun) {
        await setAdStatus(meta.adId, "PAUSED");
        meta.status = "PAUSED";
        meta.pausedAt = new Date().toISOString();
        meta.pauseReason = fatigueHit.reason;
        meta.fatigueRotated = true;
        appendLog({ action: "fatigue_pause", slug: m.slug, reason: fatigueHit.reason, metrics: m });
      }
      paused.push(m.slug);
      rotated.push(m.slug);
      continue;
    }

    if (!m.impressions && !m.spendBrl) {
      const ageH = (Date.now() - new Date(meta.createdAt ?? 0).getTime()) / 3600000;
      const label =
        ageH >= Number(process.env.META_NO_DELIVERY_HOURS ?? 36)
          ? "sem entrega — aguardando foco de budget"
          : "início — aguardando impressões";
      report.push(`⏳ ${m.slug} — ${label}`);
      kept.push(m.slug);
      continue;
    }

    const spendCents = Math.round(m.spendBrl * 100);
    const intelScore = scoreAd(m);
    let pauseReason = null;

    if (
      SMART_PAUSE &&
      bottom?.slug === m.slug &&
      top &&
      top.slug !== m.slug &&
      intelScore < 30 &&
      spendCents >= PAUSE_SPEND_CENTS &&
      m.linkClicks === 0
    ) {
      pauseReason = `Score ${intelScore} — bem abaixo da média (top: ${top.intelligenceScore})`;
    } else if (spendCents >= PAUSE_SPEND_CENTS && m.linkClicks === 0) {
      pauseReason = `R$${m.spendBrl.toFixed(2)} sem cliques`;
    } else if (m.impressions >= MIN_IMPRESSIONS && m.ctr < MIN_CTR) {
      pauseReason = `CTR ${m.ctr.toFixed(2)}% baixo`;
    }

    const line = `${m.product}: R$${m.spendBrl.toFixed(2)} · ${m.impressions} imp · ${m.linkClicks} cliques · ${m.purchases ?? 0} vendas pixel`;

    if (pauseReason) {
      report.push(`🔴 PAUSAR ${m.slug} — ${pauseReason}\n   ${line}`);
      if (!dryRun) {
        await setAdStatus(meta.adId, "PAUSED");
        meta.status = "PAUSED";
        meta.pausedAt = new Date().toISOString();
        meta.pauseReason = pauseReason;
        appendLog({ action: "pause", slug: m.slug, reason: pauseReason, metrics: m });
      }
      paused.push(m.slug);
      continue;
    }

    report.push(`🟢 MANTER ${m.slug} · score ${intelScore}\n   ${line}`);
    kept.push(m.slug);

    meta.intelligenceScore = intelScore;
    meta.lastIntelligenceAt = new Date().toISOString();

    const isTopAd = top?.slug === m.slug;
    const lastBoost = meta.lastBoostAt ? new Date(meta.lastBoostAt).getTime() : 0;
    const hoursSinceBoost = (Date.now() - lastBoost) / 3600000;
    const canReboost = !lastBoost || hoursSinceBoost >= WINNER_REBOOST_HOURS;

    if (AUTO_BOOST && !dryRun && meta.adsetId && canReboost && mode.policy.boost) {
      const current = meta.dailyBudgetCents ?? metaConfig().dailyBudgetCents;
      let addCents = 0;
      let boostType = null;

      if (isTopAd && (m.salesTotal > 0 || (m.linkClicks >= 3 && m.ctr >= 0.5))) {
        addCents = WINNER_BOOST_CENTS;
        boostType = "top";
      } else if (m.linkClicks >= BOOST_MIN_CLICKS && m.ctr >= 0.8) {
        addCents = BOOST_BUDGET_ADD_CENTS;
        boostType = "standard";
      } else if (m.linkClicks >= 3 && m.ctr >= 0.5 && intelScore >= 55) {
        addCents = BOOST_BUDGET_ADD_CENTS;
        boostType = "contender";
      }

      if (addCents > 0) {
        const budgetCheck = canIncreaseBudget({ weeklyStatus: weeklyBudget, addDailyCents: addCents });
        if (!budgetCheck.ok) {
          report.push(`🛡️ ${m.slug} — ${budgetCheck.reason}`);
          if (budgetCheck.needsMoreBudget && !dryRun) {
            appendLog({ action: "budget_blocked", slug: m.slug, reason: budgetCheck.reason });
          }
          continue;
        }
        const capDaily = maxDailyBudgetCentsPerAd(enriched.filter((x) => x.status === "ACTIVE").length);
        const next = Math.min(current + addCents, MAX_BUDGET_CENTS, capDaily);
        if (next > current) {
          await updateAdsetDailyBudget(meta.adsetId, next);
          meta.dailyBudgetCents = next;
          meta.lastBoostAt = new Date().toISOString();
          meta.boostedAt = meta.boostedAt ?? meta.lastBoostAt;
          if (boostType === "top") {
            scaled.push(m.slug);
            report.push(
              `💰 ESCALAR ${m.slug} — bom desempenho · budget $${(current / 100).toFixed(2)} → $${(next / 100).toFixed(2)}`,
            );
            appendLog({ action: "scale_top", slug: m.slug, budgetCents: next, score: intelScore, metrics: m });
          } else {
            boosted.push(m.slug);
            report.push(`🚀 BOOST ${m.slug} — budget $${(current / 100).toFixed(2)} → $${(next / 100).toFixed(2)}`);
            appendLog({ action: "boost", slug: m.slug, budgetCents: next, metrics: m });
          }
        }
      }
    } else if (AUTO_BOOST && !dryRun && meta.adsetId && canReboost && !mode.policy.boost) {
      const wouldBoost =
        (isTopAd && (m.salesTotal > 0 || (m.linkClicks >= 3 && m.ctr >= 0.5))) ||
        (m.linkClicks >= BOOST_MIN_CLICKS && m.ctr >= 0.8) ||
        (m.linkClicks >= 3 && m.ctr >= 0.5 && intelScore >= 55);
      if (wouldBoost) {
        report.push(`🛡️ Boost ${m.slug} adiado — pagamento Meta pendente`);
      }
    }
  }

  state.lastReview = new Date().toISOString();
  saveState(state);

  const intelLines = intelligenceSummary(top, bottom);

  return {
    paused,
    kept,
    boosted,
    scaled,
    rotated,
    consolidated,
    report,
    metrics: enriched,
    fatigue: fatigue.fatigued,
    top,
    bottom,
    intelLines,
    weeklyBudget,
    deliveryAdvice,
  };
}

export function countActive(state) {
  return Object.values(state.ads ?? {}).filter((a) => a.status === "ACTIVE").length;
}

export function shouldCreateAds(state) {
  const { queue } = loadDashboardData();
  const active = countActive(state);
  if (!queue.length) return { yes: false, reason: "fila vazia" };
  if (active >= TARGET_ACTIVE) return { yes: false, reason: `${active} ativos (meta ${TARGET_ACTIVE})` };

  const maxDaily = maxDailyBudgetCentsPerAd(Math.max(active, 1) + 1);
  if (maxDaily < 300) {
    return { yes: false, reason: `teto semanal R$ ${getWeeklyCapBrl()} — sem slot de budget` };
  }

  const lastRun = state.lastRun ? new Date(state.lastRun).getTime() : 0;
  const hoursSince = (Date.now() - lastRun) / 3600000;
  if (hoursSince < 20 && active > 0) {
    return { yes: false, reason: "autopilot rodou recentemente" };
  }

  return {
    yes: true,
    reason: `${active} ativos · ${queue.length} na fila`,
    maxNew: Math.min(metaConfig().maxNewAds, TARGET_ACTIVE - active + 1),
  };
}

export function runAutopilot(maxNew) {
  const env = { ...process.env };
  if (maxNew) env.META_AD_MAX_NEW = String(maxNew);
  const r = spawnSync(process.execPath, ["--env-file=.env.local", resolve(root, "scripts/meta-ads-autopilot.mjs"), "--skip-build"], {
    cwd: root,
    stdio: "pipe",
    encoding: "utf8",
    env,
  });
  return { ok: r.status === 0, output: (r.stdout ?? "") + (r.stderr ?? "") };
}

export async function runAutoWatch({
  dryRun = false,
  skipTelegram = false,
  forceLlm = false,
  skipPreflightFixes = false,
} = {}) {
  const lines = ["🤖 Trove Auto-Watch", ""];

  if (!isMetaAdsConfigured()) {
    return { ok: false, error: "Meta API não configurada" };
  }

  const { getCautiousMode } = await import("./ads-cautious-mode.mjs");
  const cautious = await getCautiousMode();
  if (cautious.active) {
    lines.push(`🛡️ ${cautious.summary}`);
    lines.push("");
  }

  const brain = await bootstrapAutopilotBrain();
  if (brain.lines?.length) lines.push(...brain.lines, "");

  let cleaned = 0;
  if (!dryRun && !skipPreflightFixes) {
    try {
      const { pauseEmptyTroveCampaigns } = await import("./meta-campaigns.mjs");
      const state0 = loadState();
      const clean = await pauseEmptyTroveCampaigns(state0.campaignId, { dryRun: false });
      cleaned = clean.paused?.length ?? 0;
      if (cleaned) {
        lines.push(`🧹 ${cleaned} campanha(s) vazia(s) pausada(s)`);
      }
    } catch {
      /* ignore cleanup errors */
    }
  }

  const review = await reviewAndAdjust({ dryRun, cautious });
  lines.push(
    `📊 Análise: ${review.kept.length} ok · ${review.paused.length} pausados · ${review.boosted.length} impulsionados · ${review.scaled?.length ?? 0} budget(s) escalado(s)`,
  );
  if (review.intelLines?.length) lines.push(...review.intelLines);
  if (review.weeklyBudget?.nearCap || review.weeklyBudget?.atCap) {
    lines.push(
      review.weeklyBudget.atCap
        ? `🛡️ Teto R$ ${review.weeklyBudget.capBrl}/semana — avise se quiser subir orçamento`
        : `⚠️ Orçamento ${review.weeklyBudget.pct}% da semana usado`,
    );
  }
  if (review.rotated?.length) {
    lines.push(`🔄 Fadiga: ${review.rotated.length} anúncio(s) rotacionado(s)`);
  }
  lines.push(...review.report, "");

  let metaRecs = { applied: [], lines: [], opportunityScore: null, pending: [] };
  if (!skipPreflightFixes) {
    metaRecs = await processMetaRecommendations({
      state: loadState(),
      dryRun,
      topAd: review.top,
    });
    if (metaRecs.lines?.length) {
      lines.push("", "—— Recomendações Meta ——", ...metaRecs.lines);
    }
  }

  let placement = { applied: [], lines: [], advice: null };
  if (!skipPreflightFixes) {
    placement = await applyPlacementFixes({
      state: loadState(),
      saveState,
      dryRun,
      topAd: review.top,
    });
    if (placement.lines?.length) {
      lines.push("", "—— Placements ——", ...placement.lines);
    }
  }

  let llm = null;
  if (!dryRun && cautious.policy.llmConsult) {
    try {
      const { consultLlmAdvisor, shouldRunLlmThisCycle } = await import("./ads-llm-advisor.mjs");
      if (forceLlm || shouldRunLlmThisCycle()) {
        const { buildDashboardPayload } = await import("./ads-dashboard-data.mjs");
        const payload = await buildDashboardPayload({ skipHealth: true, syncFirst: false });
        llm = await consultLlmAdvisor({
          ads: payload.ads,
          totals: payload.totals,
          weeklyBudget: review.weeklyBudget ?? payload.weeklyBudget,
          deliveryAdvice: payload.deliveryAdvice,
          placementAdvice: placement.advice ?? payload.placementAdvice,
          metaRecs,
          review,
          state: loadState(),
        });
        if (llm.briefing) {
          lines.push("", "—— Consultora IA ——", llm.messageToOwner || llm.briefing);
          if (llm.marketInsight) lines.push(`🌍 ${llm.marketInsight}`);
          if (llm.creativePlans?.[0]) {
            const c = llm.creativePlans[0];
            lines.push(`🎬 ${c.slug}: "${c.hook}" — ${c.angle}`);
          }
          if (llm.permissionRequest?.needed) {
            lines.push(`🔐 ${llm.permissionRequest.ask}`);
          }
          if (llm.actions?.length) {
            for (const a of llm.actions) {
              lines.push(`  → ${a.action}${a.slug ? ` (${a.slug})` : ""}: ${a.reason ?? ""}`);
            }
          }
        } else if (llm.error) {
          lines.push(`⚠️ Consultor IA: ${llm.error}`);
        }
      }
    } catch (err) {
      lines.push(`⚠️ Consultor IA: ${err.message}`);
    }
  } else if (!dryRun && cautious.active && !cautious.policy.llmConsult) {
    lines.push("🛡️ Consultora IA em pausa — recarregue crédito OpenAI para voltar ao modo completo.");
  }

  let created = 0;
  if (!dryRun) {
    const state = loadState();
    const forceCreate = cautious.policy.createAds && (review.rotated?.length ?? 0) > 0;
    const plan = shouldCreateAds(state);
    if (cautious.policy.createAds && (plan.yes || forceCreate)) {
      const maxNew = forceCreate
        ? Math.min(metaConfig().maxNewAds, review.rotated.length)
        : plan.maxNew;
      lines.push(`➕ Criando anúncios (${forceCreate ? "rotação por fadiga" : plan.reason})…`);
      const result = runAutopilot(maxNew);
      created = (result.output.match(/✓ Ad created/g) ?? []).length;
      lines.push(result.ok ? `✅ ${created} anúncio(s) criado(s)` : `⚠️ Autopilot: ${result.output.slice(-200)}`);
      appendLog({ action: "autopilot", created, plan });
    } else if (!cautious.policy.createAds && (plan.yes || (review.rotated?.length ?? 0) > 0)) {
      lines.push("🛡️ Criação de anúncios adiada — regularize pagamento Meta primeiro.");
    } else {
      lines.push(`⏭ Sem anúncios novos (${plan.reason})`);
    }

    const state2 = loadState();
    state2.lastWatch = new Date().toISOString();
    if (metaRecs.opportunityScore != null) {
      state2.lastOpportunityScore = metaRecs.opportunityScore;
    }
    state2.lastMetaRecsApplied =
      (metaRecs.applied?.length ?? 0) + (placement.applied?.length ?? 0);
    saveState(state2);
  }

  const msg = lines.join("\n");
  if (!dryRun) {
    if (!skipTelegram) {
      await sendWatchTelegram({ review, metaRecs, created, cleaned, llm });
    }
    appendLog({
      action: "watch",
      paused: review.paused.length,
      boosted: review.boosted.length,
      scaled: review.scaled?.length ?? 0,
      metaRecs: metaRecs.applied?.length ?? 0,
      opportunityScore: metaRecs.opportunityScore,
      created,
    });
  }

  return { ok: true, review, created, metaRecs, llm, cautious, message: msg };
}
