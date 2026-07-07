/**
 * Modo cauteloso — opera com proteção quando há problema de pagamento/crédito.
 * Monitora e protege budget; bloqueia ações que gastam mais ou arriscam.
 */
import { verifyOpenAiStatus } from "./ads-llm-advisor.mjs";
import { isMetaAdsConfigured, verifyAdAccountBilling } from "./meta-ads-api.mjs";

let cautiousCache = { at: 0, billing: null, mode: null };
const CAUTIOUS_TTL_MS = 10 * 60 * 1000;

/**
 * @param {{ openai?: object, metaPayment?: object }} billing
 */
export function buildCautiousMode(billing = {}) {
  const reasons = [];
  const metaPaymentIssue =
    billing.metaPayment?.configured && billing.metaPayment.paymentOk === false;
  const openaiIssue = billing.openai?.configured && billing.openai.billingOk === false;

  if (metaPaymentIssue) {
    reasons.push({
      code: "meta_payment",
      title: "Pagamento Meta pendente",
      detail: billing.metaPayment.detail,
      url: "https://business.facebook.com/billing",
    });
  }
  if (openaiIssue) {
    reasons.push({
      code: "openai_billing",
      title: "OpenAI sem crédito",
      detail: billing.openai.detail,
      url: "https://platform.openai.com/settings/organization/billing",
    });
  }

  const active = reasons.length > 0;

  const policy = {
    monitor: true,
    pauseBadAds: true,
    fixPlacements: true,
    safeMetaRecs: true,
    consolidation: true,
    boost: !metaPaymentIssue,
    scale: !metaPaymentIssue,
    createAds: !metaPaymentIssue,
    increaseBudget: !metaPaymentIssue,
    llmConsult: !openaiIssue,
    llmAutoExecute: !active,
  };

  const lines = [];
  if (active) {
    lines.push("Modo cauteloso ativo — protegendo sua conta.");
    if (metaPaymentIssue) {
      lines.push("Meta: só monitoro, pauso ruins e corrijo erros. Sem criar anúncio nem subir budget.");
    }
    if (openaiIssue) {
      lines.push("OpenAI: JARVIS no modo básico até você recarregar crédito.");
    }
  }

  return {
    active,
    reasons,
    policy,
    summary: lines.join(" "),
    headline: active
      ? `Operando com cautela (${reasons.map((r) => r.title).join(" · ")})`
      : "Operação normal",
    allows: active
      ? [
          ...(!openaiIssue ? ["Conversar com JARVIS (IA)"] : []),
          "Monitorar métricas",
          "Pausar anúncios ruins",
          "Corrigir placements",
          "Alertar no Telegram",
        ]
      : ["Tudo liberado dentro do teto semanal"],
    blocks: active
      ? [
          ...(metaPaymentIssue ? ["Criar anúncios novos", "Impulsionar / escalar budget", "Aumentar gasto"] : []),
          ...(openaiIssue ? ["Consultora IA completa", "Execução automática da IA"] : []),
          ...(!openaiIssue && metaPaymentIssue ? ["Execução automática da IA nos ads"] : []),
        ]
      : [],
  };
}

export async function getCautiousMode({ force = false, billing: billingIn } = {}) {
  if (billingIn) {
    const mode = buildCautiousMode(billingIn);
    cautiousCache = { at: Date.now(), billing: billingIn, mode };
    return { ...mode, billing: billingIn };
  }

  const now = Date.now();
  if (!force && cautiousCache.mode && now - cautiousCache.at < CAUTIOUS_TTL_MS) {
    return { ...cautiousCache.mode, billing: cautiousCache.billing };
  }

  const [openai, metaPayment] = await Promise.all([
    verifyOpenAiStatus({ force }).catch((err) => ({
      configured: Boolean(process.env.OPENAI_API_KEY?.trim()),
      billingOk: false,
      detail: err.message,
    })),
    isMetaAdsConfigured()
      ? verifyAdAccountBilling({ force }).catch((err) => ({
          configured: true,
          paymentOk: false,
          detail: err.message,
        }))
      : Promise.resolve({ configured: false, paymentOk: true }),
  ]);

  const billing = { openai, metaPayment };
  const mode = buildCautiousMode(billing);
  cautiousCache = { at: now, billing, mode };
  return { ...mode, billing };
}

export function getCautiousModeFromBilling(billing) {
  return buildCautiousMode(billing);
}

export function invalidateCautiousCache() {
  cautiousCache = { at: 0, billing: null, mode: null };
}
