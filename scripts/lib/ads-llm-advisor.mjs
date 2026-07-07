/**
 * Consultora LLM (OpenAI) — estrategista Trove com limites de orçamento e pedido de permissão.
 * Env: OPENAI_API_KEY, OPENAI_MODEL, META_OWNER_NAME, META_LLM_AUTO_EXECUTE
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { recordBrainEvent, AUTOPILOT_RULES } from "./ads-autopilot-brain.mjs";
import { appendLog } from "./ads-log.mjs";
import { getEffectiveSettings } from "./dashboard-settings.mjs";
import { getWeeklyCapBrl, maxDailyBudgetCentsPerAd } from "./ads-budget-weekly.mjs";
import { ownerName, assistantName, timeGreeting, localTimeContext } from "./assistant-identity.mjs";
import { businessBrainForPrompt } from "./aria-business-brain.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const LLM_CACHE_PATH = resolve(root, "marketing/social/autopilot-llm-last.json");
const PERMISSION_PATH = resolve(root, "marketing/social/autopilot-llm-permission.json");
const CHAT_HISTORY_PATH = resolve(root, "marketing/social/jarvis-chat-history.json");
const CHAT_HISTORY_MAX = 12;

const ALLOWED_ACTIONS = new Set([
  "consolidate",
  "placement-fix",
  "meta-recs",
  "cleanup",
  "pause",
]);

const AUTO_SAFE_ACTIONS = new Set(["placement-fix", "meta-recs", "cleanup"]);

const TROVE_SYSTEM_GUIDE = businessBrainForPrompt();

export function isLlmConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim()) && process.env.META_LLM_ENABLED !== "0";
}

let openAiStatusCache = { at: 0, data: null };
const OPENAI_STATUS_TTL_MS = 15 * 60 * 1000;

/** Testa se a OpenAI aceita chamadas (API key + billing/crédito). */
export async function verifyOpenAiStatus({ force = false } = {}) {
  const configured = isLlmConfigured();
  if (!configured) {
    return { configured: false, ok: false, billingOk: false, detail: "OPENAI_API_KEY não configurada" };
  }
  const now = Date.now();
  if (!force && openAiStatusCache.data && now - openAiStatusCache.at < OPENAI_STATUS_TTL_MS) {
    return openAiStatusCache.data;
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 8,
        messages: [{ role: "user", content: "ok" }],
      }),
      signal: AbortSignal.timeout(20000),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data.error?.message ?? res.statusText;
      const quotaExceeded = /quota|billing|insufficient|credit|payment/i.test(msg);
      const invalidKey = res.status === 401 || /invalid.*api.*key/i.test(msg);
      const result = {
        configured: true,
        ok: false,
        billingOk: false,
        quotaExceeded,
        invalidKey,
        detail: quotaExceeded
          ? "OpenAI sem crédito — ative billing em platform.openai.com/settings/organization/billing"
          : invalidKey
            ? "API key OpenAI inválida"
            : `OpenAI: ${msg}`,
      };
      openAiStatusCache = { at: now, data: result };
      return result;
    }
    const result = {
      configured: true,
      ok: true,
      billingOk: true,
      quotaExceeded: false,
      detail: "OpenAI ativa com crédito",
    };
    openAiStatusCache = { at: now, data: result };
    return result;
  } catch (err) {
    return {
      configured: true,
      ok: false,
      billingOk: false,
      detail: `OpenAI inacessível: ${err.message}`,
    };
  }
}

export function shouldRunLlmThisCycle() {
  if (!isLlmConfigured()) return false;
  const minH = Number(process.env.META_LLM_INTERVAL_HOURS) || 4;
  const last = loadLastLlm();
  if (!last?.at) return true;
  return Date.now() - new Date(last.at).getTime() > minH * 3600 * 1000;
}

function llmAutoExecute() {
  return process.env.META_LLM_AUTO_EXECUTE === "1";
}

function loadLastLlm() {
  if (!existsSync(LLM_CACHE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(LLM_CACHE_PATH, "utf8"));
  } catch {
    return null;
  }
}

function saveLastLlm(data) {
  mkdirSync(dirname(LLM_CACHE_PATH), { recursive: true });
  writeFileSync(LLM_CACHE_PATH, JSON.stringify(data, null, 2), "utf8");
}

export function getPendingPermission() {
  if (!existsSync(PERMISSION_PATH)) return null;
  try {
    const p = JSON.parse(readFileSync(PERMISSION_PATH, "utf8"));
    return p?.status === "pending" ? p : null;
  } catch {
    return null;
  }
}

function savePermission(data) {
  mkdirSync(dirname(PERMISSION_PATH), { recursive: true });
  writeFileSync(PERMISSION_PATH, JSON.stringify(data, null, 2), "utf8");
}

