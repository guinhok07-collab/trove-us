/**
 * Sugestões inteligentes — criativo, público e crescimento (Instagram/site).
 */

const AUDIENCE_TIPS = {
  pet: {
    interests: ["Pets", "Dogs", "Pet supplies", "Animal lovers"],
    age: "25–54",
    geo: "Estados Unidos",
    placements: ["Instagram Reels", "Facebook Feed", "Stories"],
  },
  default: {
    interests: ["Online shopping", "Free shipping", "Home decor"],
    age: "25–54",
    geo: "Estados Unidos",
    placements: ["Instagram", "Facebook Feed"],
  },
};

function detectCategory(slug = "", product = "") {
  const s = `${slug} ${product}`.toLowerCase();
  if (/pet|dog|cat|paw|nail|chew|hair|roller/.test(s)) return "pet";
  if (/home|kitchen|wellness|massage/.test(s)) return "home";
  if (/tech|usb|charger|desk/.test(s)) return "tech";
  return "default";
}

export function buildAiSuggestions({ ads = [], totals = {}, weeklyBudget = {}, queue = [], metaLive = false, metaRateLimited = false, deliveryAdvice = {}, placementAdvice = {} }) {
  const insights = [];
  const campaigns = [];

  if (deliveryAdvice.insights?.length) {
    insights.push(...deliveryAdvice.insights);
  }

  for (const issue of placementAdvice.issues ?? []) {
    insights.push({
      type: issue.severity === "error" ? "error" : issue.severity === "warn" ? "warn" : "info",
      title: issue.title,
      detail: issue.auto ? `${issue.detail} — clique em Corrigir placements no painel.` : (issue.manual ?? issue.detail),
    });
  }

  if (metaRateLimited) {
    insights.push({
      type: "warn",
      title: "Consultas Meta em pausa",
      detail: "Limite temporário da Meta — anúncios continuam rodando. O autopilot retoma sozinho em breve.",
    });
  } else if (!metaLive) {
    insights.push({
      type: "error",
      title: "Meta desconectada",
      detail: "Token expirado ou inválido — renove no Meta Business e atualize o .env.local.",
    });
    return { insights, campaigns, audience: null };
  }

  const category = detectCategory(ads[0]?.slug, ads[0]?.product);
  const aud = AUDIENCE_TIPS[category] ?? AUDIENCE_TIPS.default;

  insights.push({
    type: "audience",
    title: "Público sugerido",
    detail: `${aud.geo} · ${aud.age} · interesses: ${aud.interests.join(", ")}`,
  });

  insights.push({
    type: "creative",
    title: "Criativo que converte",
    detail: "Vídeo Reels 9:16 com produto em uso + texto curto + frete grátis. Trove gera automaticamente.",
  });

  const weak = ads.filter((a) => a.tier === "weak" || a.health === "bad");
  if (weak.length) {
    insights.push({
      type: "warn",
      title: `${weak.length} anúncio(s) fraco(s)`,
      detail: `${weak.map((a) => a.product).join(", ")} — autopilot pausa ou rotaciona se gastar sem clique.`,
    });
  }

  const strong = ads.filter((a) => a.tier === "strong" || a.tier === "contender");
  if (strong.length) {
    insights.push({
      type: "good",
      title: "Concentre budget nos que performam",
      detail: `${strong.map((a) => a.product).slice(0, 3).join(", ")} — mais cliques/vendas = prioridade.`,
    });
  }

  if (weeklyBudget.nearCap || weeklyBudget.atCap) {
    insights.push({
      type: "budget",
      title: weeklyBudget.atCap ? "Teto semanal atingido" : "Quase no teto semanal",
      detail: `R$ ${weeklyBudget.spentBrl?.toFixed(2) ?? 0} / R$ ${weeklyBudget.capBrl ?? 120}. Para escalar, avise para subir o limite.`,
    });
  }

  if (queue.length >= 5) {
    insights.push({
      type: "info",
      title: `${queue.length} produtos na fila`,
      detail: "Autopilot cria novos só se couber no orçamento semanal e houver slot ativo.",
    });
  }

  campaigns.push({
    id: "traffic_site",
    objective: "Tráfego → site",
    label: "Vendas na loja Trove",
    detail: "Anúncios atuais levam para trove-us.com — ideal para conversão e pixel.",
    status: "active",
    cta: "Manter",
  });

  campaigns.push({
    id: "ig_followers",
    objective: "Engajamento → Instagram",
    label: "Seguidores @shoptrove.us",
    detail: "Campanha futura: Reels + CTA perfil. Público US 18–44 interessado em pets/home.",
    status: "planned",
    cta: "Planejar",
    url: "https://www.instagram.com/shoptrove.us/",
  });

  campaigns.push({
    id: "page_likes",
    objective: "Curtidas na página",
    label: "Página Facebook Trove",
    detail: "Social proof barato — use quando tiver budget sobrando na semana.",
    status: "planned",
    cta: "Planejar",
  });

  return {
    insights,
    campaigns,
    audience: aud,
    category,
  };
}
