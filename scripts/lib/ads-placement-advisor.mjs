/**
 * Consultor de placements Meta — detecta avisos (coluna direita, Threads, etc.)
 * e corrige automaticamente o que a API permite.
 */
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  isMetaAdsConfigured,
  metaConfig,
  uploadAdImage,
  graphGet,
  createAdCreative,
  swapAdCreative,
  sanitizeVideoData,
} from "./meta-ads-api.mjs";
import { appendLog } from "./ads-log.mjs";
import { recordBrainEvent } from "./ads-autopilot-brain.mjs";
import { processMetaRecommendations } from "./meta-recommendation-executor.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const feedDir = resolve(root, "marketing/social/output/feed");

const PLACEMENT_REC_TYPES = new Set([
  "AUTOMATIC_PLACEMENTS",
  "UNCROP_IMAGE",
  "PERFORMANT_CREATIVE_REELS_OPT_IN",
  "MUSIC",
]);

function feedImageFor(meta, slug) {
  const candidates = [
    meta?.file && resolve(feedDir, `${meta.file}.png`),
    resolve(feedDir, `${slug}.png`),
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p)) ?? null;
}

/** Diagnóstico legível (painel + IA). */
export function buildPlacementAdvice({ state = {}, metaRecommendations = {} }) {
  const issues = [];
  let cfg = null;
  try {
    cfg = metaConfig();
  } catch {
    return { issues: [], fixableCount: 0, summary: "Meta não configurada" };
  }

  if (!cfg.instagramActorId) {
    issues.push({
      id: "instagram_identity",
      severity: "warn",
      title: "Instagram não vinculado nos anúncios",
      detail:
        "Anúncios podem não aparecer no Instagram com sua conta. Adicione META_INSTAGRAM_ACTOR_ID no .env.local.",
      auto: false,
      manual:
        "Business Manager → Página Trove → Instagram → Conectar → copiar Instagram account ID",
    });
  }

  if (!cfg.threadsUserId) {
    issues.push({
      id: "threads_identity",
      severity: "info",
      title: "Threads Feed",
      detail:
        cfg.instagramActorId
          ? "Instagram configurado no autopilot — Threads usa a mesma identidade. Se o aviso persistir, confira Identidade no Ads Manager."
          : "Vídeos não rodam no Threads até vincular Instagram à Página.",
      auto: false,
      manual: cfg.instagramActorId
        ? "Ads Manager → anúncio → Identidade → confirmar Instagram @shoptrove.us"
        : "Business Manager → Página Trove → Instagram → conectar → META_INSTAGRAM_ACTOR_ID no .env",
    });
  }

  for (const [slug, meta] of Object.entries(state.ads ?? {})) {
    if (meta.status !== "ACTIVE") continue;

    if (meta.videoAdId) {
      issues.push({
        id: `video_placements_${slug}`,
        severity: "info",
        title: `${meta.product ?? slug} — coluna direita (Facebook)`,
        detail:
          "Vídeo não roda na coluna direita — só imagem. Impacto baixo (1 posicionamento). Feed, Reels e Stories seguem normais com o anúncio de imagem + vídeo.",
        slug,
        auto: false,
      });
    }
  }

  for (const rec of metaRecommendations.pending ?? []) {
    if (PLACEMENT_REC_TYPES.has(rec.type) && rec.canAuto) {
      issues.push({
        id: `meta_${rec.type}`,
        severity: "info",
        title: `Meta recomenda: ${rec.label}`,
        detail: rec.lift || rec.body?.slice(0, 140) || "Aplicável via API",
        auto: true,
        applyAction: "meta-recs",
      });
    }
  }

  const fixableCount = issues.filter((i) => i.auto).length;
  const manualCount = issues.filter((i) => !i.auto).length;
  const summary =
    issues.length === 0
      ? "Placements OK — sem avisos conhecidos"
      : `${fixableCount} correção(ões) automática(s) · ${manualCount} passo(s) manual(is)`;

  return { issues, fixableCount, manualCount, summary };
}

async function resolveVideoCreativeId(meta) {
  if (meta?.videoCreativeId) return meta.videoCreativeId;
  if (!meta?.videoAdId) return null;
  try {
    const ad = await graphGet(`/${meta.videoAdId}`, { fields: "creative{id}" });
    const id = ad.creative?.id ?? null;
    if (id) meta.videoCreativeId = id;
    return id;
  } catch {
    return null;
  }
}

