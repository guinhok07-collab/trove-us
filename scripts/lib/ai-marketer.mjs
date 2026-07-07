/**
 * Trove AI Marketer — agente local estilo Madgicx (auditoria + ações reais).
 */

/**
 * @param {object} input
 */
export function buildAiMarketer(input) {
  const {
    ads = [],
    totals = {},
    recommendations = { items: [], opportunityScore: 0 },
    metaRecommendations = { pending: [], opportunityScore: null },
    automation = {},
    metaLive = false,
    metaRateLimited = false,
    telegramOk = false,
    campaign = {},
    lastWatch,
    weeklyBudget = {},
    deliveryAdvice = {},
    placementAdvice = {},
  } = input;

  const issues = [];
  const wins = [];

  if (deliveryAdvice.delivery?.noDelivery) {
    issues.push(
      `${deliveryAdvice.delivery.activeCount} anúncio(s) sem impressões há ${deliveryAdvice.delivery.oldestHours}h+ — concentrar budget`,
    );
  } else if (deliveryAdvice.excess) {
    issues.push(`${totals.active} ativos — ideal ${deliveryAdvice.target ?? 3} (budget diluído)`);
  }

  if (metaRateLimited) {
    wins.push("Anúncios no ar — consultas Meta em pausa temporária");
  } else if (!metaLive) {
    issues.push("Meta desconectada — autopilot não lê métricas");
  }
  if (!automation.scheduled) issues.push("Auto-watch não agendado no PC");
  if (!telegramOk) issues.push("Telegram off — sem alertas no celular");
  if (campaign.emptyCount > 0) issues.push(`${campaign.emptyCount} campanha(s) vazia(s) no Meta`);
  if (weeklyBudget.atCap) issues.push(`Teto semanal R$ ${weeklyBudget.capBrl ?? 120} atingido — avise para subir`);
  else if (weeklyBudget.nearCap) issues.push(`Orçamento semanal ${weeklyBudget.pct}% usado`);

  const badAds = ads.filter((a) => a.health === "bad" || a.tier === "weak");
  const weakAds = ads.filter((a) => a.tier === "weak");
  if (badAds.length) issues.push(`${badAds.length} anúncio(s) com desempenho ruim`);
  if (weakAds.length) issues.push(`${weakAds.length} anúncio(s) precisam de atenção (score baixo)`);
  if (totals.salesTotal > 0) wins.push(`${totals.salesTotal} venda(s) detectada(s)`);
  if (metaLive && automation.scheduled) wins.push("Agente automático ativo 12x/dia (2h)");

  // Score 0–100 (saúde da conta + oportunidade de melhoria)
  let score = 50;
  if (metaLive) score += 20;
  if (automation.scheduled) score += 10;
  if (telegramOk) score += 5;
  if (totals.active >= 3) score += 10;
  if (totals.salesTotal > 0) score += 15;
  if (badAds.length) score -= badAds.length * 10;
  if (!metaLive && !metaRateLimited) score -= 25;
  if (campaign.emptyCount > 5) score -= 10;
  score = Math.max(0, Math.min(100, score));

  const opportunity = metaRecommendations.opportunityScore ?? recommendations.opportunityScore ?? 0;
  const potentialGain = Math.min(100, opportunity);

  const actions = buildActionQueue({ ...input, metaRecommendations });

  const briefing = buildBriefing({
    score,
    totals,
    ads,
    issues,
    wins,
    lastWatch,
    metaLive,
    metaRateLimited,
    deliveryAdvice,
    actions,
  });

  return {
    score,
    opportunity,
    metaOpportunityScore: metaRecommendations.opportunityScore ?? null,
    metaPendingCount: metaRecommendations.pendingCount ?? 0,
    potentialGain,
    status: score >= 70 ? "healthy" : score >= 45 ? "watch" : "critical",
    statusLabel: score >= 70 ? "Conta saudável" : score >= 45 ? "Em aprendizado" : "Precisa atenção",
    briefing,
    actions,
    wins,
    issues,
  };
}

