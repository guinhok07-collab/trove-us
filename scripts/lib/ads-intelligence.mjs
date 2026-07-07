/**
 * Score e ranking de anúncios — mede desempenho e orienta o autopilot.
 */

const TIER_LABELS = {
  strong: "Bom desempenho",
  contender: "Em alta",
  learning: "Aprendendo",
  watch: "Monitorar",
  weak: "Atenção",
  paused: "Pausado",
};

/**
 * @param {object} ad
 * @returns {number} 0–100
 */
export function scoreAd(ad) {
  const spend = Number(ad.spendBrl ?? 0);
  const clicks = Number(ad.linkClicks ?? 0);
  const ctr = Number(ad.ctr ?? 0);
  const impressions = Number(ad.impressions ?? 0);
  const sales = Number(ad.salesTotal ?? 0);
  const roas = Number(ad.roas ?? 0);

  if (ad.status === "PAUSED") return 0;

  let score = 40;

  if (sales > 0) score += 35 + Math.min(sales * 8, 20);
  if (roas >= 3) score += 20;
  else if (roas >= 1.5) score += 15;
  else if (roas >= 1) score += 8;

  if (clicks >= 15) score += 18;
  else if (clicks >= 8) score += 12;
  else if (clicks >= 3) score += 6;
  else if (clicks >= 1) score += 2;

  if (ctr >= 1.5) score += 15;
  else if (ctr >= 0.9) score += 10;
  else if (ctr >= 0.5) score += 5;

  if (impressions >= 200 && clicks === 0) score -= 20;
  if (spend >= 15 && clicks === 0) score -= 35;
  if (impressions >= 400 && ctr > 0 && ctr < 0.25) score -= 25;
  if (clicks >= 8 && sales === 0) score -= 5;

  if (!impressions && !spend) score = 45;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * @param {Array<object>} ads
 * @returns {{ ranked: Array, top: object|null, bottom: object|null }}
 */
export function rankAds(ads) {
  const active = ads.filter((a) => a.status === "ACTIVE");
  const scored = active
    .map((ad) => ({ ...ad, intelligenceScore: scoreAd(ad) }))
    .sort((a, b) => b.intelligenceScore - a.intelligenceScore);

  const withTier = scored.map((ad, index) => ({
    ...ad,
    rank: index + 1,
    tier: classifyTier(ad, index, scored),
    tierLabel: "",
  }));

  for (const ad of withTier) {
    ad.tierLabel = TIER_LABELS[ad.tier] ?? ad.tier;
  }

  const paused = ads
    .filter((a) => a.status === "PAUSED")
    .map((ad) => ({
      ...ad,
      intelligenceScore: 0,
      rank: null,
      tier: "paused",
      tierLabel: TIER_LABELS.paused,
    }));

  const ranked = [...withTier, ...paused];
  const top = withTier[0] ?? null;
  const bottom =
    withTier.find((a) => a.tier === "weak") ??
    withTier.filter((a) => a.intelligenceScore < 30).pop() ??
    null;

  return { ranked, top, bottom };
}

function classifyTier(ad, index, all) {
  if ((ad.salesTotal ?? 0) > 0) return "strong";
  if (index === 0 && ad.intelligenceScore >= 58 && (ad.linkClicks ?? 0) >= 2) return "strong";
  if (ad.intelligenceScore >= 55 && (ad.linkClicks ?? 0) >= 2) return "contender";
  if ((ad.impressions ?? 0) < 150 && (ad.spendBrl ?? 0) < 8) return "learning";
  if (ad.intelligenceScore < 28 && (ad.spendBrl ?? 0) >= 10 && (ad.linkClicks ?? 0) === 0) {
    return "weak";
  }
  if (ad.intelligenceScore < 35 && index === all.length - 1 && all.length >= 2) {
    const topScore = all[0]?.intelligenceScore ?? 0;
    if (topScore - ad.intelligenceScore >= 25) return "weak";
  }
  return "watch";
}

export function applyIntelligenceToAds(ads) {
  const { ranked } = rankAds(ads);
  const bySlug = new Map(ranked.map((a) => [a.slug, a]));
  return {
    ads: ads.map((ad) => {
      const intel = bySlug.get(ad.slug);
      if (!intel) return ad;
      return {
        ...ad,
        intelligenceScore: intel.intelligenceScore,
        rank: intel.rank,
        tier: intel.tier,
        tierLabel: intel.tierLabel,
      };
    }),
  };
}

export function intelligenceSummary(top, bottom) {
  const lines = [];
  if (bottom && bottom.intelligenceScore < 35) {
    lines.push(
      `⚠️ ${bottom.product}: score ${bottom.intelligenceScore} · gasto R$${(bottom.spendBrl ?? 0).toFixed(2)} · ${bottom.linkClicks ?? 0} cliques — revisar ou pausar`,
    );
  }
  return lines;
}
