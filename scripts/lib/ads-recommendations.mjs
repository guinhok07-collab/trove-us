/**
 * Recomendações estilo Meta Ads Manager — o que é bom/ruim e o que fazer.
 * Não aplica música/Reels automaticamente (API limitada); explica e prioriza.
 */
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const videoDir = resolve(root, "marketing/social/output/videos");
const feedDir = resolve(root, "marketing/social/output/feed");

/**
 * @param {Array<{ slug, product, status, spendBrl, impressions, linkClicks, ctr, metaPurchases, siteOrders, siteRevenue, creativeType?: string }>} ads
 */
export function buildAdRecommendations(ads) {
  const items = [];
  let opportunityScore = 0;

  for (const ad of ads) {
    if (ad.status === "PAUSED") continue;

    const hasVideo = existsSync(resolve(videoDir, `${ad.file ?? ad.slug}.webm`));
    const hasFeed = existsSync(resolve(feedDir, `${ad.file ?? ad.slug}.png`));
    const creativeType = ad.creativeType ?? "image";

    // Meta: criativos só imagem — sempre relevante enquanto ativo
    if (creativeType === "image" && ad.status === "ACTIVE") {
      const alreadyMusic = items.some((i) => i.slug === ad.slug && i.id === "add_music");
      if (!alreadyMusic) {
        items.push({
          slug: ad.slug,
          product: ad.product,
          id: "add_music",
          title: "Adicionar música ao anúncio",
          verdict: "good",
          impact: "+CTR (Meta estima até +60 pts)",
          detail:
            "Anúncio só com imagem. No Ads Manager use Recomendações → Adicionar música automaticamente.",
          auto: false,
          metaSimilar: true,
        });
        opportunityScore += 60;
      }

      const alreadyReels = items.some((i) => i.slug === ad.slug && i.id === "reels_video");
      if (!alreadyReels) {
        items.push({
          slug: ad.slug,
          product: ad.product,
          id: "reels_video",
          title: "Usar vídeo vertical 9:16 (Reels)",
          verdict: hasVideo ? "good" : "warn",
          impact: "Meta estima ~8% menor custo por resultado",
          detail: hasVideo
            ? "Vídeo pronto — duplique anúncio com criativo em vídeo no Ads Manager."
            : "Rode npm run social:pack para gerar vídeo vertical.",
          auto: false,
          metaSimilar: true,
        });
        opportunityScore += 5;
      }
    }

    // Meta: "Adicionar música" — reforço quando já tem impressões
    if (creativeType === "image" && ad.impressions >= 100) {
      items.push({
        slug: ad.slug,
        product: ad.product,
        id: "add_music_metrics",
        title: "Adicionar música (com tráfego)",
        verdict: "good",
        impact: "+CTR com dados reais",
        detail: `${ad.impressions} impressões — Meta prioriza esta melhoria.`,
        auto: false,
        metaSimilar: true,
      });
      opportunityScore += 10;
    }

    // Sistema próprio: gastou sem clique
    if (ad.spendBrl >= 15 && ad.linkClicks === 0 && ad.impressions >= 200) {
      items.push({
        slug: ad.slug,
        product: ad.product,
        id: "pause_no_clicks",
        title: "Pausar — gasto sem cliques",
        verdict: "bad",
        impact: "Evita queimar budget",
        detail: `R$${ad.spendBrl.toFixed(2)} gastos, 0 cliques. Auto-watch pausa automaticamente.`,
        auto: true,
        metaSimilar: false,
      });
    }

    // CTR baixo
    if (ad.impressions >= 400 && ad.ctr > 0 && ad.ctr < 0.25) {
      items.push({
        slug: ad.slug,
        product: ad.product,
        id: "low_ctr",
        title: "CTR baixo — trocar criativo",
        verdict: "bad",
        impact: "Público vê mas não clica",
        detail: `CTR ${ad.ctr.toFixed(2)}%. Teste outro produto da fila ou novo criativo (social:pack).`,
        auto: true,
        metaSimilar: false,
      });
    }

    // Cliques mas zero vendas
    if (ad.linkClicks >= 5 && (ad.metaPurchases ?? 0) === 0 && (ad.siteOrders ?? 0) === 0) {
      items.push({
        slug: ad.slug,
        product: ad.product,
        id: "clicks_no_sales",
        title: "Cliques sem venda",
        verdict: "warn",
        impact: "Tráfego ok, conversão fraca",
        detail: `${ad.linkClicks} cliques, 0 vendas atribuídas. Revise preço, foto do produto ou página.`,
        auto: false,
        metaSimilar: false,
      });
    }

    // Bom desempenho
    if (ad.linkClicks >= 5 && ad.ctr >= 0.8 && ad.status === "ACTIVE") {
      items.push({
        slug: ad.slug,
        product: ad.product,
        id: "boost_performing",
        title: "Impulsionar — anúncio performando",
        verdict: "good",
        impact: "+R$5/dia no budget",
        detail: `${ad.linkClicks} cliques · CTR ${ad.ctr.toFixed(2)}%. Auto-watch impulsiona se ainda não impulsionou.`,
        auto: true,
        metaSimilar: false,
      });
      opportunityScore += 10;
    }

    // Vendas confirmadas
    if ((ad.siteOrders ?? 0) > 0 || (ad.metaPurchases ?? 0) > 0) {
      const total = (ad.siteOrders ?? 0) + (ad.metaPurchases ?? 0);
      items.push({
        slug: ad.slug,
        product: ad.product,
        id: "has_sales",
        title: "Vendas detectadas — manter",
        verdict: "good",
        impact: `${total} venda(s)`,
        detail: `Site: ${ad.siteOrders ?? 0} · Pixel Meta: ${ad.metaPurchases ?? 0}. Continue monitorando.`,
        auto: false,
        metaSimilar: false,
      });
    }

    if (!hasFeed && ad.status === "ACTIVE") {
      items.push({
        slug: ad.slug,
        product: ad.product,
        id: "missing_creative",
        title: "Criativo local ausente",
        verdict: "warn",
        impact: "Dificulta recriar anúncio",
        detail: "Rode npm run social:pack para regenerar imagens.",
        auto: false,
        metaSimilar: false,
      });
    }
  }

  // Dedupe by slug+id
  const seen = new Set();
  const deduped = items.filter((i) => {
    const k = `${i.slug}:${i.id}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  deduped.sort((a, b) => {
    const rank = { bad: 0, warn: 1, good: 2 };
    return (rank[a.verdict] ?? 1) - (rank[b.verdict] ?? 1);
  });

  return {
    opportunityScore: Math.min(100, opportunityScore),
    total: deduped.length,
    items: deduped.slice(0, 20),
    summary: summarize(deduped),
  };
}

function summarize(items) {
  const bad = items.filter((i) => i.verdict === "bad").length;
  const good = items.filter((i) => i.verdict === "good").length;
  const auto = items.filter((i) => i.auto).length;
  const metaLike = items.filter((i) => i.metaSimilar).length;
  if (!items.length) return "Nenhuma recomendação — anúncios em aprendizado ou dados insuficientes.";
  return `${items.length} ação(ões): ${good} boas · ${bad} corrigir · ${auto} automáticas · ${metaLike} similares ao Meta`;
}
