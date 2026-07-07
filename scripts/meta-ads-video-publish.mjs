/**
 * Publica anúncios de vídeo Reels no Meta para produtos com .webm local.
 * Usage: node --env-file=.env.local scripts/meta-ads-video-publish.mjs [--dry-run] [--slug=xxx]
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  createTrafficVideoAd,
  isMetaAdsConfigured,
} from "./lib/meta-ads-api.mjs";
import { loadState, saveState, appendLog } from "./lib/ads-auto-engine.mjs";
import {
  bootstrapAutopilotBrain,
  preflightCreateAd,
  verifyAdHasInstagram,
} from "./lib/ads-autopilot-brain.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const feedDir = resolve(root, "marketing/social/output/feed");
const videoDir = resolve(root, "marketing/social/output/videos");
const adsPath = resolve(root, "marketing/social/ads.json");
const dryRun = process.argv.includes("--dry-run");
const slugFilter = process.argv.find((a) => a.startsWith("--slug="))?.split("=")[1];

if (!isMetaAdsConfigured()) {
  console.error("Meta API não configurada");
  process.exit(1);
}

const brain = await bootstrapAutopilotBrain();
if (brain.lines?.length) console.log(brain.lines.join("\n"), "\n");

const catalog = existsSync(adsPath)
  ? JSON.parse(readFileSync(adsPath, "utf8"))
  : [];
const catalogBySlug = new Map(catalog.map((a) => [a.slug, a]));
const state = loadState();
const results = [];

for (const [slug, meta] of Object.entries(state.ads ?? {})) {
  if (slugFilter && slug !== slugFilter) continue;
  if (meta.videoAdId) {
    console.log(`⏭ ${slug} — vídeo já publicado (${meta.videoAdId})`);
    continue;
  }

  const file = meta.file ?? slug;
  const webmCandidates = [
    resolve(videoDir, `${file}.webm`),
    resolve(videoDir, `${slug}.webm`),
  ];
  const webm = webmCandidates.find((p) => existsSync(p));
  const png = [resolve(feedDir, `${file}.png`), resolve(feedDir, `${slug}.png`)].find((p) =>
    existsSync(p),
  );
  if (!webm) {
    console.log(`⏭ ${slug} — sem vídeo local (${webmCandidates[0]})`);
    continue;
  }

  const adCopy = catalogBySlug.get(slug);
  const message = adCopy?.facebook ?? adCopy?.hook ?? meta.product;
  const title = adCopy?.product ?? meta.product;
  const link = meta.url ?? adCopy?.url;

  console.log(`🎬 ${slug} — publicando vídeo Reels…`);

  const preflight = preflightCreateAd({
    slug,
    imagePath: png,
    videoPath: webm,
    product: meta.product,
  });
  if (!preflight.ok) {
    console.error(`✗ ${slug}:`, preflight.issues.map((i) => i.message).join("; "));
    results.push({ slug, ok: false, error: preflight.issues[0]?.message });
    continue;
  }

  if (dryRun) {
    results.push({ slug, dryRun: true, webm });
    continue;
  }

  try {
    const created = await createTrafficVideoAd({
      name: slug,
      message,
      title,
      link,
      videoPath: webm,
      imagePath: png,
      campaignId: state.campaignId ?? meta.campaignId,
    });

    meta.videoAdId = created.adId;
    meta.videoAdsetId = created.adsetId;
    meta.videoCreativeId = created.creativeId;
    meta.videoId = created.videoId;
    meta.videoPublishedAt = new Date().toISOString();
    meta.creativeType = "image+video";
    meta.hasVideo = true;

    const verified = await verifyAdHasInstagram(created.adId, { label: slug });
    if (!verified.verified) {
      console.log(`  ⚠ Vídeo publicado — placement-fix vai garantir Instagram`);
    }

    appendLog({ action: "video_publish", slug, adId: created.adId, videoId: created.videoId });
    results.push({ slug, ok: true, adId: created.adId });
    console.log(`✓ Video ad ${created.adId}`);
  } catch (err) {
    results.push({ slug, ok: false, error: err.message });
    console.error(`✗ ${slug}:`, err.message);
  }
}

if (!dryRun) {
  state.lastVideoPublish = new Date().toISOString();
  saveState(state);
}

console.log(`\nResumo: ${results.filter((r) => r.ok || r.dryRun).length} processado(s)`);
process.exit(results.some((r) => r.ok === false) ? 1 : 0);