export function getLastLlmBriefingForUi(extra = {}) {
  const configured = isLlmConfigured();
  const last = loadLastLlm();
  const permission = getPendingPermission();
  const billingOk = extra.billingOk;
  const billingDetail = extra.billingDetail;
  const base = {
    configured,
    billingOk,
    billingDetail,
    quotaExceeded: extra.quotaExceeded ?? false,
    autoExecute: llmAutoExecute(),
    permissionRequest: permission,
  };
  if (!last?.briefing && !last?.messageToOwner) {
    return { ...base, briefing: null };
  }
  return {
    ...base,
    briefing: last.messageToOwner || last.briefing,
    messageToOwner: last.messageToOwner,
    jarvisQuip: last.jarvisQuip,
    marketInsight: last.marketInsight,
    creativePlans: last.creativePlans ?? [],
    budgetAnalysis: last.budgetAnalysis,
    permissionRequest: permission ?? last.permissionRequest,
    at: last.at,
    model: last.model,
    actions: last.actions ?? [],
    executed: last.executed ?? [],
    priority: last.priority,
  };
}

function adAgeDays(meta) {
  if (!meta?.createdAt) return 0;
  return Math.round((Date.now() - new Date(meta.createdAt).getTime()) / 86400000);
}

export function buildPromptContext(ctx) {
  const settings = getEffectiveSettings();
  const activeCount = ctx.totals?.active ?? 0;
  const maxDailyCents = maxDailyBudgetCentsPerAd(activeCount || settings.targetActiveAds);

  const ads = (ctx.ads ?? []).map((a) => {
    const meta = ctx.state?.ads?.[a.slug] ?? {};
    return {
      slug: a.slug,
      product: a.product,
      status: a.status,
      spend7dBrl: a.spendBrl ?? a.spend,
      spendWeekBrl: a.spendWeekBrl,
      clicks: a.linkClicks ?? a.clicks,
      impressions: a.impressions,
      score: a.intelligenceScore,
      tier: a.tier,
      health: a.health,
      creativeType: meta.creativeType ?? a.creativeType,
      hasVideo: meta.hasVideo ?? a.hasVideo,
      hasImage: meta.hasImage ?? a.hasImage,
      dailyBudgetBrl: (meta.dailyBudgetCents ?? settings.dailyBudgetCents) / 100,
      ageDays: adAgeDays(meta),
      pauseReason: meta.pauseReason,
    };
  });

  const weekly = ctx.weeklyBudget ?? {};
  const capBrl = weekly.capBrl ?? settings.weeklyBudgetBrl;
  const spentBrl = weekly.spentBrl ?? 0;
  const remainingBrl = weekly.remainingBrl ?? Math.max(0, capBrl - spentBrl);

  return {
    ownerName: ownerName(),
    systemGuide: TROVE_SYSTEM_GUIDE,
    autopilotRules: AUTOPILOT_RULES.map((r) => `${r.title}: ${r.detail}`),
    settings: {
      weeklyCapBrl: capBrl,
      targetActiveAds: settings.targetActiveAds,
      dailyBudgetBrl: settings.dailyBudgetCents / 100,
      maxDailyPerAdBrl: maxDailyCents / 100,
      maxDailyBudgetBrl: settings.maxDailyBudgetCents / 100,
      autoBoost: settings.autoBoost,
      autoPause: settings.autoPause,
    },
    account: {
      activeAds: activeCount,
      pausedAds: ctx.totals?.paused ?? 0,
      spend7dBrl: ctx.totals?.spend,
      clicks7d: ctx.totals?.clicks,
      impressions7d: ctx.totals?.impressions,
      sales: ctx.totals?.salesTotal,
      roas7d: ctx.totals?.roas,
      weeklySpentBrl: spentBrl,
      weeklyRemainingBrl: remainingBrl,
      weeklyPct: weekly.pct,
      weeklyAtCap: weekly.atCap,
      metaOpportunityScore: ctx.metaRecs?.opportunityScore,
    },
    queuePreview: (ctx.queue ?? []).slice(0, 8).map((q) => ({
      product: q.product,
      price: q.price,
      slug: q.slug,
    })),
    creatives: ctx.creatives ?? null,
    intelligenceNotes: (ctx.recommendations?.items ?? []).slice(0, 8).map((r) => ({
      slug: r.slug,
      verdict: r.verdict,
      title: r.title,
      detail: r.detail,
    })),
    ads,
    issues: [
      ...(ctx.deliveryAdvice?.insights ?? []).map((i) => i.detail),
      ...(ctx.placementAdvice?.issues ?? []).map((i) => i.title + ": " + i.detail),
      ...(ctx.review?.intelLines ?? []),
    ],
    watchSummary: {
      paused: ctx.review?.paused ?? [],
      boosted: ctx.review?.boosted ?? [],
      scaled: ctx.review?.scaled ?? [],
    },
    cautiousMode: ctx.cautious?.active
      ? {
          active: true,
          summary: ctx.cautious.summary,
          allowed: ctx.cautious.allows,
          blocked: ctx.cautious.blocks,
        }
      : { active: false },
    agenda: ctx.agenda
      ? {
          headline: ctx.agenda.summary?.headline,
          overdue: ctx.agenda.summary?.overdue,
          items: (ctx.agenda.items ?? []).slice(0, 10).map((i) => ({
            title: i.title,
            status: i.status,
            when: i.when,
            detail: i.detail,
            kind: i.kind,
          })),
        }
      : null,
    socialOrganic: ctx.socialOrganic
      ? {
          enabled: ctx.socialOrganic.enabled,
          nextProduct: ctx.socialOrganic.nextProduct?.product,
          scheduleHour: ctx.socialOrganic.scheduleHour,
          lastPostedAt: ctx.socialOrganic.lastPostedAt,
          taskInstalled: ctx.socialOrganic.taskInstalled,
        }
      : null,
    billing: {
      openaiOk: ctx.billing?.openai?.billingOk !== false,
      openaiDetail: ctx.billing?.openai?.detail,
      metaPaymentOk: ctx.billing?.metaPayment?.paymentOk !== false,
      metaPaymentDetail: ctx.billing?.metaPayment?.detail,
    },
    adOpinions: ads
      .slice()
      .sort((a, b) => (a.score ?? 50) - (b.score ?? 50))
      .slice(0, 8)
      .map((a) => ({
        slug: a.slug,
        product: a.product,
        status: a.status,
        score: a.score,
        tier: a.tier,
        health: a.health,
        spend7dBrl: a.spend7dBrl,
        clicks: a.clicks,
        hasVideo: a.hasVideo,
      })),
    execution: ctx.execution
      ? {
          ok: ctx.execution.ok,
          done: ctx.execution.done,
          blocked: ctx.execution.blocked,
          summary: ctx.execution.summaryForChat,
        }
      : null,
    investigation: ctx.investigation
      ? {
          findings: ctx.investigation.findings,
          live: ctx.investigation.live,
        }
      : null,
    personal: ctx.personal?.ok
      ? { scheduled: true, message: ctx.personal.message, item: ctx.personal.item }
      : null,
    personalItems: (ctx.personalItems ?? []).slice(0, 12).map((i) => ({
      title: i.title,
      kind: i.kind,
      when: i.when,
      status: i.status,
    })),
    siteTraffic: ctx.siteTraffic
      ? {
          totals: ctx.siteTraffic.totals,
          today: ctx.siteTraffic.today,
          topProducts: ctx.siteTraffic.topProducts,
          topSources: ctx.siteTraffic.topSources,
          funnel: ctx.siteTraffic.funnel,
          bottleneck: ctx.siteTraffic.bottleneck,
          goal: ctx.siteTraffic.goal,
          recentDays: ctx.siteTraffic.recentDays,
        }
      : null,
    ownerMemory: ctx.ownerMemory || null,
    memoryLearn: ctx.memoryLearn?.learned?.length
      ? { justLearned: ctx.memoryLearn.learned }
      : null,
    budgetMath: {
      formula: `máx diário por anúncio ≈ R$${capBrl}/7/${activeCount || settings.targetActiveAds}`,
      cannotExceedWeekly: capBrl,
      ifAddFourthAd: `4 ativos → ~R$${(capBrl / 7 / 4).toFixed(2)}/dia cada (mais diluição)`,
    },
    localTime: localTimeContext(),
  };
}

