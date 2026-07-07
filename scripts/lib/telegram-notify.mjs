/**
 * Telegram — mensagens padronizadas e organizadas.
 */

export const TG_TYPE = {
  watch: "🤖 Auto-watch",
  daily: "📊 Relatório diário",
  budget: "💰 Orçamento",
  meta: "📋 Meta Ads",
  optimize: "⚡ Otimização",
  panel: "🖥 Painel",
  autopilot: "➕ Novos anúncios",
  sale: "🛒 Venda",
  alert: "⚠️ Alerta",
  jarvis: "⚡ JARVIS",
};

function timestamp() {
  return new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Monta mensagem com cabeçalho + blocos separados por linha em branco. */
export function formatTelegram(type, blocks = []) {
  const title = TG_TYPE[type] ?? "ℹ️ Trove";
  const body = blocks.filter(Boolean).map((b) => (typeof b === "string" ? b : b.join("\n"))).join("\n\n");
  return `${title}\n${timestamp()}\n\n${body}`.trim();
}

export async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) {
    console.warn("Telegram not configured — skip notify");
    return false;
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.slice(0, 4000),
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    console.error("Telegram error:", await res.text());
    return false;
  }
  return true;
}

export async function sendTelegramTyped(type, blocks) {
  return sendTelegram(formatTelegram(type, blocks));
}

/** Resumo JARVIS — tom consultor + status dos sistemas. */
export function formatJarvisTelegram({ report, watch, llm, fixes = [], systems = {} } = {}) {
  const name = process.env.META_OWNER_NAME?.trim() || "Igor";
  const blocks = [];

  blocks.push(`⚡ JARVIS → ${name}`);
  if (report?.jarvisQuip) blocks.push(`💬 ${report.jarvisQuip}`);
  blocks.push(report?.headline || report?.messageToOwner || "Ciclo concluído.");

  if (fixes.length) {
    blocks.push(
      ["🔧 Corrigi automaticamente:", ...fixes.map((f) => `• ${f.detail}`)].join("\n"),
    );
  }

  if (watch?.review) {
    const r = watch.review;
    blocks.push(
      `📊 ${r.kept?.length ?? 0} ok · ${r.paused?.length ?? 0} pausados · ${r.boosted?.length ?? 0} impulsionados`,
    );
  }

  if (llm?.marketInsight) {
    blocks.push(`🌍 ${llm.marketInsight}`);
  }

  if (llm?.creativePlans?.[0]) {
    const c = llm.creativePlans[0];
    blocks.push(`🎬 ${c.slug}: "${c.hook}"`);
  }

  if (report?.permissionRequest?.needed) {
    blocks.push(`🔐 ${report.permissionRequest.ask}`);
    blocks.push("→ Aprove no painel Trove (aba IA)");
  } else if (llm?.messageToOwner && llm.messageToOwner !== report?.headline) {
    blocks.push(llm.messageToOwner);
  }

  const sysLine = [
    systems.meta?.ok ? "Meta ✓" : "Meta ✗",
    systems.site?.ok ? "Site ✓" : "Site ✗",
    systems.openai?.ok ? "IA ✓" : "IA ✗",
  ].join(" · ");
  blocks.push(sysLine);

  return formatTelegram("jarvis", blocks);
}

export async function sendJarvisTelegram(ctx) {
  return sendTelegram(formatJarvisTelegram(ctx));
}

/** Resumo compacto do auto-watch (sem dump de cada anúncio). */
export function formatWatchTelegram({ review, metaRecs, created, cleaned = 0, llm } = {}) {
  const blocks = [];

  blocks.push(
    [
      `📊 Resumo: ${review.kept.length} ok · ${review.paused.length} pausados · ${review.boosted.length} impulsionados · ${review.scaled?.length ?? 0} escalados`,
      `⏱ Próximo ciclo em ~2 horas`,
    ].join("\n"),
  );

  if (review.weeklyBudget) {
    const w = review.weeklyBudget;
    blocks.push(
      `💰 Semana: R$ ${w.spentBrl.toFixed(2)} / R$ ${w.capBrl} (${w.pct}%) · restante R$ ${w.remainingBrl.toFixed(2)}`,
    );
  }

  const changes = [];
  if (cleaned) changes.push(`🧹 ${cleaned} campanha(s) vazia(s) pausada(s)`);
  if (review.paused.length) changes.push(`⏸ Pausados: ${review.paused.join(", ")}`);
  if (review.boosted.length) changes.push(`🚀 Impulsionados: ${review.boosted.join(", ")}`);
  if (review.scaled?.length) changes.push(`📈 Budget+: ${review.scaled.join(", ")}`);
  if (review.rotated?.length) changes.push(`🔄 Fadiga (rotacionar): ${review.rotated.join(", ")}`);
  if (created) changes.push(`➕ ${created} anúncio(s) novo(s)`);
  if (metaRecs?.applied?.length) changes.push(`📋 Meta: ${metaRecs.applied.length} recomendação(ões) aplicada(s)`);

  if (changes.length) {
    blocks.push(["✅ Mudanças neste ciclo:", ...changes.map((c) => `• ${c}`)].join("\n"));
  } else {
    blocks.push("✅ Nenhuma mudança — tudo monitorado, contas saudáveis.");
  }

  if (review.intelLines?.length) {
    blocks.push(["⚠️ Atenção:", ...review.intelLines.map((l) => `• ${l.replace(/^⚠️\s*/, "")}`)].join("\n"));
  }

  if (metaRecs?.opportunityScore != null) {
    blocks.push(`📋 Meta Score: ${metaRecs.opportunityScore}/100 · ${metaRecs.pending?.length ?? 0} pendente(s)`);
  }

  if (llm?.briefing || llm?.messageToOwner) {
    const text = llm.messageToOwner || llm.briefing;
    const llmLines = [`🧠 Consultora IA: ${text}`];
    if (llm.marketInsight) {
      llmLines.push(`🌍 Tendência: ${llm.marketInsight}`);
    }
    if (llm.creativePlans?.length) {
      const c = llm.creativePlans[0];
      llmLines.push(`🎬 Criativo (${c.slug}): "${c.hook}" — ${c.angle}`);
    }
    if (llm.permissionRequest?.needed && llm.permissionRequest?.ask) {
      llmLines.push(`🔐 Preciso da sua OK: ${llm.permissionRequest.ask}`);
      llmLines.push(`→ Aprove no painel Trove (aba IA) ou responda depois`);
    }
    if (llm.actions?.length) {
      for (const a of llm.actions.slice(0, 2)) {
        llmLines.push(`• ${a.action}${a.slug ? ` (${a.slug})` : ""}: ${a.reason ?? ""}`);
      }
    }
    if (llm.executed?.some((e) => e.ok)) {
      llmLines.push(`✅ ${llm.executed.filter((e) => e.ok).length} ação(ões) executada(s)`);
    }
    blocks.push(llmLines.join("\n"));
  }

  return formatTelegram("watch", blocks);
}

export async function sendWatchTelegram(ctx) {
  return sendTelegram(formatWatchTelegram(ctx));
}
