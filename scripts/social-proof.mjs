/** Deterministic but natural-looking rating / sold / reviews from slug + CJ listedNum. */

function hashSlug(slug) {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seed(slug, n) {
  const x = Math.sin((hashSlug(slug) + n * 9973) * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function deRound(n, slug, salt) {
  let v = n;
  if (v >= 100 && v % 100 === 0) v += 7 + Math.floor(seed(slug, salt) * 19);
  else if (v >= 50 && v % 50 === 0) v += 3 + Math.floor(seed(slug, salt + 1) * 11);
  else if (v % 10 === 0 && v > 30) v += 1 + Math.floor(seed(slug, salt + 2) * 4);
  return v;
}

export function naturalSocialProof(slug, listedNum = 0) {
  const s1 = seed(slug, 1);
  const s2 = seed(slug, 2);
  const s3 = seed(slug, 3);

  let sold;
  if (listedNum > 0) {
    const blend =
      Math.sqrt(listedNum) * (0.55 + s1 * 0.25) +
      Math.log10(listedNum + 1) * (16 + s2 * 8);
    sold = Math.min(Math.max(Math.round(blend), 31), 438 + Math.floor(s3 * 37));
  } else {
    sold = Math.round(34 + s1 * 86);
  }
  sold = deRound(sold, slug, 10);

  const reviewRatio = 0.11 + s2 * 0.22;
  let reviews = Math.max(6, Math.round(sold * reviewRatio));
  reviews = deRound(reviews, slug, 20);
  if (reviews >= sold) reviews = Math.max(6, sold - (3 + Math.floor(s3 * 14)));

  const rating = Math.round((4.25 + s3 * 0.58 + (listedNum > 2000 ? 0.08 : 0)) * 10) / 10;
  const ratingClamped = Math.min(4.9, Math.max(4.3, rating));

  return { rating: ratingClamped, reviews, sold };
}