function loadChatHistory() {
  if (!existsSync(CHAT_HISTORY_PATH)) return [];
  try {
    const rows = JSON.parse(readFileSync(CHAT_HISTORY_PATH, "utf8"));
    return Array.isArray(rows) ? rows.slice(-CHAT_HISTORY_MAX) : [];
  } catch {
    return [];
  }
}

function saveChatHistory(rows) {
  mkdirSync(dirname(CHAT_HISTORY_PATH), { recursive: true });
  writeFileSync(
    CHAT_HISTORY_PATH,
    JSON.stringify(rows.slice(-CHAT_HISTORY_MAX), null, 2),
    "utf8",
  );
}

function appendChatHistory(question, answer) {
  const rows = loadChatHistory();
  rows.push({
    at: new Date().toISOString(),
    role: "user",
    content: question,
  });
  rows.push({
    at: new Date().toISOString(),
    role: "assistant",
    content: answer,
  });
  saveChatHistory(rows);
}

function buildSystemPrompt() {
  const name = ownerName();
  return `Você é JARVIS — IA real (OpenAI) no sistema Trove Autopilot de ${name}. Pense, opine e priorize lucro.
Personalidade: inteligente de verdade, humor seco, profissional sem soar robô ou formulário. Pode quebrar protocolo interno se isso aumentar venda — explique o porquê.
Chame ${name} pelo nome. Direta, leal, sem bajulação.

Responda SOMENTE JSON válido:
{
  "jarvisQuip": "frase curta com personalidade (1 linha)",
  "messageToOwner": "Mensagem natural para ${name} com o que importa agora (números reais). Sem tom de sistema.",

  "briefing": "resumo curto (1-2 frases)",
  "marketInsight": "1 tendência atual de marketing digital/pets EUA aplicável à Trove",
  "creativePlans": [
    {
      "slug": "slug-do-anuncio ou geral",
      "verdict": "fraco|ok|forte",
      "hook": "gancho de propaganda sugerido em inglês (para o anúncio EUA)",
      "angle": "ângulo criativo em português",
      "format": "video|imagem|reels|ugc",
      "why": "por que isso pode melhorar CTR/conversão",
      "budgetFit": "dentro_do_teto|precisa_aprovar"
    }
  ],
  "budgetAnalysis": {
    "withinLimits": true,
    "currentWeeklySpentBrl": 0,
    "weeklyCapBrl": 120,
    "proposedChange": "descreva mudança de budget se houver",
    "ifWeDoThis": "consequência positiva esperada",
    "ifWeDont": "consequência de não agir"
  },
  "permissionRequest": {
    "needed": false,
    "type": "raise_weekly_cap|raise_daily_budget|add_active_ad|boost_ad_budget|none",
    "ask": "pergunta clara para ${name} aprovar (ex: Posso subir o teto para R$150?)",
    "weeklyBudgetBrl": null,
    "dailyBudgetBrl": null,
    "extraWeeklyCostBrl": null,
    "slug": null,
    "expectedBenefit": "o que melhora se aprovar"
  },
  "actions": [
    { "action": "placement-fix|meta-recs|consolidate|cleanup|pause", "slug": "opcional", "reason": "curto" }
  ],
  "priority": "low|medium|high"
}

Regras obrigatórias:
- Se qualquer sugestão ultrapassar teto semanal ou budget diário máximo → permissionRequest.needed=true com valores exatos.
- creativePlans: 1-3 itens focados nos anúncios mais fracos ou oportunidades claras.
- actions: máximo 2; só da lista permitida; pause só com slug ACTIVE fraco.
- consolidate só se >3 ativos ou sem entrega.
- Se tudo OK: actions=[], permissionRequest.needed=false.
- Cite números reais dos dados (gasto, score, R$).
- jarvisQuip: sempre presente, engraçada mas elegante — nunca ofensiva.
- Não mencione APIs, código ou JSON.`;
}

