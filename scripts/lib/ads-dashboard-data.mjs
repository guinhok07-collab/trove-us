import { readFileSync, existsSync, statSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  getAdInsights,
  extractAction,
  extractPurchases,
  extractPurchaseValue,
  insightSpendBrl,
  isMetaAdsConfigured,
  isMetaRateLimited,
  metaConfig,
  verifyMetaToken,
  verifyAdAccountBilling,
  currentWeekTimeRange,
} from "./meta-ads-api.mjs";
import { runHealthCheck } from "./trove-health.mjs";
import { getSalesByProductSlug } from "./trove-orders-stats.mjs";
import { buildAdRecommendations } from "./ads-recommendations.mjs";
import { fetchCampaignOverview } from "./meta-campaigns.mjs";
import { buildAiMarketer } from "./ai-marketer.mjs";
import { calcRoas } from "./ads-fatigue.mjs";
import { applyIntelligenceToAds } from "./ads-intelligence.mjs";
import { loadMetaRecommendationContext } from "./meta-recommendation-executor.mjs";
import { getWeeklyBudgetContext, getWeeklyCapBrl } from "./ads-budget-weekly.mjs";
import { getSettingsForUi } from "./dashboard-settings.mjs";
import { getLastUserError, translateMetaError } from "./meta-error-i18n.mjs";
import { readChangeLog } from "./ads-change-log.mjs";
import { buildDeliveryAdvice } from "./ads-delivery-advisor.mjs";
import { buildAiSuggestions } from "./ads-ai-suggestions.mjs";
import { buildPlacementAdvice } from "./ads-placement-advisor.mjs";
import { getBrainStatusForUi } from "./ads-autopilot-brain.mjs";
import { getLastLlmBriefingForUi, verifyOpenAiStatus } from "./ads-llm-advisor.mjs";
import { buildCautiousMode } from "./ads-cautious-mode.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

let healthCache = { at: 0, data: null };
let insightsCache = { at: 0, insights: [], insightsWeek: [] };
const HEALTH_TTL_MS = 5 * 60 * 1000;
const INSIGHTS_TTL_MS = 5 * 60 * 1000;
let billingCache = { at: 0, openai: null, metaPayment: null };
const BILLING_TTL_MS = 12 * 60 * 1000;

async function getBillingStatus(metaConfigured = isMetaAdsConfigured()) {
  if (billingCache.at && Date.now() - billingCache.at < BILLING_TTL_MS) {
    return billingCache;
  }
  const [openai, metaPayment] = await Promise.all([
    verifyOpenAiStatus().catch((err) => ({
      configured: Boolean(process.env.OPENAI_API_KEY?.trim()),
      ok: false,
      billingOk: false,
      detail: err.message,
    })),
    metaConfigured
      ? verifyAdAccountBilling().catch((err) => ({
          configured: true,
          ok: false,
          paymentOk: false,
          detail: err.message,
        }))
      : Promise.resolve({ configured: false, ok: true, paymentOk: true, detail: "Meta não configurado" }),
  ]);
  billingCache = { at: Date.now(), openai, metaPayment };
  return billingCache;
}

function metaIsLive(metaOk, metaToken) {
  if (!metaOk) return false;
  if (metaToken.ok) return true;
  if (metaToken.rateLimited && !metaToken.expired) return true;
  return false;
}

export function loadDashboardData() {
  const statePath = resolve(root, "marketing/social/autopilot-state.json");
  const adsPath = resolve(root, "marketing/social/ads.json");
  const state = existsSync(statePath)
    ? JSON.parse(readFileSync(statePath, "utf8"))
    : { ads: {}, lastRun: null, lastReview: null, campaignId: null };

  const catalog = existsSync(adsPath)
    ? JSON.parse(readFileSync(adsPath, "utf8"))
    : [];

  const createdSlugs = new Set(Object.keys(state.ads ?? {}));
  const queue = catalog.filter((a) => !createdSlugs.has(a.slug));

  let cfg = null;
  let metaOk = false;
  try {
    cfg = metaConfig();
    metaOk = true;
  } catch {
    metaOk = false;
  }

  return { state, catalog, queue, cfg, metaOk, root };
}

