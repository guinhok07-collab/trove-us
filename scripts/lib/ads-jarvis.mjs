/**
 * JARVIS — orquestrador central Trove (diagnóstico + correção + consultora + relatório).
 * Env: META_JARVIS_MODE=1, META_OWNER_NAME, OPENAI_API_KEY
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { runAutoWatch, loadState, saveState } from "./ads-auto-engine.mjs";
import { bootstrapAutopilotBrain } from "./ads-autopilot-brain.mjs";
import { applyPlacementFixes } from "./ads-placement-advisor.mjs";
import { processMetaRecommendations } from "./meta-recommendation-executor.mjs";
import { rankAds } from "./ads-intelligence.mjs";
import { isMetaAdsConfigured, verifyMetaToken } from "./meta-ads-api.mjs";
import { appendLog } from "./ads-log.mjs";
import { sendJarvisTelegram } from "./telegram-notify.mjs";
import { isLlmConfigured, consultLlmAdvisor, getPendingPermission } from "./ads-llm-advisor.mjs";
import { getCautiousMode, buildCautiousMode } from "./ads-cautious-mode.mjs";
import { ownerName, assistantName, timeGreeting, alignGreetingPeriod } from "./assistant-identity.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const JARVIS_STATE_PATH = resolve(root, "marketing/social/jarvis-last.json");
const SITE = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://trove-us.com";

export function isJarvisMode() {
  return process.env.META_JARVIS_MODE !== "0";
}

function assistant() {
  return assistantName();
}

function loadJarvisState() {
  if (!existsSync(JARVIS_STATE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(JARVIS_STATE_PATH, "utf8"));
  } catch {
    return null;
  }
}

function saveJarvisState(data) {
  mkdirSync(dirname(JARVIS_STATE_PATH), { recursive: true });
  writeFileSync(JARVIS_STATE_PATH, JSON.stringify(data, null, 2), "utf8");
}

const STANDBY_QUIPS = [
  "Sistemas online. Anúncios sob vigilância — pode relaxar.",
  "Tudo calmo. Suspeitosamente calmo, inclusive.",
  "Monitorando Meta Ads. Nenhum drama até o momento.",
  "Seus criativos estão mais presentáveis que slide de reunião.",
  "Budget sob controle. Eu vigio, você fatura.",
];

export function buildJarvisGreeting({ totals = {}, weeklyBudget = {} } = {}) {
  const name = ownerName();
  const period = timeGreeting();
  const sales = totals.salesTotal ?? 0;
  const active = totals.active ?? 0;
  const paused = totals.paused ?? 0;
  const spend = Number(weeklyBudget.spentBrl ?? totals.spend ?? 0);
  const cap = Number(weeklyBudget.capBrl ?? 120);
  const clicks = totals.clicks ?? 0;
  const roas = totals.roas;

  const a = assistant();
  if (sales > 0) {
    return `${period}, ${name}. ${a} aqui — ${sales} venda(s), ${active} anúncio(s) ativo(s), gasto R$ ${spend.toFixed(2)} de R$ ${cap}. Pode falar comigo.`;
  }
  if (clicks > 0) {
    return `${period}, ${name}. ${a} online — ${clicks} clique(s), ${active} anúncios ativos. Me chama pelo nome.`;
  }
  if (active > 0) {
    const roasBit = roas ? ` ROAS ${roas.toFixed(2)}x.` : "";
    return `${period}, ${name}. ${a} aqui — ${active} anúncio(s) no ar${paused ? ` (${paused} pausados)` : ""}.${roasBit} É só falar.`;
  }
  return `${period}, ${name}. ${a} online. Me chama pelo nome — ads, agenda, PC, o que precisar.`;
}

export function getJarvisStatusForUi({ totals = {}, weeklyBudget = {}, billing = {} } = {}) {
  const last = loadJarvisState();
  const permission = getPendingPermission();
  const online = isMetaAdsConfigured();
  const name = ownerName();
  const greeting = buildJarvisGreeting({ totals, weeklyBudget });
  const llmFresh =
    last?.at && Date.now() - new Date(last.at).getTime() < 4 * 3600 * 1000 && last.messageToOwner;

  const openaiConfigured = isLlmConfigured();
  const openaiBillingOk = billing.openai?.billingOk !== false;
  const metaPaymentOk = billing.metaPayment?.paymentOk !== false;
  const cautious = buildCautiousMode(billing);
  const hasPaymentIssue = cautious.active;

  let status = last?.status ?? (online ? "standby" : "offline");
  if (cautious.active) status = "permission";

  let messageToOwner = llmFresh ? alignGreetingPeriod(last.messageToOwner) : greeting;
  // Não entope a fala com texto de sistema; só avisa se for crítico e ainda não veio da IA.
  if (cautious.active && !llmFresh) {
    const blockers = (cautious.reasons || []).map((r) => r.title).join(", ");
    messageToOwner = `${greeting} Atenção: ${blockers || "tem bloqueio na conta"}. Me pergunta qualquer coisa — eu investigo.`;
  }

  return {
    mode: isJarvisMode(),
    online,
    llm: openaiConfigured && openaiBillingOk,
    llmConfigured: openaiConfigured,
    llmBillingOk: openaiConfigured ? openaiBillingOk : null,
    llmBillingDetail: billing.openai?.detail,
    metaPaymentOk,
    metaPaymentDetail: billing.metaPayment?.detail,
    paymentAlert: hasPaymentIssue,
    cautious,
    ownerName: name,
    greeting,
    at: last?.at ?? null,
    status,
    headline: cautious.active ? messageToOwner : (last?.headline ?? greeting),
    messageToOwner,
    jarvisQuip:
      llmFresh && last?.jarvisQuip
        ? last.jarvisQuip
        : STANDBY_QUIPS[Math.floor(Date.now() / 60000) % STANDBY_QUIPS.length],
    fixesApplied: last?.fixesApplied ?? [],
    systems: last?.systems ?? {},
    permissionRequest: permission,
    priority: last?.priority ?? "medium",
  };
}

async function scanSystems() {
  const cautious = await getCautiousMode();
  const systems = {
    meta: { ok: false, label: "Meta Ads" },
    openai: { ok: false, label: "Consultora OpenAI" },
    telegram: {
      ok: Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim() && process.env.TELEGRAM_CHAT_ID?.trim()),
      label: "Telegram",
    },
    site: { ok: false, label: "Site Trove" },
  };

  if (isMetaAdsConfigured()) {
    try {
      const t = await verifyMetaToken();
      const payOk = cautious.billing?.metaPayment?.paymentOk !== false;
      systems.meta = {
        ok: t.ok && payOk,
        label: "Meta Ads",
        detail: !payOk
          ? cautious.billing?.metaPayment?.detail ?? "Pagamento pendente"
          : t.ok
            ? "Conectada"
            : t.error,
      };
    } catch (err) {
      systems.meta = { ok: false, label: "Meta Ads", detail: err.message };
    }
  } else {
    systems.meta = { ok: false, label: "Meta Ads", detail: "API não configurada" };
  }

  if (isLlmConfigured()) {
    const o = cautious.billing?.openai;
    systems.openai = {
      ok: Boolean(o?.billingOk),
      label: "Consultora OpenAI",
      detail: o?.detail ?? "Verificando…",
    };
  } else {
    systems.openai = { ok: false, label: "Consultora OpenAI", detail: "Sem API key" };
  }

  try {
    const res = await fetch(`${SITE}/api/health`, { signal: AbortSignal.timeout(8000) });
    systems.site = { ok: res.ok, label: "Site Trove", detail: res.ok ? SITE : `HTTP ${res.status}` };
  } catch {
    systems.site = { ok: false, label: "Site Trove", detail: "Sem resposta" };
  }

  return systems;
}

async function jarvisPreflightFixes({ dryRun = false } = {}) {
  const fixes = [];
  if (!isMetaAdsConfigured() || dryRun) return fixes;

  const state = loadState();
  const ads = Object.entries(state.ads ?? {}).map(([slug, meta]) => ({ slug, ...meta }));
  const { top } = rankAds(ads);

  try {
    const { pauseEmptyTroveCampaigns } = await import("./meta-campaigns.mjs");
    const clean = await pauseEmptyTroveCampaigns(state.campaignId, { dryRun: false });
    if (clean.paused?.length) {
      fixes.push({ type: "cleanup", detail: `${clean.paused.length} campanha(s) vazia(s) pausada(s)` });
    }
  } catch {
    /* ignore */
  }

  try {
    const placement = await applyPlacementFixes({
      state: loadState(),
      saveState,
      dryRun: false,
      topAd: top,
    });
    if (placement.applied?.length) {
      fixes.push({
        type: "placement-fix",
        detail: `${placement.applied.length} correção(ões) de placement`,
      });
    }
  } catch (err) {
    fixes.push({ type: "placement-fix", detail: `Falhou: ${err.message}`, error: true });
  }

  try {
    const metaRecs = await processMetaRecommendations({
      state: loadState(),
      dryRun: false,
      topAd: top,
    });
    if (metaRecs.applied?.length) {
      fixes.push({ type: "meta-recs", detail: `${metaRecs.applied.length} recomendação(ões) Meta` });
    }
  } catch (err) {
    fixes.push({ type: "meta-recs", detail: `Falhou: ${err.message}`, error: true });
  }

  return fixes;
}