function buildBriefing({ score, totals, ads, issues, wins, lastWatch, metaLive, metaRateLimited, deliveryAdvice, actions }) {
  const lines = [];

  if (metaRateLimited) {
    lines.push(
      `A Meta limitou consultas por alguns minutos — normal quando o painel atualiza muito. Seus ${totals.active || 0} anúncios continuam no ar; métricas voltam no próximo ciclo (~15–30 min).`,
    );
  } else if (!metaLive) {
    lines.push("Não consigo auditar sua conta Meta agora — renove o token no Meta Business e atualize o .env.local.");
    return lines.join(" ");
  }

  if (totals.active === 0) {
    lines.push("Nenhum anúncio ativo. Posso criar 3 da fila automaticamente — clique em Aplicar abaixo.");
    return lines.join(" ");
  }

  if (totals.spend === 0 && totals.clicks === 0 && deliveryAdvice.delivery?.noDelivery) {
    lines.push(
      `${totals.active} anúncios no ar há dias sem gasto nem views — não é aprendizado, é falta de foco. A IA pausou extras e concentrou ~R$ ${deliveryAdvice.maxDailyPerAdBrl?.toFixed(2) ?? "5,71"}/dia nos ${deliveryAdvice.target ?? 3} principais.`,
    );
  } else if (totals.spend === 0 && totals.clicks === 0) {
    lines.push(
      `Seus ${totals.active} anúncios estão no ar em fase de aprendizado. O Meta ainda não reportou gastos — normal nas primeiras horas. Deixo o auto-watch monitorando a cada 2h.`,
    );
  } else {
    const roasTxt = totals.roas ? ` · ROAS ${totals.roas.toFixed(2)}x` : "";
    lines.push(
      `Gasto $${totals.spend.toFixed(2)} · ${totals.clicks} cliques · ${totals.salesTotal} venda(s) · receita $${(totals.revenue ?? 0).toFixed(2)}${roasTxt} (7 dias).`,
    );
  }

  const needsAttention = ads.filter((a) => a.tier === "weak" || a.health === "bad");
  if (needsAttention.length) {
    lines.push(
      `${needsAttention.length} anúncio(s) com desempenho fraco — autopilot pausa ou rotaciona quando os critérios são atingidos.`,
    );
  }

  if (actions.length) {
    lines.push(`Próxima ação recomendada: ${actions[0].title.toLowerCase()}.`);
  }

  if (lastWatch) {
    const when = new Date(lastWatch).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const nextAt = new Date(new Date(lastWatch).getTime() + 2 * 60 * 60 * 1000);
    const nextWhen = nextAt.toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const overdue = Date.now() > nextAt.getTime();
    lines.push(
      overdue
        ? `Última auditoria: ${when} — próximo ciclo em breve (a cada 2h).`
        : `Última auditoria: ${when} · próximo ciclo ~${nextWhen}.`,
    );
  } else if (metaLive) {
    lines.push("Auto-watch roda a cada 2h (12x/dia) — pausa ruins, escala bons, cria anúncios se couber no teto.");
  }

  return lines.join(" ");
}