async function ensureVideoCreativeThumbnail(meta, slug, { dryRun = false } = {}) {
  const creativeId = await resolveVideoCreativeId(meta);
  if (!meta?.videoAdId || !creativeId) {
    return { ok: false, reason: "sem anúncio de vídeo" };
  }

  const imagePath = feedImageFor(meta, slug);
  if (!imagePath) {
    return { ok: false, reason: "sem PNG no feed — rode npm run social:pack" };
  }

  let creative;
  try {
    creative = await graphGet(`/${creativeId}`, {
      fields: "object_story_spec",
    });
  } catch (err) {
    return { ok: false, reason: err.message };
  }

  const vd = creative.object_story_spec?.video_data;
  if (!vd?.video_id) return { ok: false, reason: "criativo não é vídeo" };
  if (vd.image_hash) return { ok: true, skipped: true, reason: "miniatura já existe" };

  if (dryRun) {
    return { ok: true, dryRun: true, slug, product: meta.product };
  }

  const cfg = metaConfig();
  const imageHash = await uploadAdImage(imagePath);
  const objectStory = {
    page_id: cfg.pageId,
    video_data: {
      video_id: vd.video_id,
      title: vd.title,
      message: vd.message,
      link_description: vd.link_description,
      call_to_action: vd.call_to_action,
      image_hash: imageHash,
    },
  };
  if (cfg.instagramActorId) objectStory.instagram_user_id = cfg.instagramActorId;
  if (cfg.threadsUserId) objectStory.threads_user_id = cfg.threadsUserId;

  const newCreative = await createAdCreative({
    name: `Video fix thumb · ${slug}`,
    object_story_spec: objectStory,
  });
  await swapAdCreative(meta.videoAdId, newCreative.id);
  meta.videoCreativeId = newCreative.id;

  appendLog({
    action: "placement_video_thumb",
    slug,
    adId: meta.videoAdId,
    creativeId: newCreative.id,
  });

  return { ok: true, slug, product: meta.product, creativeId: newCreative.id };
}

async function resolveCreativeId(meta, adIdField, creativeField) {
  if (meta?.[creativeField]) return meta[creativeField];
  if (!meta?.[adIdField]) return null;
  try {
    const ad = await graphGet(`/${meta[adIdField]}`, { fields: "creative{id}" });
    const id = ad.creative?.id ?? null;
    if (id) meta[creativeField] = id;
    return id;
  } catch {
    return null;
  }
}

