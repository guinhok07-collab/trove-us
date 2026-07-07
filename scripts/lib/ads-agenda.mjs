/**
 * Operational agenda for Trove Autopilot — payments, Reels, ads cycles + pessoal.
 */
import { listPersonalItems } from "./jarvis-personal.mjs";

function dayLabel(d) {
  return d.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function timeLabel(d) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function atHourToday(hour) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function postedToday(iso) {
  if (!iso) return false;
  return new Date(iso).toDateString() === new Date().toDateString();
}

/**
 * @returns {{ generatedAt: string, summary: object, items: Array<object> }}
 */
export function buildAgenda({
  billing = {},
  socialOrganic = {},
  settings = {},
  automation = {},
  metaToken = {},
  creatives = {},
  totals = {},
  cautious = {},
  paymentIssues = {},
} = {}) {
  const now = new Date();
  const items = [];
  const hour = Number(socialOrganic.scheduleHour ?? 15);
  const watchHours = Number(settings.watchIntervalHours ?? 2) || 2;

  // —— Payments & credentials (urgent) ——
  if (metaToken.expired || (metaToken.ok === false && /expir/i.test(metaToken.error ?? ""))) {
    items.push({
      id: "meta-token",
      kind: "payment",
      priority: 0,
      status: "overdue",
      title: "Renovar token Meta",
      when: "Agora",
      whenAt: now.toISOString(),
      detail: metaToken.error ?? "Token expirado — sem ele não cria anúncios nem posta Reels.",
      actionLabel: "Meta Developers",
      actionUrl: "https://developers.facebook.com/tools/explorer/",
    });
  }

  if (billing.metaPayment?.configured && billing.metaPayment.paymentOk === false) {
    items.push({
      id: "meta-billing",
      kind: "payment",
      priority: 0,
      status: "overdue",
      title: "Pagar fatura Meta Ads",
      when: "Agora",
      whenAt: now.toISOString(),
      detail: billing.metaPayment.detail ?? "Pagamento pendente na conta de anúncios.",
      actionLabel: "Abrir billing Meta",
      actionUrl: "https://business.facebook.com/billing",
    });
  } else if (billing.metaPayment?.paymentOk) {
    items.push({
      id: "meta-billing-ok",
      kind: "payment",
      priority: 3,
      status: "ok",
      title: "Pagamento Meta Ads",
      when: "Em dia",
      whenAt: now.toISOString(),
      detail: billing.metaPayment.detail ?? "Conta de anúncios sem pendência.",
      actionLabel: "Billing Meta",
      actionUrl: "https://business.facebook.com/billing",
    });
  }

  if (billing.openai?.configured && billing.openai.billingOk === false) {
    items.push({
      id: "openai-billing",
      kind: "payment",
      priority: 0,
      status: "overdue",
      title: "Colocar crédito OpenAI (JARVIS)",
      when: "Agora",
      whenAt: now.toISOString(),
      detail: billing.openai.detail ?? "Sem crédito — JARVIS fica em modo básico.",
      actionLabel: "Billing OpenAI",
      actionUrl: "https://platform.openai.com/settings/organization/billing",
    });
  } else if (billing.openai?.billingOk) {
    items.push({
      id: "openai-billing-ok",
      kind: "ai",
      priority: 3,
      status: "ok",
      title: "Crédito OpenAI (JARVIS)",
      when: "Em dia",
      whenAt: now.toISOString(),
      detail: billing.openai.detail ?? "IA com crédito ativo.",
      actionLabel: "OpenAI",
      actionUrl: "https://platform.openai.com/settings/organization/billing",
    });
  } else if (!billing.openai?.configured) {
    items.push({
      id: "openai-key",
      kind: "ai",
      priority: 1,
      status: "due",
      title: "Configurar OPENAI_API_KEY",
      when: "Pendente",
      whenAt: now.toISOString(),
      detail: "Sem chave — JARVIS não usa GPT.",
      actionLabel: "OpenAI API keys",
      actionUrl: "https://platform.openai.com/api-keys",
    });
  }

  if (paymentIssues.openCount > 0) {
    const top = paymentIssues.recent?.[0];
    items.push({
      id: "checkout-payment-issues",
      kind: "payment",
      priority: 0,
      status: "overdue",
      title: `${paymentIssues.openCount} problema(s) de pagamento no site`,
      when: "Agora",
      whenAt: now.toISOString(),
      detail: top
        ? `${top.fullName}${top.phone ? ` · ${top.phone}` : ""} — ${(top.problem ?? "").slice(0, 120)}`
        : "Cliente não conseguiu pagar — veja admin Trove.",
      actionLabel: "Admin pagamentos",
      actionUrl: "https://trove-us.com/admin",
    });
  }

  // —— Daily Reel ——
  const reelAt = atHourToday(hour);
  const reelDone = postedToday(socialOrganic.lastPostedAt);
  const reelReady =
    socialOrganic.enabled &&
    socialOrganic.configured &&
    socialOrganic.instagramId &&
    socialOrganic.hasVideo !== false;

  if (!socialOrganic.enabled) {
    items.push({
      id: "reel-off",
      kind: "reel",
      priority: 2,
      status: "ok",
      title: "Reel orgânico desligado",
      when: "—",
      whenAt: now.toISOString(),
      detail: "META_SOCIAL_ORGANIC=0",
    });
  } else if (reelDone) {
    items.push({
      id: "reel-done",
      kind: "reel",
      priority: 3,
      status: "done",
      title: "Reel do dia publicado",
      when: socialOrganic.lastPostedAt
        ? `${dayLabel(new Date(socialOrganic.lastPostedAt))} ${timeLabel(new Date(socialOrganic.lastPostedAt))}`
        : "Hoje",
      whenAt: socialOrganic.lastPostedAt,
      detail: socialOrganic.lastSlug
        ? `Último: ${socialOrganic.lastSlug}`
        : "Post orgânico de hoje ok.",
      actionLabel: "Instagram",
      actionUrl: "https://www.instagram.com/shoptrove.us/",
    });
    const tomorrow = addDays(atHourToday(hour), 1);
    items.push({
      id: "reel-next",
      kind: "reel",
      priority: 2,
      status: "scheduled",
      title: `Próximo Reel — ${socialOrganic.nextProduct?.product ?? "próximo produto"}`,
      when: `${dayLabel(tomorrow)} ${String(hour).padStart(2, "0")}:00`,
      whenAt: tomorrow.toISOString(),
      detail: socialOrganic.taskInstalled
        ? "Windows task + painel agendados"
        : "Instale: npm run social:organic:install",
    });
  } else {
    const overdue = now.getHours() >= hour;
    items.push({
      id: "reel-today",
      kind: "reel",
      priority: overdue ? 1 : 2,
      status: overdue ? "due" : "scheduled",
      title: `Reel do dia — ${socialOrganic.nextProduct?.product ?? "produto da fila"}`,
      when: overdue
        ? `Atrasado (era ${String(hour).padStart(2, "0")}:00)`
        : `Hoje ${String(hour).padStart(2, "0")}:00`,
      whenAt: reelAt.toISOString(),
      detail: [
        socialOrganic.nextProduct?.price,
        socialOrganic.hasVideo ? "vídeo pronto" : "vídeo será gerado",
        socialOrganic.taskInstalled ? "task Windows ✓" : "sem task Windows",
        !socialOrganic.instagramId ? "falta META_INSTAGRAM_ACTOR_ID" : null,
        metaToken.expired ? "token Meta expirado — post vai falhar" : null,
      ]
        .filter(Boolean)
        .join(" · "),
      actionLabel: "Aba Social",
    });
  }

  // —— Ads autopilot cycles ——
  const lastWatch = automation.lastWatch || null;
  let nextWatch = now;
  if (lastWatch) {
    nextWatch = new Date(new Date(lastWatch).getTime() + watchHours * 3600_000);
  }
  const watchDue = !lastWatch || nextWatch <= now;

  items.push({
    id: "ads-watch",
    kind: "ads",
    priority: watchDue ? 1 : 2,
    status: watchDue ? "due" : "scheduled",
    title: "Auto-watch / JARVIS (anúncios)",
    when: lastWatch
      ? watchDue
        ? "Agora (ciclo pendente)"
        : `${dayLabel(nextWatch)} ${timeLabel(nextWatch)}`
      : "Ainda não rodou",
    whenAt: (watchDue ? now : nextWatch).toISOString(),
    detail: lastWatch
      ? `Último: ${dayLabel(new Date(lastWatch))} ${timeLabel(new Date(lastWatch))} · a cada ${watchHours}h`
      : `Agendado a cada ${watchHours}h · rode npm run ads:watch:install`,
    actionLabel: "Rodar JARVIS",
  });

  const active = totals.active ?? 0;
  const target = settings.targetActiveAds ?? 6;
  items.push({
    id: "ads-create",
    kind: "ads",
    priority: active < target && !cautious.active ? 2 : 3,
    status:
      metaToken.expired || billing.metaPayment?.paymentOk === false
        ? "blocked"
        : active >= target
          ? "ok"
          : "due",
    title: "Criação de anúncios",
    when: active >= target ? "Meta atingida" : "Quando faltar ativo",
    whenAt: now.toISOString(),
    detail: [
      `${active}/${target} ativos`,
      creatives.videos != null ? `${creatives.videos} vídeos` : null,
      creatives.feedImages != null ? `${creatives.feedImages} imagens feed` : null,
      cautious.active ? "modo cauteloso — não cria ads pagos" : null,
      metaToken.expired ? "token expirado" : null,
    ]
      .filter(Boolean)
      .join(" · "),
  });

  items.push({
    id: "reel-create",
    kind: "reel",
    priority: reelReady ? 3 : 1,
    status: reelReady ? "ok" : "due",
    title: "Criação de Reels (pipeline)",
    when: reelReady ? "Pronto" : "Atenção",
    whenAt: now.toISOString(),
    detail: [
      socialOrganic.hasVideo ? "vídeo do próximo produto ok" : "falta gravar vídeo",
      socialOrganic.taskInstalled ? "agenda Windows ok" : "instalar social:organic:install",
      metaToken.expired ? "token Meta impede publicar" : "API pronta quando token ok",
    ]
      .filter(Boolean)
      .join(" · "),
  });

  // Agenda pessoal (lembretes / pagamentos / despertadores que o dono pediu ao JARVIS)
  for (const p of listPersonalItems()) {
    items.push({
      id: p.id,
      kind: p.kind === "alarm" ? "alarm" : "personal",
      priority: p.priority ?? 2,
      status: p.status,
      title: (p.kind === "alarm" ? "⏰ " : "📌 Seu lembrete: ") + p.title,
      when: p.when,
      whenAt: p.whenAt,
      detail:
        p.note ||
        (p.musicUrl || p.music
          ? `Música: ${p.musicUrl || p.music}`
          : "Agenda pessoal (data que você pediu) — não é fatura Meta"),
      actionLabel: p.status === "due" || p.status === "ringing" ? "Ok, feito" : null,
    });
  }

  items.sort((a, b) => a.priority - b.priority || String(a.whenAt).localeCompare(String(b.whenAt)));

  const overdue = items.filter(
    (i) => i.status === "overdue" || i.status === "due" || i.status === "ringing",
  ).length;
  const blocked = items.filter((i) => i.status === "blocked").length;
  const ok = items.filter((i) => i.status === "ok" || i.status === "done").length;

  return {
    generatedAt: now.toISOString(),
    summary: {
      overdue,
      blocked,
      ok,
      total: items.length,
      headline:
        overdue > 0
          ? `${overdue} item(ns) precisam de ação (pagamento / token / post)`
          : blocked > 0
            ? `${blocked} bloqueado(s) — resolva pagamento Meta`
            : "Agenda em dia",
    },
    items,
  };
}