function buildHeadline({ systems, fixes, watch, llm, permission }) {
  const name = ownerName();
  if (permission?.needed) {
    return `${name}, preciso da sua aprovação para o próximo passo.`;
  }
  if (fixes.length) {
    return `${name}, corrigi ${fixes.length} coisa(s) automaticamente.`;
  }
  if (!systems.meta?.ok) {
    return `${name}, Meta desconectada — não consigo operar os anúncios.`;
  }
  if (llm?.messageToOwner) {
    return llm.messageToOwner.split(/[.!]/)[0]?.trim() + "." || `Tudo monitorado, ${name}.`;
  }
  if (watch?.review?.paused?.length) {
    return `${name}, paussei ${watch.review.paused.length} anúncio(s) fraco(s).`;
  }
  return `${name}, sistemas estáveis — anúncios monitorados.`;
}

/**
 * Ciclo completo JARVIS: scan → corrigir → watch → consultora → relatório.
 */
export async function runJarvisCycle({ dryRun = false, skipTelegram = false, forceLlm = false } = {}) {
  const lines = [`⚡ JARVIS — Trove Autopilot`, ""];
  const name = ownerName();

  if (!isMetaAdsConfigured()) {
    return { ok: false, error: "Meta API não configurada" };
  }

  const systems = await scanSystems();
  const cautious = await getCautiousMode();
  lines.push(
    `🔌 Sistemas: Meta ${systems.meta.ok ? "✓" : "✗"} · Site ${systems.site.ok ? "✓" : "✗"} · OpenAI ${systems.openai.ok ? "✓" : "✗"} · Telegram ${systems.telegram.ok ? "✓" : "✗"}`,
  );
  if (cautious.active) {
    lines.push(`🛡️ ${cautious.summary}`);
  }

  const brain = await bootstrapAutopilotBrain();
  if (brain.lines?.length) lines.push(...brain.lines);

  const fixes = isJarvisMode() ? await jarvisPreflightFixes({ dryRun }) : [];
  if (fixes.length) {
    lines.push("", "—— Correções automáticas ——");
    for (const f of fixes) lines.push(`${f.error ? "⚠️" : "✅"} ${f.type}: ${f.detail}`);
  }

  const prevAutoExec = process.env.META_LLM_AUTO_EXECUTE;
  const allowLlmAuto = isJarvisMode() && isLlmConfigured() && cautious.policy.llmAutoExecute;
  if (allowLlmAuto) {
    process.env.META_LLM_AUTO_EXECUTE = "1";
  }

  const watch = await runAutoWatch({
    dryRun,
    skipTelegram: true,
    forceLlm: forceLlm || isJarvisMode(),
    skipPreflightFixes: isJarvisMode(),
  });

  if (prevAutoExec === undefined) delete process.env.META_LLM_AUTO_EXECUTE;
  else process.env.META_LLM_AUTO_EXECUTE = prevAutoExec;

  if (watch.message) {
    lines.push("", "—— Auto-watch ——", watch.message.split("\n").slice(2).join("\n"));
  }

  let llm = watch.llm;
  if (!llm?.ok && cautious.policy.llmConsult && isLlmConfigured() && (forceLlm || isJarvisMode())) {
    try {
      const { buildDashboardPayload } = await import("./ads-dashboard-data.mjs");
      const payload = await buildDashboardPayload({ skipHealth: true, syncFirst: false });
      if (allowLlmAuto) process.env.META_LLM_AUTO_EXECUTE = "1";
      llm = await consultLlmAdvisor({
        ads: payload.ads,
        totals: payload.totals,
        weeklyBudget: payload.weeklyBudget,
        deliveryAdvice: payload.deliveryAdvice,
        placementAdvice: payload.placementAdvice,
        metaRecs: watch.metaRecs,
        review: watch.review,
        state: loadState(),
      });
      if (prevAutoExec === undefined) delete process.env.META_LLM_AUTO_EXECUTE;
      else process.env.META_LLM_AUTO_EXECUTE = prevAutoExec;
    } catch (err) {
      llm = { ok: false, error: err.message };
    }
  }

  const permission = getPendingPermission();
  const headline = buildHeadline({ systems, fixes, watch, llm, permission });
  const status =
    !systems.meta.ok ? "offline" : cautious.active ? "awaiting_permission" : permission?.needed ? "awaiting_permission" : fixes.length ? "active" : "online";

  const report = {
    at: new Date().toISOString(),
    status,
    headline: cautious.active ? cautious.summary : headline,
    jarvisQuip: llm?.jarvisQuip || (fixes.length ? "Erros corrigidos. Você pode me agradecer depois." : `Tudo sob controle, ${name}.`),
    messageToOwner: llm?.messageToOwner || llm?.briefing || headline,
    marketInsight: llm?.marketInsight,
    creativePlans: llm?.creativePlans ?? [],
    fixesApplied: fixes,
    systems,
    cautious,
    permissionRequest: permission,
    priority: llm?.priority ?? "medium",
    watch: {
      paused: watch.review?.paused?.length ?? 0,
      boosted: watch.review?.boosted?.length ?? 0,
      created: watch.created ?? 0,
    },
  };

  if (!dryRun) {
    saveJarvisState(report);
    appendLog({
      action: "jarvis_cycle",
      status,
      fixes: fixes.length,
      permission: Boolean(permission?.needed),
    });
  }

  const msg = lines.join("\n");

  if (!dryRun && !skipTelegram) {
    await sendJarvisTelegram({
      report,
      watch,
      llm,
      fixes,
      systems,
    });
  }

  return { ok: true, report, watch, llm, fixes, systems, message: msg };
}