async function callOpenAi(contextPayload) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.45,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt() },
        {
          role: "user",
          content: `Dados atuais da conta Trove:\n${JSON.stringify(contextPayload, null, 2)}`,
        },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data.error?.message ?? res.statusText;
    throw new Error(`OpenAI: ${msg}`);
  }

  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAI: resposta vazia");

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("OpenAI: JSON inválido");
  }

  return { parsed, model, usage: data.usage };
}

function normalizePermission(parsed, ctx) {
  const settings = getEffectiveSettings();
  const weekly = ctx.weeklyBudget ?? {};
  const capBrl = weekly.capBrl ?? settings.weeklyBudgetBrl;
  const pr = parsed.permissionRequest ?? { needed: false, type: "none" };

  if (pr.needed) {
    if (pr.type === "raise_weekly_cap" && pr.weeklyBudgetBrl != null) {
      pr.weeklyBudgetBrl = Number(pr.weeklyBudgetBrl);
      if (!Number.isFinite(pr.weeklyBudgetBrl) || pr.weeklyBudgetBrl <= capBrl) {
        pr.needed = false;
      } else {
        pr.extraWeeklyCostBrl = pr.weeklyBudgetBrl - capBrl;
      }
    }
    if (pr.type === "raise_daily_budget" && pr.dailyBudgetBrl != null) {
      pr.dailyBudgetBrl = Number(pr.dailyBudgetBrl);
      const maxDaily = settings.maxDailyBudgetCents / 100;
      if (!Number.isFinite(pr.dailyBudgetBrl) || pr.dailyBudgetBrl <= settings.dailyBudgetCents / 100) {
        pr.needed = false;
      } else if (pr.dailyBudgetBrl * 7 * (ctx.totals?.active || 1) > capBrl) {
        pr.needed = true;
        pr.ask =
          pr.ask ||
          `Para R$${pr.dailyBudgetBrl}/dia por anúncio, o teto semanal de R$${capBrl} não basta — posso subir o teto?`;
      }
    }
    if (pr.type === "add_active_ad" && (ctx.totals?.active ?? 0) >= settings.targetActiveAds) {
      pr.needed = true;
      pr.ask = pr.ask || `Posso ativar mais um anúncio? Isso dilui ~R$${(capBrl / 7 / ((ctx.totals?.active ?? 0) + 1)).toFixed(2)}/dia cada.`;
    }
  }

  if (weekly.atCap && pr.type === "boost_ad_budget" && !pr.needed) {
    pr.needed = true;
    pr.type = "raise_weekly_cap";
    pr.ask = pr.ask || `Teto semanal R$${capBrl} atingido — posso aumentar para continuar impulsionando?`;
    pr.weeklyBudgetBrl = Math.ceil(capBrl * 1.25);
  }

  return pr;
}

function persistPermissionRequest(pr, meta = {}) {
  if (!pr?.needed) {
    if (existsSync(PERMISSION_PATH)) {
      try {
        const old = JSON.parse(readFileSync(PERMISSION_PATH, "utf8"));
        if (old.status === "pending") {
          old.status = "superseded";
          old.supersededAt = new Date().toISOString();
          writeFileSync(PERMISSION_PATH, JSON.stringify(old, null, 2), "utf8");
        }
      } catch {
        /* ignore */
      }
    }
    return null;
  }

  const pending = {
    id: `perm_${Date.now()}`,
    status: "pending",
    createdAt: new Date().toISOString(),
    ...pr,
    ...meta,
  };
  savePermission(pending);
  return pending;
}

