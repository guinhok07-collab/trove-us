/**
 * JARVIS investiga antes de responder — não fica esperando, vai atrás dos dados.
 */
import { verifyOpenAiStatus } from "./ads-llm-advisor.mjs";
import {
  isMetaAdsConfigured,
  verifyMetaToken,
  verifyAdAccountBilling,
} from "./meta-ads-api.mjs";
import { getCautiousMode } from "./ads-cautious-mode.mjs";
import { loadState } from "./ads-auto-engine.mjs";

let investigateCache = { at: 0, data: null };
const INVESTIGATE_TTL_MS = 45_000;

/** Conversa leve: não precisa bater na Meta de novo. */
export function isLightConversation(question = "") {
  const q = String(question).toLowerCase();
  if (!q.trim()) return true;
  // negócio / ads / site → investigação completa
  if (
    /an[uú]ncio|meta|token|venda|fatur|roas|budget|or[cç]amento|tr[aá]fego|visita|checkout|carrinho|produto|reel|campanha|ctr|clique|impress|concorr|mercado|cj|frete|paypal|funil|escala|criar ad|fa[cç]a|otimiz/.test(
      q,
    )
  ) {
    return false;
  }
  return true;
}

/**
 * Coleta tudo que der no sistema antes da IA falar.
 * @returns {Promise<{ findings: string[], payload: object, cautious: object, live: object }>}
 */