/** Usuário mandou executar (estilo Homem de Ferro: "faça", "pode ir", "manda ver"). */
export function isExecuteIntent(question) {
  const q = String(question ?? "").toLowerCase();
  return /\b(faça|faz isso|faz aí|faz ai|pode fazer|pode ir|executa|executar|manda ver|manda bala|vai logo|corre|otimiza|otimize|corrige tudo|aplica|aplicar|aprovo|aprovado|autorizo|pode executar)\b/i.test(
    q,
  );
}

/**
 * Executa ordens do dono: aprova permissão pendente e/ou roda ciclo JARVIS (o que a política permitir).
 */
function summarizeOrders(name, done, blocked, cautious) {
  return {
    ok: done.length > 0,
    done,
    blocked,
    cautious,
    summaryForChat: [
      done.length ? `Feito, ${name}: ${done.join(" ")}` : null,
      blocked.length ? `Não pude: ${blocked.join(" ")}` : null,
    ]
      .filter(Boolean)
      .join(" "),
  };
}

export async function executeJarvisOrders({ question = "" } = {}) {
  const name = ownerName();
  const done = [];
  const blocked = [];
  const cautious = await getCautiousMode({ force: true });

  const pending = getPendingPermission();
  if (pending && /\b(aprovo|aprovado|autorizo|pode fazer|faça|faz isso|manda ver)\b/i.test(question)) {
    const { handlePermissionDecision } = await import("./ads-llm-advisor.mjs");
    const r = await handlePermissionDecision("approve");
    if (r.ok) done.push(r.message || "Permissão aprovada e aplicada.");
    else blocked.push(r.error || "Não consegui aplicar a permissão.");
  }

  if (!isMetaAdsConfigured()) {
    blocked.push("Meta não configurada — sem token não opero anúncios.");
    return summarizeOrders(name, done, blocked, cautious);
  }

  const token = await verifyMetaToken().catch((e) => ({ ok: false, error: e.message }));
  if (token.expired || token.ok === false) {
    blocked.push(token.error || "Token Meta inválido — renove para eu operar de verdade.");
    appendLog({ action: "jarvis_execute_order", done: done.length, blocked: blocked.length });
    return summarizeOrders(name, done, blocked, cautious);
  }

  try {
    const cycle = await runJarvisCycle({
      dryRun: false,
      skipTelegram: false,
      forceLlm: true,
    });
    if (cycle.ok) {
      const parts = [];
      if (cycle.fixes?.length) {
        parts.push(`corrigi ${cycle.fixes.length} coisa(s)`);
      }
      if (cycle.watch?.review?.paused?.length) {
        parts.push(`pausei ${cycle.watch.review.paused.length} anúncio(s) fraco(s)`);
      }
      if (cycle.watch?.review?.boosted?.length && cautious.policy?.boost) {
        parts.push(`impulsionei ${cycle.watch.review.boosted.length}`);
      }
      if (cycle.watch?.created && cautious.policy?.createAds) {
        parts.push(`criei ${cycle.watch.created} anúncio(s)`);
      }
      done.push(
        parts.length
          ? `Ciclo executado: ${parts.join(", ")}.`
          : cycle.report?.headline || "Ciclo executado — monitei tudo.",
      );
      if (cautious.active) {
        done.push(
          "Modo cauteloso: não criei anúncio novo nem subi budget. Quando a Meta liberar, aí eu acelero.",
        );
      }
    } else {
      blocked.push(cycle.error || "Ciclo JARVIS falhou.");
    }
  } catch (err) {
    blocked.push(err.message);
  }

  appendLog({
    action: "jarvis_execute_order",
    done: done.length,
    blocked: blocked.length,
  });

  return summarizeOrders(name, done, blocked, cautious);
}