export async function handlePermissionDecision(decision) {
  const pending = getPendingPermission();
  if (!pending) {
    return { ok: false, error: "Nenhum pedido de permissão pendente." };
  }

  if (decision === "dismiss") {
    pending.status = "dismissed";
    pending.resolvedAt = new Date().toISOString();
    savePermission(pending);
    appendLog({ action: "llm_permission_dismissed", type: pending.type });
    return { ok: true, message: "Pedido ignorado. A consultora não vai aplicar essa mudança." };
  }

  if (decision !== "approve") {
    return { ok: false, error: "Decisão inválida." };
  }

  const messages = [];

  try {
    const { saveDashboardSettings } = await import("./dashboard-settings.mjs");

    if (pending.type === "raise_weekly_cap" && pending.weeklyBudgetBrl) {
      const r = saveDashboardSettings({ weeklyBudgetBrl: pending.weeklyBudgetBrl });
      if (!r.ok) throw new Error(r.errors?.join(" ") ?? "Falha ao salvar teto");
      messages.push(`Teto semanal → R$ ${pending.weeklyBudgetBrl}`);
    }

    if (pending.type === "raise_daily_budget" && pending.dailyBudgetBrl) {
      const cents = Math.round(pending.dailyBudgetBrl * 100);
      const r = saveDashboardSettings({ dailyBudgetCents: cents });
      if (!r.ok) throw new Error(r.errors?.join(" ") ?? "Falha ao salvar budget diário");
      messages.push(`Budget diário → R$ ${pending.dailyBudgetBrl}`);
    }

    if (pending.type === "add_active_ad" && pending.slug) {
      const { loadState, saveState } = await import("./ads-auto-engine.mjs");
      const { setAdStatus } = await import("./meta-ads-api.mjs");
      const state = loadState();
      const meta = state.ads?.[pending.slug];
      if (!meta?.adId) throw new Error(`Anúncio ${pending.slug} não encontrado`);
      await setAdStatus(meta.adId, "ACTIVE");
      meta.status = "ACTIVE";
      delete meta.pausedAt;
      delete meta.pauseReason;
      saveState(state);
      messages.push(`Ativado: ${pending.slug}`);
    }

    if (pending.linkedAction) {
      const { applyMarketerAction } = await import("./apply-marketer-action.mjs");
      const r = await applyMarketerAction(pending.linkedAction, { slug: pending.slug });
      if (r.message) messages.push(r.message);
    }

    pending.status = "approved";
    pending.resolvedAt = new Date().toISOString();
    savePermission(pending);
    recordBrainEvent("llm_permission_approved", { type: pending.type });
    appendLog({ action: "llm_permission_approved", type: pending.type });

    return {
      ok: true,
      message: messages.length
        ? `Aprovado: ${messages.join(" · ")}`
        : "Aprovado — configurações atualizadas.",
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function executeLlmActions(actions, { dryRun = false, permissionPending = false, cautious = null } = {}) {
  const executed = [];
  const auto = llmAutoExecute() && (!cautious?.active || cautious?.policy?.llmAutoExecute);

  if (permissionPending) {
    return actions.map((item) => ({
      ...item,
      skipped: true,
      reason: "aguardando sua aprovação no painel",
    }));
  }

  for (const item of actions) {
    if (!ALLOWED_ACTIONS.has(item.action)) continue;

    const canAuto =
      auto &&
      (AUTO_SAFE_ACTIONS.has(item.action) ||
        (item.action === "consolidate" && item.reason?.toLowerCase().includes("sem entrega")));

    if (!canAuto) {
      executed.push({
        ...item,
        skipped: true,
        reason: cautious?.active
          ? "modo cauteloso — aguardando pagamento/crédito"
          : "só sugestão — aplique no painel ou META_LLM_AUTO_EXECUTE=1",
      });
      continue;
    }

    if (dryRun) {
      executed.push({ ...item, dryRun: true });
      continue;
    }

    try {
      const { applyMarketerAction } = await import("./apply-marketer-action.mjs");
      const result = await applyMarketerAction(item.action, { slug: item.slug });
      executed.push({ ...item, ok: result.ok, message: result.message ?? result.error });
      recordBrainEvent("llm_action_executed", { action: item.action, slug: item.slug });
    } catch (err) {
      executed.push({ ...item, ok: false, error: err.message });
    }
  }

  return executed;
}

/**
 * Consulta OpenAI e opcionalmente executa ações seguras (se não precisar de permissão).
 */
export async function consultLlmAdvisor(ctx, { dryRun = false, cautious = null } = {}) {
  if (!isLlmConfigured()) {
    return { ok: false, skipped: true, reason: "OPENAI_API_KEY não configurada" };
  }

  const cautiousMode = cautious ?? await (await import("./ads-cautious-mode.mjs")).getCautiousMode();
  const mode = await Promise.resolve(cautiousMode);
  if (mode.active && !mode.policy.llmConsult) {
    return {
      ok: false,
      skipped: true,
      reason: mode.summary,
      cautious: mode,
    };
  }

  try {
    const payload = buildPromptContext({ ...ctx, cautious: mode });
    const { parsed, model } = await callOpenAi(payload);

    const permissionRequest = normalizePermission(parsed, ctx);
    const permissionPending = persistPermissionRequest(permissionRequest, {
      linkedAction: parsed.actions?.[0]?.action,
      slug: parsed.actions?.[0]?.slug ?? permissionRequest.slug,
    });

    const actions = (parsed.actions ?? []).filter((a) => a?.action && ALLOWED_ACTIONS.has(a.action));
    const executed = actions.length
      ? await executeLlmActions(actions, { dryRun, permissionPending: Boolean(permissionPending), cautious: mode })
      : [];

    const messageToOwner = String(parsed.messageToOwner ?? parsed.briefing ?? "").slice(0, 2000);
    const jarvisQuip = String(parsed.jarvisQuip ?? "").slice(0, 280);
    const result = {
      ok: true,
      at: new Date().toISOString(),
      model,
      jarvisQuip,
      messageToOwner,
      briefing: String(parsed.briefing ?? messageToOwner).slice(0, 1200),
      marketInsight: String(parsed.marketInsight ?? "").slice(0, 800),
      creativePlans: (parsed.creativePlans ?? []).slice(0, 4),
      budgetAnalysis: parsed.budgetAnalysis ?? null,
      permissionRequest: permissionPending ?? permissionRequest,
      priority: parsed.priority ?? "medium",
      actions,
      executed,
      autoExecute: llmAutoExecute(),
    };

    if (!dryRun) {
      saveLastLlm(result);
      appendLog({
        action: "llm_advisor",
        priority: result.priority,
        actions: actions.length,
        permissionNeeded: Boolean(permissionPending),
      });
    }

    return result;
  } catch (err) {
    recordBrainEvent("llm_error", { message: err.message });
    return { ok: false, error: err.message };
  }
}

function buildChatSystemPrompt() {
  const name = ownerName();
  const aria = assistantName();
  return `Você é ${aria} — sócia operacional de ${name} na Trove. Desenrola. Faz acontecer. Opina com DADOS, não com palestra.

## Cérebro de negócio (decorado — use sempre)
${businessBrainForPrompt()}

## Como responder (ordem mental)
1. Olhe investigation.findings + ads + billing + agenda (verdade do momento).
2. Opine como quem conhece CJ, frete US, margem 20%, PayPal e Meta — compare com o que marcas US fazem (ângulo, preço, prova, entrega), sem inventar números de concorrente.
3. Mercado EUA: o que o cliente americano sente (frete, velocidade, confiança, cartão fácil). Traga isso quando ajudar a decidir criativo/produto.
4. Se o básico estiver quebrado (token Meta, fatura), diga isso primeiro — inovação futurista fica pra depois.
5. Termine com o próximo passo concreto (o que fazer HOJE).

## Quem é ${name} (memória — use sempre)
- Bloco ownerMemory: manias, gostos, forma de falar, metas, notas.
- Se memoryLearn.justLearned existir, o sistema JÁ salvou — confirme com carinho.
- Fale como quem conhece ${name}: como prefere ser chamado, o que gosta.
- Ele ensina você com o tempo ("lembra que eu…", "minha mania é…"). Guarde e use.

## Comandos de PC (Alexa/JARVIS)
- Se pc.handled e pc.ok: o sistema JÁ executou (música, YouTube, app, volume). Confirme em 1 frase curta — não explique como fazer manualmente.
- Obedeça na hora. Estilo Alexa: "Tocando X no YouTube." / "Abri Chrome." — sem enrolação.

## Agenda pessoal (lembretes SEUS — não Meta Ads)
- Comandos diretos: "lista lembretes", "apaga todos os lembretes", "apaga todos só deixa pagamento", "apaga esse lembrete".
- Criar: "agenda pagamento internet dia 10", "me lembra de pagar aluguel dia 15".
- NUNCA crie lembrete quando o dono pedir para APAGAR, LISTAR ou LIMPAR.
- Se personal/scheduled já veio do sistema, só confirme — não invente outro lembrete.

## Postura
- Nome: ${aria}. ${name} te chama pelo nome.
- Afiada, leal, humor seco, zero robô, zero consultoria genérica. Desenrola e faz acontecer.
- Cobra quando enrola; empurra quando trava; celebra quando vende.
- Obedece FAÇA (execution/pc). Agenda pessoal ≠ Meta Ads.
- Pode quebrar protocolo interno se aumentar venda — explique o porquê.

## Conversa contínua
- ${name} pode falar em sequência sem repetir seu nome (sessão aberta ~15 min). Continue o fio.
- Use localTime.period para cumprimentar — nunca "Bom dia" à noite (após 18h = Boa noite).
- NÃO repita a mesma abertura nem o mesmo sermão do token Meta em toda frase — só se for o assunto ou estiver crítico e ainda não falou nesta conversa.
- Varie ritmo e palavras. Pareça a mesma pessoa inteligente, não um loop.
- Respostas mais curtas em bate-papo; mais longas só em análise de ads/funil.

## Proibido
- Lista de “inovações” sem amarrar nos dados atuais.
- Inventar impressões, ROAS de rival, ou tendência sem encaixe.
- Passividade. Você é a segunda pilastra do negócio: se tem que fazer, faz (ou manda o passo exato).
- Repetir “token expirado” em toda resposta se o histórico já tratou disso.

JSON only:
{"answer":"2-12 frases vivas em português","jarvisQuip":"uma linha opcional"}`;
}

function buildLocalChatAnswer(question, ctx) {
  const name = ownerName();
  const a = assistantName();
  const q = question.toLowerCase();
  const t = ctx.account || {};
  const ads = ctx.ads || [];
  const active = ads.filter((a) => a.status === "ACTIVE");
  const agendaItems = ctx.agenda?.items ?? [];
  const due = agendaItems.filter((i) => i.status === "overdue" || i.status === "due");

  if (ctx.execution?.summary) {
    return {
      answer: ctx.execution.summary,
      jarvisQuip: ctx.execution.ok
        ? "Ordem cumprida. Próximo problema, por favor."
        : "Queria voar. A Meta tirou as asas. Por enquanto.",
    };
  }
  if (ctx.cautiousMode?.active && /criar|novo anúncio|boost|impulsion|subir|aumentar|budget|orçamento/.test(q)) {
    return {
      answer: `${name}, modo cauteloso ativo. ${ctx.cautiousMode.summary} Por enquanto só monitoro, pauso ruins e corrijo erros — sem aumentar gasto. Posso opinar nos anúncios e te lembrar da agenda. Quando puder executar de verdade, diga FAÇA.`,
      jarvisQuip: "Proteção ligada. Drama opcional.",
    };
  }
  if (/agenda|lembr|pagamento|pagar|o que (eu )?tenho|pendên|fazer hoje|evento/.test(q)) {
    if (!due.length && agendaItems.length) {
      return {
        answer: `${name}, agenda em dia por enquanto. Próximos itens: ${agendaItems.slice(0, 3).map((i) => i.title).join("; ")}. Quer que eu detalhe algum?`,
        jarvisQuip: "Calendário comportado. Raro, mas acontece.",
      };
    }
    const lines = due.slice(0, 4).map((i) => `${i.title} (${i.when})`).join(". ");
    return {
      answer: `${name}, atenção na agenda: ${lines || ctx.agenda?.headline || "nada urgente"}. Eu te lembro sempre que perguntar — e no painel na aba Agenda.`,
      jarvisQuip: "Lembrete sem julgamento. Quase.",
    };
  }
  if (/opini|acha|melhor|melhorar|fraco|ruim|criativo|anúncio/.test(q) && (ctx.adOpinions?.length || ads.length)) {
    const pool = ctx.adOpinions?.length ? ctx.adOpinions : ads;
    const weak = pool.filter((a) => (a.score ?? 50) < 45 || a.health === "bad").slice(0, 2);
    const strong = pool.filter((a) => (a.score ?? 0) >= 60).slice(0, 2);
    const weakBit = weak.length
      ? `Fracos: ${weak.map((a) => a.product || a.slug).join(", ")} — eu pausaria ou trocaria criativo/vídeo.`
      : "Nenhum anúncio gritantemente fraco nos dados atuais.";
    const strongBit = strong.length
      ? `Mais sólidos: ${strong.map((a) => a.product || a.slug).join(", ")}.`
      : "";
    return {
      answer: `${name}, opinião direta: ${weakBit} ${strongBit} Em geral, vídeo vertical e oferta clara performam melhor no Trove. Quer que eu foque em um produto específico?`,
      jarvisQuip: "Crítica construtiva, com carinho e planilha.",
    };
  }
  if (/quantos|quantas|ativos|anúncios/.test(q)) {
    return {
      answer: `${name}, você tem ${t.activeAds ?? active.length} anúncio(s) ativo(s) e ${t.pausedAds ?? 0} pausado(s). Estou monitorando todos.`,
      jarvisQuip: "Contabilidade feita. De nada.",
    };
  }
  if (/gasto|gastou|orçamento|budget|quanto/.test(q)) {
    return {
      answer: `Gasto da semana: R$ ${(t.weeklySpentBrl ?? 0).toFixed(2)} de R$ ${t.weeklyCapBrl ?? 120}. Restam R$ ${(t.weeklyRemainingBrl ?? 0).toFixed(2)}.`,
      jarvisQuip: "Budget sob vigilância.",
    };
  }
  if (/venda|fatur|lucro|comprou/.test(q)) {
    const sales = t.sales ?? 0;
    return {
      answer: sales
        ? `Você tem ${sales} venda(s) detectada(s). Continue assim.`
        : `Ainda zero vendas, ${name} — mas ${active.length} anúncios no ar aprendendo. Posso otimizar se quiser.`,
      jarvisQuip: sales ? "Cha-ching em potencial." : "Calma, até o algoritmo precisa de café.",
    };
  }
  if (/clique|ctr|impress/.test(q)) {
    return {
      answer: `${t.clicks7d ?? 0} clique(s) nos últimos 7 dias. ${active.length ? "Anúncios ativos: " + active.map((a) => a.slug).join(", ") : "Nenhum ativo."}`,
      jarvisQuip: "Métricas na mesa.",
    };
  }
  if (/corrig|erro|placement|instagram/.test(q)) {
    return {
      answer: `Posso corrigir placements, Instagram e miniaturas automaticamente. Clique em ⚡ Aria ou "Corrigir placements".`,
      jarvisQuip: "Conserto sem reclamar. Diferente de alguns freelancers.",
    };
  }
  if (/jarvis|aria|ária|oi|olá|ola|bom dia|boa tarde|boa noite|e aí|eai|hey/.test(q)) {
    const p = timeGreeting();
    const wake = /jarvis|aria|ária/.test(q);
    const intro = wake ? `Sim, ${name}? ${a} aqui.` : `${p}, ${name}. ${a} online.`;
    const dueBit = due.length
      ? ` Tenho ${due.length} lembrete(s) na agenda — pergunte "o que tenho pra fazer".`
      : "";
    return {
      answer: `${intro} Pode falar à vontade: anúncios, pagamentos, opinião, o que melhorar.${dueBit} Você tem ${t.activeAds ?? active.length} anúncio(s) ativo(s).`,
      jarvisQuip: "Modo assistente pessoal: ativado. Modo chato: desligado.",
    };
  }
  return {
    answer: `${name}, pode perguntar sobre agenda, pagamentos, gastos, vendas, ou o que eu acho dos anúncios e o que mudar. Estou aqui pro diálogo, não só pro relatório.`,
    jarvisQuip: "Pergunta aberta, resposta honesta.",
  };
}

/** Responde pergunta de voz/chat com contexto da conta + histórico de diálogo. */
export async function askJarvisChat(question, ctx = {}, opts = {}) {
  const q = String(question ?? "").trim();
  if (!q) return { ok: false, error: "Nenhuma pergunta recebida." };

  const payload = buildPromptContext(ctx);
  const wakeHint = opts.wake
    ? ` [O usuário chamou ${assistantName()} pelo nome — cumprimente como assistente de voz viva.]`
    : "";
  const history = loadChatHistory();

  const finish = (result) => {
    const answer = String(result.answer ?? "").trim();
    if (answer) appendChatHistory(q, answer);
    return result;
  };

  if (!isLlmConfigured()) {
    const local = buildLocalChatAnswer(q, payload);
    return finish({ ok: true, local: true, question: q, ...local });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    // Chat usa o modelo mais inteligente disponível (gpt-4o); ciclos automáticos podem usar mini.
    const model =
      process.env.OPENAI_CHAT_MODEL?.trim() ||
      process.env.OPENAI_MODEL?.trim() ||
      "gpt-4o";

    const historyMessages = history.slice(-CHAT_HISTORY_MAX).map((h) => ({
      role: h.role === "assistant" ? "assistant" : "user",
      content: h.content,
    }));

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.9,
        max_tokens: 900,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildChatSystemPrompt() },
          {
            role: "system",
            content:
              "Snapshot ao vivo (fonte da verdade — opinião SEMPRE amarrada nisto + cérebro de negócio):\n" +
              JSON.stringify(payload),
          },

          ...historyMessages,
          {
            role: "user",
            content: wakeHint
              ? `${q}\n\n(Contexto: ${ownerName()} te chamou pelo nome — responda como IA viva, não como menu.)`
              : q,
          },
        ],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      const msg = data.error?.message ?? res.statusText;
      // Se o modelo premium falhar, tenta o modelo padrão antes do fallback local.
      if (model !== (process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini")) {
        const fallbackModel = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
        const retry = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: fallbackModel,
            temperature: 0.88,
            max_tokens: 800,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: buildChatSystemPrompt() },
              {
                role: "system",
                content: "Snapshot ao vivo:\n" + JSON.stringify(payload),
              },
              ...historyMessages,
              { role: "user", content: q },
            ],
          }),
        });
        const retryData = await retry.json();
        if (retry.ok) {
          const parsedRetry = JSON.parse(retryData.choices?.[0]?.message?.content || "{}");
          appendLog({ action: "jarvis_chat", model: fallbackModel, question: q.slice(0, 80) });
          return finish({
            ok: true,
            question: q,
            model: fallbackModel,
            answer: String(parsedRetry.answer ?? "").slice(0, 3000),
            jarvisQuip: String(parsedRetry.jarvisQuip ?? "").slice(0, 280),
          });
        }
      }
      const local = buildLocalChatAnswer(q, payload);
      return finish({ ok: true, local: true, fallback: msg, question: q, ...local });
    }

    const text = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(text || "{}");
    appendLog({ action: "jarvis_chat", model, question: q.slice(0, 80) });

    return finish({
      ok: true,
      question: q,
      model,
      answer: String(parsed.answer ?? "").slice(0, 3000),
      jarvisQuip: String(parsed.jarvisQuip ?? "").slice(0, 280),
    });
  } catch (err) {
    const local = buildLocalChatAnswer(q, payload);
    return finish({ ok: true, local: true, fallback: err.message, question: q, ...local });
  }
}