export async function buildDashboardPayload(options = {}) {
  const { state, catalog, queue, cfg, metaOk, root } = loadDashboardData();
  const entries = Object.entries(state.ads ?? {});

  let insights = [];
  let insightsWeek = [];
  let metaToken = { ok: false, error: "não verificado" };
  if (metaOk) {
    metaToken = await verifyMetaToken();
    const canFetchInsights = metaToken.ok && entries.length && !isMetaRateLimited();
    const cacheFresh = Date.now() - insightsCache.at < INSIGHTS_TTL_MS;

    if (canFetchInsights && !cacheFresh) {
      const adIds = entries.map(([, v]) => v.adId).filter(Boolean);
      insights = await getAdInsights(adIds, { datePreset: "last_7d" });
      if (!isMetaRateLimited()) {
        insightsWeek = await getAdInsights(adIds, { timeRange: currentWeekTimeRange() });
      } else {
        insightsWeek = insights;
      }
      insightsCache = { at: Date.now(), insights, insightsWeek };
    } else if (cacheFresh && insightsCache.insights.length) {
      insights = insightsCache.insights;
      insightsWeek = insightsCache.insightsWeek.length ? insightsCache.insightsWeek : insights;
    }
  }
  const insightByAd = new Map(insights.map((i) => [i.ad_id, i]));
  const insightWeekByAd = new Map(insightsWeek.map((i) => [i.ad_id, i]));
  const siteSales = await getSalesByProductSlug();

  const metaLive = metaIsLive(metaOk, metaToken);
  const metaRateLimited = Boolean(metaToken.rateLimited || isMetaRateLimited());

  const ads = entries.map(([slug, meta]) => {
    const ins = insightByAd.get(meta.adId);
    const insWeek = insightWeekByAd.get(meta.adId);
    const spendCents = ins ? insightSpendBrl(ins) : 0;
    const spendWeekCents = insWeek ? insightSpendBrl(insWeek) : 0;
    const clicks = ins ? Number(ins.clicks ?? 0) : 0;
    const linkClicks = ins ? extractAction(ins, "link_click") || clicks : 0;
    const impressions = ins ? Number(ins.impressions ?? 0) : 0;
    const ctr = ins ? Number(ins.ctr ?? 0) : 0;
    const metaPurchases = ins ? extractPurchases(ins) : 0;
    const metaPurchaseValue = ins ? extractPurchaseValue(ins) : 0;
    const siteStats = siteSales.bySlug[slug] ?? { orders: 0, units: 0, revenue: 0 };

    const revenue = siteStats.revenue + metaPurchaseValue;
    const roas = calcRoas(revenue, spendCents / 100);

    let health = "learning";
    if (meta.status === "PAUSED") health = "paused";
    else if (!metaToken.ok) health = "watch";
    else if (spendCents >= 1500 && linkClicks === 0) health = "bad";
    else if (metaPurchases > 0 || siteStats.orders > 0) health = "good";
    else if (linkClicks > 0) health = "good";
    else if (impressions > 100) health = "watch";

    return {
      slug,
      ...meta,
      creativeType: meta.creativeType ?? "image",
      spendBrl: spendCents / 100,
      spendWeekBrl: spendWeekCents / 100,
      dailyBudgetBrl: (meta.dailyBudgetCents ?? cfg?.dailyBudgetCents ?? 1000) / 100,
      imageFile: meta.file ?? slug,
      impressions,
      clicks,
      linkClicks,
      ctr,
      metaPurchases,
      metaPurchaseValue,
      siteOrders: siteStats.orders,
      siteUnits: siteStats.units,
      siteRevenue: siteStats.revenue,
      revenue,
      roas,
      salesTotal: metaPurchases + siteStats.orders,
      health,
    };
  });

  const totals = ads.reduce(
    (acc, a) => {
      acc.spend += a.spendBrl;
      acc.clicks += a.linkClicks;
      acc.impressions += a.impressions;
      acc.metaPurchases += a.metaPurchases;
      acc.siteOrders += a.siteOrders;
      acc.revenue += a.revenue ?? 0;
      acc.salesTotal += a.salesTotal;
      if (a.status === "ACTIVE") acc.active += 1;
      if (a.status === "PAUSED") acc.paused += 1;
      return acc;
    },
    {
      spend: 0,
      clicks: 0,
      impressions: 0,
      active: 0,
      paused: 0,
      metaPurchases: 0,
      siteOrders: 0,
      revenue: 0,
      salesTotal: 0,
    },
  );
  totals.roas = calcRoas(totals.revenue, totals.spend);

  const recommendations = buildAdRecommendations(ads);

  let metaRecommendations = { ok: false, opportunityScore: state.lastOpportunityScore ?? null, pending: [], userError: null };
  if (metaOk && metaIsLive(metaOk, metaToken) && !isMetaRateLimited()) {
    try {
      metaRecommendations = await loadMetaRecommendationContext(state);
      if (!metaRecommendations.ok && metaRecommendations.error) {
        metaRecommendations.userError = translateMetaError(metaRecommendations.error).message;
      }
    } catch (err) {
      metaRecommendations = {
        ok: false,
        opportunityScore: state.lastOpportunityScore ?? null,
        pending: [],
        userError: translateMetaError(err).message,
      };
    }
  } else if (metaToken.rateLimited) {
    metaRecommendations.userError = translateMetaError("Application request limit reached").message;
  }

  const feedDir = resolve(root, "marketing/social/output/feed");
  const videoDir = resolve(root, "marketing/social/output/videos");
  const desktopDir = resolve(
    process.env.USERPROFILE ?? "",
    "OneDrive/Desktop/Trove-Redes-Sociais",
  );

  let campaignOverview = null;
  if (metaOk && metaIsLive(metaOk, metaToken) && !isMetaRateLimited()) {
    try {
      campaignOverview = await fetchCampaignOverview(state.campaignId);
    } catch {
      campaignOverview = null;
    }
  }

  const adsWithRecs = ads.map((ad) => {
    const actions = recommendations.items.filter((r) => r.slug === ad.slug);
    const topAction = actions.find((r) => r.verdict === "bad") ?? actions[0] ?? null;
    return { ...ad, actions, topAction };
  });

  const intelligence = applyIntelligenceToAds(adsWithRecs);
  const adsRanked = intelligence.ads.sort((a, b) => {
    if (a.rank == null && b.rank == null) return 0;
    if (a.rank == null) return 1;
    if (b.rank == null) return -1;
    return a.rank - b.rank;
  });

  const timeline = buildTimeline({
    state,
    campaignOverview,
    metaLive,
    metaToken,
    totals,
    lastLog: readRecentLog().slice(-1)[0],
  });

  const nextSteps = buildNextSteps({
    campaignOverview,
    metaLive,
    metaToken,
    telegramOk: Boolean(
      process.env.TELEGRAM_BOT_TOKEN?.trim() && process.env.TELEGRAM_CHAT_ID?.trim(),
    ),
    recommendations,
    metaRecommendations,
    totals,
    creatives: {
      feedImages: existsSync(feedDir) ? countFiles(feedDir, ".png") : 0,
      videos: existsSync(videoDir) ? countFiles(videoDir, ".webm") : 0,
    },
  });

  const campaign = {
    id: state.campaignId,
    name: "Trove Autopilot",
    summary: campaignOverview?.primary
      ? `${campaignOverview.primary.adCount} anúncio(s) ativos · ${campaignOverview.emptyTroveCount} campanha(s) vazia(s) para limpar`
      : `${totals.active} anúncio(s) no painel · campanha ${state.campaignId ?? "—"}`,
    emptyCount: campaignOverview?.emptyTroveCount ?? 0,
    totalTrove: campaignOverview?.totalTrove ?? 0,
  };

  const systemHealth = options.skipHealth
    ? null
    : healthCache.data && Date.now() - healthCache.at < HEALTH_TTL_MS
      ? healthCache.data
      : await runHealthCheck({ syncFirst: options.syncFirst ?? false }).then((h) => {
          healthCache = { at: Date.now(), data: h };
          return h;
        });

  const automation = {
    scheduled: systemHealth?.checks?.find((c) => c.id === "auto-watch")?.ok ?? null,
    lastWatch: state.lastWatch,
    lastReview: state.lastReview,
    adsActiveInMeta: totals.active,
    metaTokenOk: metaToken.ok,
    metaRateLimited,
    metaTokenError: metaToken.ok ? null : metaToken.error,
    insightsLoaded: insights.length > 0,
    siteSalesConfigured: siteSales.configured,
  };

  if (metaRecommendations.ok && metaRecommendations.pendingCount > 0) {
    timeline.push({
      icon: "📋",
      title: `Meta: ${metaRecommendations.pendingCount} recomendação(ões) pendente(s)`,
      detail: `Opportunity Score ${metaRecommendations.opportunityScore}/100 · ${metaRecommendations.autoApplyCount} automatizável(is)`,
    });
  } else if (metaRecommendations.ok && metaRecommendations.opportunityScore >= 90) {
    timeline.push({
      icon: "✨",
      title: `Meta Opportunity Score ${metaRecommendations.opportunityScore}/100`,
      detail: "Conta otimizada — sem recomendações pendentes",
    });
  }

  if (state.lastMetaRecsApplied > 0 && state.lastWatch) {
    timeline.push({
      icon: "✅",
      title: `${state.lastMetaRecsApplied} recomendação(ões) Meta aplicada(s)`,
      detail: `Último auto-watch: ${new Date(state.lastWatch).toLocaleString("pt-BR")}`,
    });
  }

  timeline.push(...buildTimelineAutomation(automation));

  let weeklyBudget = { capBrl: getWeeklyCapBrl(), spentBrl: 0, remainingBrl: getWeeklyCapBrl(), pct: 0, status: "ok", label: "Dentro do orçamento" };
  if (metaLive && !metaRateLimited) {
    try {
      weeklyBudget = await getWeeklyBudgetContext(state);
    } catch {
      weeklyBudget.spentBrl = ads.reduce((s, a) => s + (a.spendWeekBrl ?? 0), 0);
      weeklyBudget.remainingBrl = Math.max(0, getWeeklyCapBrl() - weeklyBudget.spentBrl);
      weeklyBudget.pct = Math.round((weeklyBudget.spentBrl / getWeeklyCapBrl()) * 100);
    }
  }

  const deliveryAdvice = buildDeliveryAdvice({
    ads: adsRanked,
    totals,
    state,
    weeklyBudget,
  });

  const placementAdvice = buildPlacementAdvice({
    state,
    metaRecommendations,
  });

  const autopilotBrain = getBrainStatusForUi();
  const billing = await getBillingStatus(metaOk);
  const cautious = buildCautiousMode(billing);
  const llmAdvisor = getLastLlmBriefingForUi({
    billingOk: billing.openai?.billingOk,
    billingDetail: billing.openai?.detail,
    quotaExceeded: billing.openai?.quotaExceeded,
  });
  const { getJarvisStatusForUi } = await import("./ads-jarvis.mjs");
  const jarvis = getJarvisStatusForUi({ totals, weeklyBudget, billing });

  const aiMarketer = buildAiMarketer({
    ads: adsRanked,
    totals,
    recommendations,
    metaRecommendations,
    weeklyBudget,
    automation,
    metaLive,
    metaRateLimited,
    deliveryAdvice,
    placementAdvice,
    telegramOk: Boolean(
      process.env.TELEGRAM_BOT_TOKEN?.trim() && process.env.TELEGRAM_CHAT_ID?.trim(),
    ),
    campaign,
    lastWatch: state.lastWatch,
  });

  const changeLog = readChangeLog(50);
  const aiSuggestions = buildAiSuggestions({
    ads: adsRanked,
    totals,
    weeklyBudget,
    queue: queue.slice(0, 20),
    metaLive,
    metaRateLimited,
    deliveryAdvice,
    placementAdvice,
  });

  const settings = getSettingsForUi();
  const lastApiError = getLastUserError();
  const userAlerts = [];
  if (metaRecommendations.userError) {
    userAlerts.push({ type: "warn", title: "Recomendações Meta", detail: metaRecommendations.userError });
  }
  if (lastApiError?.message) {
    userAlerts.push({
      type: lastApiError.severity === "error" ? "error" : "warn",
      title: "Meta Ads",
      detail: lastApiError.message,
    });
  }
  if (metaRateLimited) {
    userAlerts.push({
      type: "warn",
      title: "Consultas Meta",
      detail: translateMetaError("Application request limit reached").message,
    });
  } else if (metaToken.expired) {
    userAlerts.push({ type: "error", title: "Token Meta", detail: metaToken.error });
  } else if (metaToken.ok === false && metaToken.error) {
    userAlerts.push({ type: "error", title: "Conexão Meta", detail: metaToken.error });
  }
  if (billing.metaPayment?.configured && billing.metaPayment.paymentOk === false) {
    userAlerts.push({
      type: "error",
      title: "Pagamento Meta Ads",
      detail: billing.metaPayment.detail + " → business.facebook.com/billing",
      actionUrl: "https://business.facebook.com/billing",
    });
  }
  if (billing.openai?.configured && billing.openai.billingOk === false) {
    userAlerts.push({
      type: "error",
      title: "Crédito OpenAI (JARVIS)",
      detail: billing.openai.detail + " → platform.openai.com/settings/organization/billing",
      actionUrl: "https://platform.openai.com/settings/organization/billing",
    });
  } else if (!billing.openai?.configured && process.env.META_JARVIS_MODE === "1") {
    userAlerts.push({
      type: "warn",
      title: "JARVIS modo básico",
      detail: "Sem OPENAI_API_KEY — respostas limitadas. Adicione a chave e billing na OpenAI.",
    });
  }
  if (cautious.active) {
    userAlerts.unshift({
      type: "warn",
      title: "Modo cauteloso ativo",
      detail: cautious.summary + " Continuo: " + cautious.allows.join(", ") + ".",
    });
  }

  const paymentIssues = await (await import("./payment-issues.mjs")).getPaymentIssuesSummary();
  if (paymentIssues.openCount > 0) {
    const top = paymentIssues.recent?.[0];
    userAlerts.unshift({
      type: "error",
      title: "Problemas de pagamento no checkout",
      detail: `${paymentIssues.openCount} aberto(s)${top ? ` — ${top.fullName}${top.phone ? ` · ${top.phone}` : ""}: ${(top.problem ?? "").slice(0, 100)}` : ""}`,
      actionUrl: "https://trove-us.com/admin",
    });
  }

  const socialOrganic = (await import("./social-organic-poster.mjs")).getSocialOrganicStatus();
  const creatives = {
    feedImages: existsSync(feedDir) ? countFiles(feedDir, ".png") : 0,
    videos: existsSync(videoDir) ? countFiles(videoDir, ".webm") : 0,
  };
  const { buildAgenda } = await import("./ads-agenda.mjs");
  const agenda = buildAgenda({
    billing,
    socialOrganic,
    settings,
    automation,
    metaToken,
    creatives,
    totals,
    cautious,
    paymentIssues,
  });

  return {
    generatedAt: new Date().toISOString(),
    metaOk,
    metaConfigured: metaOk,
    metaLive,
    metaRateLimited,
    metaToken,
    telegramOk: Boolean(
      process.env.TELEGRAM_BOT_TOKEN?.trim() && process.env.TELEGRAM_CHAT_ID?.trim(),
    ),
    systemHealth,
    automation,
    recommendations,
    metaRecommendations,
    campaign,
    timeline,
    nextSteps,
    aiMarketer,
    weeklyBudget,
    changeLog,
    aiSuggestions,
    deliveryAdvice,
    placementAdvice,
    autopilotBrain,
    llmAdvisor,
    jarvis,
    billing,
    cautious,
    socialOrganic,
    paymentIssues,
    agenda,
    settings,
    userAlerts,
    budgetPerAd: weeklyBudget.maxDailyPerAdBrl ?? (cfg ? cfg.dailyBudgetCents / 100 : 10),
    maxNewPerRun: cfg?.maxNewAds ?? 3,
    campaignId: state.campaignId,
    lastRun: state.lastRun,
    lastReview: state.lastReview,
    lastWatch: state.lastWatch,
    lastOpportunityScore: state.lastOpportunityScore ?? metaRecommendations.opportunityScore,
    lastMetaRecsApplied: state.lastMetaRecsApplied ?? 0,
    totals,
    ads: adsRanked,
    queue: queue.slice(0, 12).map((a) => ({
      slug: a.slug,
      product: a.product,
      price: a.price,
      file: a.file,
    })),
    queueTotal: queue.length,
    catalogTotal: catalog.length,
    creatives,
    paths: {
      desktop: desktopDir,
      project: root,
    },
    links: {
      adsManager: "https://business.facebook.com/adsmanager",
      businessSuite: "https://business.facebook.com/latest/home",
      siteAdmin: "https://trove-us.com/admin",
      site: "https://trove-us.com",
      instagram: "https://www.instagram.com/shoptrove.us/",
    },
    commands: [
      { id: "optimize", label: "⚡ Otimizar tudo (limpar + vídeos + auto)", cmd: "npm run ads:optimize" },
      { id: "watch", label: "🤖 Auto-watch", cmd: "npm run ads:watch" },
      { id: "autopilot", label: "+3 anúncios novos", cmd: "npm run ads:autopilot" },
      { id: "pack", label: "Regenerar imagens/vídeos", cmd: "npm run social:pack" },
    ],
    autoMode: {
      enabled: true,
      interval: "12x por dia (a cada 2h)",
      rules: [
        "Teto semanal R$ 120 total — nunca passa sem avisar no Telegram",
        "Score 0–100 por anúncio — pausa os ruins, escala os bons",
        "Escala budget (+$10/dia) só com dados confirmados e teto de orçamento",
        "Detecta fadiga (CTR cai + impressões sobem) e rotaciona criativo",
        "Pausa se gastou $15+ sem clique ou CTR < 0,25%",
        "Publica vídeo Reels quando .webm existe",
        "Aplica recomendações Meta (Opportunity Score) com guardrails de budget",
        "Painel com watchdog — reinicia sozinho e avisa no Telegram se cair",
        "Cria novos da fila se ativos < 3",
      ],
    },
    recentLog: readRecentLog(),
  };
}