/** Pergunta por voz/chat — agenda pessoal, investiga, executa ordens. */
export async function askJarvis(question, opts = {}) {
  const { askJarvisChat } = await import("./ads-llm-advisor.mjs");
  const { loadState } = await import("./ads-auto-engine.mjs");
  const { investigateForQuestion, isLightConversation } = await import("./jarvis-investigate.mjs");
  const { tryPersonalFromSpeech, listPersonalItems } = await import("./jarvis-personal.mjs");
  const { isWakeOnlyUtterance } = await import("./assistant-identity.mjs");
  const { isAlexaMode, alexaStyleReply, isAlexaLocalCommand } = await import("./jarvis-alexa.mjs");

  const alexaMode = opts.alexaMode !== undefined ? Boolean(opts.alexaMode) : isAlexaMode();

  // Cumprimento só pelo nome — resposta instantânea (sem API)
  if (opts.wake || isWakeOnlyUtterance(question)) {
    const name = ownerName();
    const a = assistantName();
    const alexaHint = alexaMode
      ? " Modo Alexa — diga: coloca música X, abre YouTube, abre Chrome, volume, brilho."
      : "";
    return {
      ok: true,
      instant: true,
      model: "local-instant",
      answer: `Sim, ${name}? ${a} ouvindo.${alexaHint}`,
      jarvisQuip: alexaMode ? "Alexa mode." : "Tô aqui.",
      assistantName: a,
      alexaMode,
    };
  }

  let execution = null;
  if (isExecuteIntent(question)) {
    execution = await executeJarvisOrders({ question });
  }

  // Memória pessoal (academia, manias, gosto, "lembra que...")
  let memoryLearn = null;
  try {
    const { learnFromSpeech, memoryForPrompt } = await import("./jarvis-memory.mjs");
    memoryLearn = learnFromSpeech(question);
    if (!memoryLearn.learned?.length) memoryLearn = { learned: [], memory: memoryLearn.memory };
  } catch {
    memoryLearn = { learned: [] };
  }

  // Agenda pessoal — apagar, listar ou criar (sem confundir com conversa)
  let personal = null;
  const personalTry = tryPersonalFromSpeech(question);
  if (personalTry.disabled) {
    return {
      ok: true,
      instant: true,
      model: "local-instant",
      answer: personalTry.error,
      jarvisQuip: "Música e YouTube funcionam na hora.",
      assistantName: assistantName(),
      alexaMode,
    };
  }
  if (personalTry.ok && (personalTry.managed || personalTry.created)) {
    return {
      ok: true,
      instant: true,
      model: "local-agenda",
      answer: personalTry.message,
      jarvisQuip: personalTry.managed ? "Agenda atualizada." : "Anotei.",
      assistantName: assistantName(),
      alexaMode,
      personalAction: personalTry.action,
      scheduled: personalTry.item,
    };
  }

  // Controle do PC (brilho, volume, abrir app, YouTube, música…)
  let pc = null;
  try {
    const { tryPcCommand } = await import("./jarvis-pc.mjs");
    const pcTry = tryPcCommand(question);
    if (pcTry.handled) pc = pcTry;
  } catch (err) {
    pc = { ok: false, handled: true, error: err.message };
  }

  // Comandos de PC (música, YouTube, apps) — executa na hora, estilo Alexa/JARVIS
  if (pc?.handled && pc.ok && !execution && !personalTry?.ok) {
    const fast = alexaStyleReply(pc.message);
    fast.pc = pc;
    fast.model = "pc-instant";
    if (pc.clientPlayUrl) fast.clientPlayUrl = pc.clientPlayUrl;
    return fast;
  }

  if (pc?.handled && !pc.ok && isAlexaLocalCommand(question)) {
    const fast = alexaStyleReply(`Não consegui: ${pc.error}`);
    fast.pc = pc;
    fast.model = "pc-instant";
    return fast;
  }

  // Investigação: cache em conversa leve (rápido); completa em assunto de negócio.
  const skipHeavyInvestigate =
    alexaMode && isAlexaLocalCommand(question) && !execution && !/an[uú]ncio|meta|venda|trove|checkout|token/i.test(question);
  const { findings, payload, cautious, live } = await investigateForQuestion(question, {
    force: Boolean(execution) || (!skipHeavyInvestigate && !isLightConversation(question)),
  });
  if (pc?.handled) {
    findings.push(pc.ok ? `PC: ${pc.message}` : `PC falhou: ${pc.error}`);
  }
  const personalItems = listPersonalItems();
  findings.push(
    personalItems.length
      ? `Agenda pessoal: ${personalItems.length} item(ns) — ${personalItems
          .slice(0, 3)
          .map((i) => i.title)
          .join("; ")}.`
      : "Agenda pessoal vazia (pode pedir: agenda pagamento X dia 10).",
  );

  const result = await askJarvisChat(
    question,
    {
      ads: payload.ads,
      totals: payload.totals,
      weeklyBudget: payload.weeklyBudget,
      deliveryAdvice: payload.deliveryAdvice,
      placementAdvice: payload.placementAdvice,
      recommendations: payload.recommendations,
      review: {},
      state: loadState(),
      cautious,
      agenda: payload.agenda,
      socialOrganic: payload.socialOrganic,
      billing: payload.billing,
      metaRecs: payload.metaRecommendations,
      queue: payload.queue,
      creatives: payload.creatives,
      execution,
      personal,
      personalItems,
      pc,
      siteTraffic: payload.siteTraffic,
      memoryLearn,
      ownerMemory: (await import("./jarvis-memory.mjs").then((m) => m.memoryForPrompt()).catch(() => null)),
      investigation: {
        findings,
        live,
      },
    },
    { wake: Boolean(opts.wake), executed: Boolean(execution) },
  );

  result.investigated = true;
  result.findings = findings;
  result.model = result.model || null;
  result.assistantName = assistantName();
  result.alexaMode = alexaMode;

  if (pc?.handled) {
    result.pc = pc;
    if (pc.clientPlayUrl) result.clientPlayUrl = pc.clientPlayUrl;
    const pcMsg = pc.ok ? pc.message : `Não consegui no PC: ${pc.error}`;
    if (!result.answer?.includes(pcMsg.slice(0, 12))) {
      result.answer = `${pcMsg} ${result.answer || ""}`.trim();
    }
  }

  if (memoryLearn?.learned?.length) {
    result.memoryLearned = memoryLearn.learned;
    const bit = `Anotei sobre você: ${memoryLearn.learned.join("; ")}.`;
    if (!result.answer?.toLowerCase().includes("anotei sobre você")) {
      result.answer = `${bit} ${result.answer || ""}`.trim();
    }
  }

  if (personal?.ok) {
    result.scheduled = personal.item;
    // Garante confirmação clara mesmo se a IA divagar
    if (!result.answer?.toLowerCase().includes("anotei") && !result.answer?.toLowerCase().includes("lembro")) {
      result.answer = `${personal.message} ${result.answer || ""}`.trim();
    }
  }

  if (execution) {
    result.executed = Boolean(execution.ok);
    result.execution = execution;
    if (execution.summaryForChat) {
      const already = result.answer?.includes(execution.summaryForChat.slice(0, 20));
      if (!already) {
        result.answer = `${execution.summaryForChat} ${result.answer || ""}`.trim();
      }
    }
  }

  return result;
}
