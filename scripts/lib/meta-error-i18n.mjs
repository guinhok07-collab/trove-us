/**
 * Traduz erros técnicos (Meta, API, rede) para mensagens claras em português.
 */

const RULES = [
  {
    test: /User request limit reached|Application request limit|\(#4\)|\(\#4\)|code.?4\b|\[4\]|rate limit|too many calls|(#17\b|code.?17\b)/i,
    pt: "Limite temporário da Meta — seus anúncios continuam no ar. Aguarde 15–30 min; o painel usa cache e tenta de novo sozinho.",
    code: "meta_rate_limit",
    severity: "warn",
  },
  {
    test: /code.?190|expired|session has expired|token expir/i,
    pt: "Token Meta expirado — renove no Meta Business → Configurações → gere novo token e atualize no .env.local.",
    code: "meta_token_expired",
    severity: "error",
  },
  {
    test: /Invalid OAuth|OAuthException|invalid access token/i,
    pt: "Token Meta inválido — confira META_ACCESS_TOKEN no .env.local.",
    code: "meta_token_invalid",
    severity: "error",
  },
  {
    test: /Missing META_ACCESS_TOKEN|META_AD_ACCOUNT|META_PAGE_ID|Meta API não configurada|Meta não configurada/i,
    pt: "Meta Ads não configurado — preencha token, conta e página no .env.local.",
    code: "meta_not_configured",
    severity: "error",
  },
  {
    test: /ECONNREFUSED|ENOTFOUND|fetch failed|network|timeout|ETIMEDOUT|abort/i,
    pt: "Sem conexão com a internet ou serviço fora do ar — verifique sua rede e tente de novo.",
    code: "network",
    severity: "warn",
  },
  {
    test: /Já tem um comando rodando/i,
    pt: "Já existe uma tarefa em andamento — aguarde terminar (1–3 min) e tente novamente.",
    code: "job_running",
    severity: "warn",
  },
  {
    test: /Permission denied|permissions error|not authorized|insufficient permission/i,
    pt: "Permissão insuficiente na conta Meta — o token precisa de acesso a anúncios e campanhas.",
    code: "meta_permission",
    severity: "error",
  },
  {
    test: /Image not found|sem vídeo|creative/i,
    pt: "Criativo faltando — rode «Criar anúncios» ou npm run social:pack para gerar imagem/vídeo.",
    code: "creative_missing",
    severity: "warn",
  },
  {
    test: /Meta API .*:\s*\[(\d+)\]/i,
    pt: null, // handled below with generic Meta wrapper
    code: "meta_api",
    severity: "error",
  },
];

let lastError = null;

export function getLastUserError() {
  return lastError;
}

export function setLastUserError(err) {
  const translated = translateMetaError(err);
  lastError = {
    ...translated,
    at: new Date().toISOString(),
  };
  return lastError;
}

export function isRateLimitError(input) {
  const msg = typeof input === "string" ? input : input?.message ?? "";
  const code = typeof input === "object" ? input?.code : null;
  return (
    code === 4 ||
    code === 17 ||
    /User request limit reached|Application request limit|\(#4\)|rate limit|too many calls/i.test(msg)
  );
}

/**
 * @returns {{ message: string, code: string, severity: "error"|"warn"|"info", raw?: string }}
 */
export function translateMetaError(err) {
  const raw = typeof err === "string" ? err : err?.message ?? String(err ?? "Erro desconhecido");
  const trimmed = raw.trim();

  for (const rule of RULES) {
    if (rule.test.test(trimmed)) {
      if (rule.pt) {
        return { message: rule.pt, code: rule.code, severity: rule.severity, raw: trimmed };
      }
    }
  }

  // Meta API genérico — remove path técnico
  const metaMatch = trimmed.match(/Meta (?:API )?[^:]*:\s*\[\d+\]\s*(.+)/i);
  if (metaMatch) {
    const inner = metaMatch[1].trim();
    for (const rule of RULES) {
      if (rule.pt && rule.test.test(inner)) {
        return { message: rule.pt, code: rule.code, severity: rule.severity, raw: trimmed };
      }
    }
    return {
      message: `Meta retornou erro: ${inner}`,
      code: "meta_api",
      severity: "error",
      raw: trimmed,
    };
  }

  if (/^[A-Za-z_]+ is not defined|SyntaxError|TypeError|Cannot read prop/i.test(trimmed)) {
    return {
      message: "Erro interno do painel — recarregue a página. Se persistir, reinicie o ícone Trove.",
      code: "internal",
      severity: "error",
      raw: trimmed,
    };
  }

  return { message: trimmed, code: "unknown", severity: "error", raw: trimmed };
}

/** Para respostas JSON da API */
export function userErrorMessage(err) {
  return translateMetaError(err).message;
}