function readRecentLog() {
  const logPath = resolve(root, "marketing/social/autopilot-log.jsonl");
  if (!existsSync(logPath)) return [];
  try {
    const lines = readFileSync(logPath, "utf8").trim().split("\n").slice(-8);
    return lines.map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

function countFiles(dir, ext) {
  try {
    return readdirSync(dir).filter((f) => f.endsWith(ext)).length;
  } catch {
    return 0;
  }
}

function buildTimeline({ state, campaignOverview, metaLive, metaToken, totals, lastLog }) {
  const items = [];

  if (metaLive) {
    items.push({
      icon: "🟢",
      title: "Meta conectada",
      detail: `Lendo ${totals.active} anúncio(s) · gasto 7d: R$${totals.spend.toFixed(2)}`,
    });
  } else if (metaToken?.expired) {
    items.push({
      icon: "🔴",
      title: "Token Meta expirou",
      detail: "Renove no Meta Business e atualize .env.local",
    });
  }

  if (state.lastWatch) {
    items.push({
      icon: "🤖",
      title: "Auto-watch rodou",
      detail: `Último ciclo: ${new Date(state.lastWatch).toLocaleString("pt-BR")}`,
    });
  }

  if (campaignOverview?.emptyTroveCount > 0) {
    items.push({
      icon: "🧹",
      title: `${campaignOverview.emptyTroveCount} campanha(s) vazia(s) no Meta`,
      detail: "São testes antigos — clique em Otimizar tudo para pausar",
    });
  }

  if (totals.salesTotal > 0) {
    items.push({
      icon: "🛒",
      title: `${totals.salesTotal} venda(s) detectada(s)`,
      detail: `${totals.siteOrders} pelo site · ${totals.metaPurchases} pelo pixel Meta`,
    });
  }

  if (lastLog?.action === "pause") {
    items.push({
      icon: "⏸",
      title: "Anúncio pausado automaticamente",
      detail: `${lastLog.slug}: ${lastLog.reason ?? ""}`,
    });
  }

  return items;
}

function buildTimelineAutomation(automation) {
  if (!automation?.scheduled) {
    return [{
      icon: "⚠️",
      title: "Agendamento não instalado",
      detail: "Rode npm run ads:watch:install no PC",
    }];
  }
  return [];
}

function buildNextSteps({ campaignOverview, metaLive, metaToken, telegramOk, recommendations, metaRecommendations, totals, creatives }) {
  const steps = [];

  if (!metaLive && metaToken?.expired) {
    steps.push({
      title: "Renovar token Meta",
      detail: metaToken?.error ?? "Token expirado — autopilot não lê métricas",
      action: null,
    });
  }

  if (metaRecommendations?.ok && metaRecommendations.pendingCount > 0) {
    const reels = metaRecommendations.pending.filter((p) => p.type === "REELS_PC_RECOMMENDATION");
    const detail = reels.length
      ? `${reels.length} vídeo(s) Reels 9:16 — publico automaticamente com guardrails`
      : `${metaRecommendations.pendingCount} sugestão(ões) do Meta Ads Manager`;
    steps.push({
      title: "Aplicar recomendações Meta",
      detail: `Score ${metaRecommendations.opportunityScore}/100 · ${detail}`,
      action: "meta-recs",
      button: "Aplicar agora",
    });
  }

  if (campaignOverview?.emptyTroveCount > 0) {
    steps.push({
      title: "Limpar campanhas vazias",
      detail: `${campaignOverview.emptyTroveCount} campanhas Trove Autopilot sem anúncio poluindo o Meta`,
      action: "optimize",
      button: "Limpar agora",
    });
  }

  if (creatives.videos === 0 || creatives.feedImages === 0) {
    steps.push({
      title: "Gerar vídeos e imagens",
      detail: "Criativos para Reels/Stories — o sistema gera sozinho",
      action: "optimize",
      button: "Gerar criativos",
    });
  }

  const badRec = recommendations.items.find((r) => r.verdict === "bad");
  if (badRec) {
    steps.push({
      title: badRec.title,
      detail: `${badRec.product} — ${badRec.detail}`,
      action: badRec.auto ? "watch" : null,
      button: badRec.auto ? "Aplicar auto" : null,
    });
  }

  if (!telegramOk) {
    steps.push({
      title: "Configurar Telegram",
      detail: "Receba alertas de vendas e pausas no celular",
      action: null,
    });
  }

  if (totals.active < 3) {
    steps.push({
      title: "Criar mais anúncios",
      detail: `${totals.active}/3 ativos — autopilot pode criar novos da fila`,
      action: "autopilot",
      button: "Criar anúncios",
    });
  }

  return steps.slice(0, 4);
}