function buildActionQueue(input) {
  const {
    ads = [],
    recommendations = { items: [] },
    metaRecommendations = { pending: [] },
    campaign = {},
    totals = {},
    metaLive = false,
    metaRateLimited = false,
    deliveryAdvice = {},
    placementAdvice = {},
    telegramOk = false,
  } = input;

  const queue = [];

  if (!metaLive && !metaRateLimited) {
    queue.push({
      id: "fix_token",
      title: "Reconectar Meta API",
      detail: "Atualize META_ACCESS_TOKEN no .env.local",
      applyAction: null,
      priority: 100,
      auto: false,
    });
    return queue;
  }

  for (const act of deliveryAdvice.actions ?? []) {
    queue.push({
      id: act.id,
      title: act.title,
      detail: act.detail,
      applyAction: act.applyAction,
      button: act.button ?? "Aplicar",
      priority: act.priority ?? 99,
      auto: act.auto !== false,
    });
  }

  const placementAuto = (placementAdvice.issues ?? []).filter((i) => i.auto);
  if (placementAuto.length) {
    queue.push({
      id: "placement_fix",
      title: `Corrigir placements (${placementAuto.length} aviso(s))`,
      detail:
        placementAdvice.summary ??
        "Miniatura em vídeos + recomendações Meta (coluna direita, uncrop, Reels)",
      applyAction: "placement-fix",
      button: "Corrigir placements",
      priority: 97,
      auto: true,
    });
  }

  const placementManual = (placementAdvice.issues ?? []).filter((i) => !i.auto);
  for (const issue of placementManual.slice(0, 2)) {
    queue.push({
      id: issue.id,
      title: issue.title,
      detail: issue.manual ?? issue.detail,
      applyAction: null,
      priority: 40,
      auto: false,
    });
  }

  if (metaRecommendations.pending?.length) {
    const reels = metaRecommendations.pending.filter((p) => p.type === "REELS_PC_RECOMMENDATION");
    const slugs = [...new Set(reels.flatMap((p) => p.slugs))];
    queue.push({
      id: "meta_recs",
      title: `Aplicar ${metaRecommendations.pending.length} recomendação(ões) Meta`,
      detail: reels.length
        ? `Vídeo Reels 9:16 para ${slugs.join(", ") || "adsets"} — score Meta ${metaRecommendations.opportunityScore}/100`
        : `Opportunity Score ${metaRecommendations.opportunityScore}/100 — só aplica o seguro (budget/orçamento com teto)`,
      applyAction: "meta-recs",
      button: "Aplicar Meta",
      priority: 98,
      auto: true,
    });
  }

  if (campaign.emptyCount > 0) {
    queue.push({
      id: "cleanup_campaigns",
      title: "Limpar campanhas vazias no Meta",
      detail: `${campaign.emptyCount} campanha(s) de teste sem anúncios — pauso automaticamente`,
      applyAction: "cleanup",
      button: "Aplicar agora",
      priority: 90,
      auto: true,
    });
  }

  for (const rec of recommendations.items) {
    if (rec.auto && rec.id === "pause_no_clicks") {
      const ad = ads.find((a) => a.slug === rec.slug);
      queue.push({
        id: `pause_${rec.slug}`,
        title: `Pausar ${rec.product}`,
        detail: rec.detail,
        applyAction: "pause",
        applySlug: rec.slug,
        button: "Pausar",
        priority: 95,
        auto: true,
      });
    }
    if (rec.id === "reels_video" && rec.verdict === "warn") {
      queue.push({
        id: `video_${rec.slug}`,
        title: `Gerar vídeo Reels · ${rec.product}`,
        detail: "Crio vídeo 9:16 automaticamente no seu PC",
        applyAction: "optimize",
        button: "Gerar + otimizar",
        priority: 70,
        auto: true,
      });
    }
  }

  if (totals.active < 3) {
    queue.push({
      id: "create_ads",
      title: "Criar anúncios da fila",
      detail: `${totals.active}/3 ativos — autopilot cria até 3 novos`,
      applyAction: "autopilot",
      button: "Lançar",
      priority: 80,
      auto: true,
    });
  }

  queue.push({
    id: "full_audit",
    title: "Auditoria completa + auto-ajuste",
    detail: "Analisa métricas, pausa ruins, impulsiona bons, gera criativos",
    applyAction: "optimize",
    button: "Executar auditoria",
    priority: 60,
    auto: true,
  });

  if (!telegramOk) {
    queue.push({
      id: "telegram",
      title: "Ativar alertas no Telegram",
      detail: "Vendas e pausas direto no celular — npm run telegram:setup",
      applyAction: null,
      priority: 30,
      auto: false,
    });
  }

  // Dedupe by id
  const seen = new Set();
  return queue
    .filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 6);
}
