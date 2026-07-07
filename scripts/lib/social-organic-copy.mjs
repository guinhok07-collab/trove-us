/**
 * Organic social copy — problem → solution → CTA (Reels + feed).
 */
import { buildProblemSolutionReelCopy } from "./trove-social-playbook.mjs";

export { buildFeedPostCopy, pickFeedPostForDay, buildAllFeedPosts } from "./trove-social-playbook.mjs";

/** @param {object} ad — entry from marketing/social/ads.json */
export function buildElaborateOrganicCopy(ad) {
  return buildProblemSolutionReelCopy(ad);
}

export function buildOrganicTelegramMessage({ ad, copy, results }) {
  const lines = [
    `📱 Reel posted — @shoptrove.us + Facebook`,
    "",
    `Product: ${ad.product}`,
    `Price: ${ad.price}`,
    "",
    results.instagram?.ok ? "✅ Instagram Reel live" : `⚠️ Instagram: ${results.instagram?.error ?? "skipped"}`,
    results.facebook?.ok ? "✅ Facebook Reel/Video live" : `⚠️ Facebook: ${results.facebook?.error ?? "skipped"}`,
    "",
    `Hook: ${copy.hook}`,
    `Next in rotation tomorrow.`,
  ];
  return lines.join("\n");
}