export async function investigateForQuestion(question = "", { force = false } = {}) {
  const now = Date.now();
  const light = isLightConversation(question);
  if (
    !force &&
    investigateCache.data &&
    now - investigateCache.at < INVESTIGATE_TTL_MS &&
    light
  ) {
    return {
      ...investigateCache.data,
      findings: [
        ...investigateCache.data.findings,
        "Contexto em cache (rápido) — conversa contínua.",
      ],
      cached: true,
    };
  }

  if (!force && investigateCache.data && now - investigateCache.at < INVESTIGATE_TTL_MS && !light) {
    // negócio: reusa payload mas atualiza só token/billing se cache < 45s ainda ok for speed
    // força refresh completo se passou de 20s em pergunta de negócio
    if (now - investigateCache.at < 20_000) {
      return { ...investigateCache.data, cached: true };
    }
  }
  const q = String(question).toLowerCase();
  const findings = [];
  const live = {
    checkedAt: new Date().toISOString(),
    openai: null,
    metaToken: null,
    metaPayment: null,
  };

  const [openai, metaToken, metaPayment, cautious] = await Promise.all([
    verifyOpenAiStatus({ force: true }).catch((e) => ({
      billingOk: false,
      detail: e.message,
    })),
    isMetaAdsConfigured()
      ? verifyMetaToken().catch((e) => ({ ok: false, error: e.message }))
      : Promise.resolve({ ok: false, error: "Meta não configurada" }),
    isMetaAdsConfigured()
      ? verifyAdAccountBilling({ force: true }).catch((e) => ({
          paymentOk: false,
          detail: e.message,
        }))
      : Promise.resolve({ configured: false, paymentOk: true }),
    getCautiousMode({ force: true }),
  ]);

  live.openai = openai;
  live.metaToken = metaToken;
  live.metaPayment = metaPayment;

  if (openai.billingOk) findings.push("OpenAI com crédito — cérebro IA online.");
  else findings.push(`OpenAI: ${openai.detail || "sem crédito"}`);

  if (metaToken.ok) findings.push("Token Meta válido.");
  else if (metaToken.expired) findings.push("Token Meta EXPIRADO — bloqueia ads e Reels.");
  else findings.push(`Token Meta: ${metaToken.error || "falhou"}`);

  if (metaPayment.paymentOk === false) {
    findings.push(`Pagamento Meta: ${metaPayment.detail || "pendente"}`);
  } else if (metaPayment.configured) {
    findings.push("Pagamento Meta ok.");
  }

  const [{ buildDashboardPayload }, { getSiteTrafficReport, trafficFindingsLine }, { getPaymentIssuesSummary }] =
    await Promise.all([
      import("./ads-dashboard-data.mjs"),
      import("./trove-traffic.mjs"),
      import("./payment-issues.mjs"),
    ]);

  const [payload, siteTraffic, paymentIssues] = await Promise.all([
    buildDashboardPayload({
      skipHealth: true,
      syncFirst: false,
    }),
    getSiteTrafficReport(14),
    getPaymentIssuesSummary(),
  ]);

  // injeta billing fresco (não cache velho)
  payload.billing = { openai, metaPayment };
  payload.liveChecks = live;
  payload.siteTraffic = siteTraffic;
  payload.paymentIssues = paymentIssues;
  findings.push(trafficFindingsLine(siteTraffic));
  if (paymentIssues.openCount > 0) {
    const top = paymentIssues.recent?.[0];
    findings.push(
      `ALERTA CHECKOUT: ${paymentIssues.openCount} problema(s) de pagamento — ${top?.fullName ?? "?"}${top?.phone ? ` tel ${top.phone}` : ""}: ${(top?.problem ?? "").slice(0, 100)}.`,
    );
  }
  if (siteTraffic.topProducts?.length) {
    findings.push(
      `Produtos mais vistos: ${siteTraffic.topProducts
        .slice(0, 4)
        .map((p) => `${p.slug}(${p.views})`)
        .join(", ")}.`,
    );
  }
  if (siteTraffic.topSources?.length) {
    findings.push(
      `Fontes: ${siteTraffic.topSources
        .slice(0, 4)
        .map((s) => `${s.source}(${s.views})`)
        .join(", ")}.`,
    );
  }
  if ((siteTraffic.totals?.purchase ?? 0) === 0) {
    findings.push(
      "META DO MOMENTO: zero compras no site — prioridade absoluta é a 1ª venda (consertar token/pagamento Meta + funil no gargalo).",
    );
  }

  const ads = payload.ads ?? [];
  const active = ads.filter((a) => a.status === "ACTIVE");
  const zeroTraffic = active.filter(
    (a) => !(a.linkClicks || a.clicks) && !(a.impressions > 0),
  );

  findings.push(
    `Conta: ${active.length} ativo(s), ${payload.totals?.paused ?? 0} pausado(s), gasto 7d R$ ${Number(payload.totals?.spend ?? 0).toFixed(2)}, vendas ${payload.totals?.salesTotal ?? 0}.`,
  );

  if (zeroTraffic.length) {
    findings.push(
      `Anúncios sem tração: ${zeroTraffic.map((a) => a.product || a.slug).join(", ")}.`,
    );
  }

  const due = (payload.agenda?.items ?? []).filter(
    (i) => i.status === "overdue" || i.status === "due",
  );
  if (due.length) {
    findings.push(
      `Agenda urgente: ${due.map((i) => i.title).join(" · ")}.`,
    );
  } else {
    findings.push("Agenda sem item urgente no momento.");
  }

  if (payload.socialOrganic?.nextProduct) {
    findings.push(
      `Próximo Reel: ${payload.socialOrganic.nextProduct.product} (~${payload.socialOrganic.scheduleHour}:00).`,
    );
  }

  const state = loadState();
  findings.push(
    `Autopilot local: último watch ${state.lastWatch || "nunca"}, campanha ${state.campaignId || "—"}.`,
  );

  // Perguntas específicas → achados extras
  if (/token|meta|conect|api/.test(q)) {
    findings.push(
      metaToken.ok
        ? "Investiguei o token agora: válido."
        : `Investiguei o token agora: ${metaToken.error || "inválido"}.`,
    );
  }
  if (/pag|fatura|billing|cobran/.test(q)) {
    findings.push(
      `Investiguei billing Meta agora: ${metaPayment.detail || (metaPayment.paymentOk ? "ok" : "pendente")}.`,
    );
  }
  if (/openai|ia|crédito|credito|jarvis/.test(q)) {
    findings.push(
      `Investiguei OpenAI agora: ${openai.detail || (openai.billingOk ? "ok" : "problema")}.`,
    );
  }

  const data = {
    findings,
    payload,
    cautious: {
      ...cautious,
      billing: { openai, metaPayment },
    },
    live,
  };
  investigateCache = { at: Date.now(), data };
  return data;
}