/** Vincula Instagram (e Threads se configurado) ao criativo do anúncio. */
async function ensureAdIdentity(meta, slug, { dryRun = false, video = false } = {}) {
  const cfg = metaConfig();
  if (!cfg.instagramActorId) {
    return { ok: false, reason: "META_INSTAGRAM_ACTOR_ID ausente" };
  }

  const adId = video ? meta.videoAdId : meta.adId;
  const creativeField = video ? "videoCreativeId" : "creativeId";
  const creativeId = await resolveCreativeId(
    meta,
    video ? "videoAdId" : "adId",
    creativeField,
  );
  if (!adId || !creativeId) return { ok: false, reason: "sem anúncio" };

  let creative;
  try {
    creative = await graphGet(`/${creativeId}`, { fields: "object_story_spec" });
  } catch (err) {
    return { ok: false, reason: err.message };
  }

  const spec = creative.object_story_spec;
  if (!spec) return { ok: false, reason: "criativo sem object_story_spec" };

  const hasIg = spec.instagram_user_id === cfg.instagramActorId;
  const hasThreads = !cfg.threadsUserId || spec.threads_user_id === cfg.threadsUserId;
  if (hasIg && hasThreads) {
    return { ok: true, skipped: true, reason: "identidade já configurada" };
  }

  if (dryRun) {
    return { ok: true, dryRun: true, slug, product: meta.product, video };
  }

  const objectStory = { page_id: cfg.pageId };
  if (spec.link_data) objectStory.link_data = spec.link_data;
  if (spec.video_data) objectStory.video_data = sanitizeVideoData(spec.video_data);
  if (!objectStory.link_data && !objectStory.video_data) {
    return { ok: false, reason: "tipo de criativo não suportado" };
  }
  objectStory.instagram_user_id = cfg.instagramActorId;
  if (cfg.threadsUserId) objectStory.threads_user_id = cfg.threadsUserId;

  try {
    const newCreative = await createAdCreative({
      name: `Identity · ${slug}${video ? " video" : ""}`,
      object_story_spec: objectStory,
    });
    await swapAdCreative(adId, newCreative.id);
    meta[creativeField] = newCreative.id;

  appendLog({
    action: "placement_identity",
    slug,
    adId,
    creativeId: newCreative.id,
    video,
    instagramActorId: cfg.instagramActorId,
  });
  recordBrainEvent("placement_identity_fixed", { slug, video, adId });

  return { ok: true, slug, product: meta.product, video, creativeId: newCreative.id };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

/**
 * Aplica correções automáticas de placement + recomendações Meta relacionadas.
 */
export async function applyPlacementFixes({
  state,
  saveState,
  dryRun = false,
  topAd = null,
} = {}) {
  const lines = [];
  const applied = [];

  if (!isMetaAdsConfigured()) {
    return { ok: false, error: "Meta não configurada", lines, applied };
  }

  lines.push("🎯 Consultor de placements Trove");

  const metaRecs = await processMetaRecommendations({ state, dryRun, topAd });
  if (metaRecs.lines?.length) {
    lines.push(...metaRecs.lines);
    if (metaRecs.applied?.length) {
      applied.push(...metaRecs.applied.map((a) => ({ ...a, source: "meta_rec" })));
    }
  }

  for (const [slug, meta] of Object.entries(state.ads ?? {})) {
    if (meta.status !== "ACTIVE") continue;

    for (const video of [false, true]) {
      if (video && !meta.videoAdId) continue;
      if (!video && !meta.adId) continue;

      const idResult = await ensureAdIdentity(meta, slug, { dryRun, video });
      if (idResult.skipped) {
        lines.push(`✓ ${meta.product ?? slug}${video ? " (vídeo)" : ""} — Instagram já vinculado`);
      } else if (idResult.dryRun) {
        lines.push(`📸 [dry] Vincular Instagram · ${meta.product ?? slug}${video ? " vídeo" : ""}`);
        applied.push({ slug, type: "instagram_identity", video, dryRun: true });
      } else if (idResult.ok) {
        lines.push(`✅ Instagram vinculado · ${idResult.product ?? slug}${video ? " (vídeo)" : ""}`);
        applied.push({ slug, type: "instagram_identity", video });
      } else if (idResult.reason) {
        lines.push(`⏭ ${meta.product ?? slug}${video ? " (vídeo)" : ""} identidade — ${idResult.reason}`);
      }
    }

    if (!meta.videoAdId) continue;

    const result = await ensureVideoCreativeThumbnail(meta, slug, { dryRun });
    if (result.skipped) {
      lines.push(`✓ ${meta.product ?? slug} — vídeo já tem miniatura`);
      continue;
    }
    if (result.dryRun) {
      lines.push(`🖼 [dry] Adicionar miniatura ao vídeo · ${meta.product ?? slug}`);
      applied.push({ slug, type: "video_thumbnail", dryRun: true });
      continue;
    }
    if (result.ok) {
      lines.push(`✅ Miniatura adicionada ao vídeo · ${result.product ?? slug}`);
      applied.push({ slug, type: "video_thumbnail" });
      continue;
    }
    if (result.reason) {
      lines.push(`⏭ ${meta.product ?? slug} — ${result.reason}`);
    }
  }

  const advice = buildPlacementAdvice({
    state,
    metaRecommendations: metaRecs.pending ? { pending: metaRecs.pending } : {},
  });
  for (const issue of advice.issues.filter((i) => !i.auto)) {
    lines.push(`📋 Manual: ${issue.title} — ${issue.manual ?? issue.detail}`);
  }

  if (!dryRun && typeof saveState === "function") {
    saveState(state);
  }

  if (!applied.length && advice.manualCount) {
    lines.push("");
    lines.push(`ℹ️ ${advice.manualCount} item(ns) precisam de ação no Ads Manager (Threads/Instagram).`);
  }

  return {
    ok: true,
    lines,
    applied,
    advice,
    metaRecs,
  };
}
