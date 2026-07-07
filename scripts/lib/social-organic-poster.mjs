/**
 * Social Autopilot — organic Reels on Instagram + Facebook (daily rotation).
 */
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  statSync,
} from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { metaConfig, isMetaAdsConfigured } from "./meta-ads-api.mjs";
import { buildElaborateOrganicCopy, buildOrganicTelegramMessage, pickFeedPostForDay } from "./social-organic-copy.mjs";
import { ensureReelMp4, videoPaths } from "./social-video-export.mjs";
import { appendLog } from "./ads-log.mjs";
import { sendTelegram, formatTelegram } from "./telegram-notify.mjs";
import { spawnSync } from "child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const API = "https://graph.facebook.com/v21.0";
const STATE_PATH = resolve(root, "marketing/social/organic-social-state.json");
const ADS_PATH = resolve(root, "marketing/social/ads.json");

export function isSocialOrganicEnabled() {
  return process.env.META_SOCIAL_ORGANIC !== "0";
}

function windowsTaskInstalled() {
  if (process.platform !== "win32") return false;
  const r = spawnSync("schtasks", ["/Query", "/TN", "Trove-Social-Organic", "/FO", "LIST"], {
    encoding: "utf8",
  });
  return r.status === 0;
}

function loadAds() {
  if (!existsSync(ADS_PATH)) return [];
  return JSON.parse(readFileSync(ADS_PATH, "utf8"));
}

export function loadOrganicState() {
  if (!existsSync(STATE_PATH)) {
    return { enabled: true, queueIndex: 0, history: [], lastPostedAt: null, lastSlug: null };
  }
  try {
    return JSON.parse(readFileSync(STATE_PATH, "utf8"));
  } catch {
    return { enabled: true, queueIndex: 0, history: [], lastPostedAt: null, lastSlug: null };
  }
}

function saveOrganicState(state) {
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

/** Active ad slugs first, then full catalog rotation. */
export function buildRotationQueue(ads) {
  const statePath = resolve(root, "marketing/social/autopilot-state.json");
  let activeSlugs = [];
  if (existsSync(statePath)) {
    try {
      const st = JSON.parse(readFileSync(statePath, "utf8"));
      activeSlugs = Object.entries(st.ads ?? {})
        .filter(([, m]) => m.status === "ACTIVE")
        .map(([slug]) => slug);
    } catch {
      /* ignore */
    }
  }

  const bySlug = new Map(ads.map((a) => [a.slug, a]));
  const queue = [];
  for (const slug of activeSlugs) {
    if (bySlug.has(slug)) queue.push(bySlug.get(slug));
  }
  for (const ad of ads) {
    if (!queue.some((q) => q.slug === ad.slug)) queue.push(ad);
  }
  return queue;
}

export function pickNextProduct(state, ads) {
  const queue = buildRotationQueue(ads);
  if (!queue.length) return { ad: null, queue, nextIndex: 0 };

  const idx = state.queueIndex % queue.length;
  return { ad: queue[idx], queue, nextIndex: (idx + 1) % queue.length };
}

async function getPageAccessToken() {
  const { token, pageId } = metaConfig();
  const url = new URL(`${API}/me/accounts`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("fields", "access_token,id,name");
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) {
    return { ok: false, token, error: data.error?.message ?? "Could not get page token" };
  }
  const page = (data.data ?? []).find((p) => p.id === pageId);
  if (!page?.access_token) {
    return {
      ok: false,
      token,
      error: `Page token not found for PAGE_ID ${pageId}. Add pages_manage_posts permission.`,
    };
  }
  return { ok: true, token: page.access_token, pageId };
}

async function publishFacebookReel({ pageToken, pageId, mp4Path, caption }) {
  const buf = readFileSync(mp4Path);
  const form = new FormData();
  form.append("access_token", pageToken);
  form.append("description", caption);
  form.append("title", (caption.split("\n")[0] ?? "Trove").slice(0, 80));
  form.append("source", new Blob([buf], { type: "video/mp4" }), "reel.mp4");

  const res = await fetch(`${API}/${pageId}/videos`, { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok || data.error) {
    return { ok: false, error: data.error?.message ?? res.statusText };
  }
  return { ok: true, id: data.id };
}

async function publishInstagramReel({ igUserId, token, mp4Path, caption, publicUrl }) {
  const fileSize = statSync(mp4Path).size;

  const createUrl = new URL(`${API}/${igUserId}/media`);
  createUrl.searchParams.set("access_token", token);
  createUrl.searchParams.set("media_type", "REELS");
  createUrl.searchParams.set("upload_type", "resumable");
  createUrl.searchParams.set("caption", caption);
  createUrl.searchParams.set("share_to_feed", "true");

  let createRes = await fetch(createUrl, { method: "POST" });
  let createData = await createRes.json();

  if (!createRes.ok || createData.error) {
    if (publicUrl) {
      const url = new URL(`${API}/${igUserId}/media`);
      url.searchParams.set("access_token", token);
      const body = {
        media_type: "REELS",
        video_url: publicUrl,
        caption,
        share_to_feed: true,
      };
      createRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      createData = await createRes.json();
    }
    if (!createRes.ok || createData.error) {
      return {
        ok: false,
        error:
          createData.error?.message ??
          "Instagram publish failed — add instagram_content_publish permission in Meta Developers",
      };
    }
  }

  const containerId = createData.id;
  if (createData.uri || createData.upload_url) {
    const uploadUrl = createData.uri ?? createData.upload_url;
    const buf = readFileSync(mp4Path);
    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `OAuth ${token}`,
        offset: "0",
        file_size: String(fileSize),
        "Content-Type": "application/octet-stream",
      },
      body: buf,
    });
    const uploadData = await uploadRes.json().catch(() => ({}));
    if (!uploadRes.ok && uploadData?.error) {
      return { ok: false, error: uploadData.error?.message ?? "Instagram upload failed" };
    }
  }

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const statusUrl = new URL(`${API}/${containerId}`);
    statusUrl.searchParams.set("fields", "status_code,status");
    statusUrl.searchParams.set("access_token", token);
    const st = await fetch(statusUrl).then((r) => r.json());
    if (st.status_code === "FINISHED" || st.status === "FINISHED") break;
    if (st.status_code === "ERROR" || st.status === "ERROR") {
      return { ok: false, error: st.status ?? "Instagram processing error" };
    }
  }

  const publishUrl = new URL(`${API}/${igUserId}/media_publish`);
  publishUrl.searchParams.set("access_token", token);
  publishUrl.searchParams.set("creation_id", containerId);
  const pubRes = await fetch(publishUrl, { method: "POST" });
  const pubData = await pubRes.json();
  if (!pubRes.ok || pubData.error) {
    return { ok: false, error: pubData.error?.message ?? "Instagram media_publish failed" };
  }
  return { ok: true, id: pubData.id };
}

export function getSocialOrganicStatus() {
  const ads = loadAds();
  const state = loadOrganicState();
  const { ad, queue, nextIndex } = pickNextProduct(state, ads);
  const paths = ad ? videoPaths(ad) : null;
  const copy = ad ? buildElaborateOrganicCopy(ad) : null;
  return {
    enabled: isSocialOrganicEnabled() && state.enabled !== false,
    configured: isMetaAdsConfigured(),
    instagramId: process.env.META_INSTAGRAM_ACTOR_ID?.trim() || null,
    queueLength: queue.length,
    queueIndex: state.queueIndex,
    nextProduct: ad
      ? { slug: ad.slug, product: ad.product, price: ad.price, hook: ad.hook }
      : null,
    preview: copy
      ? { instagram: copy.instagram, facebook: copy.facebook }
      : null,
    feedPostSuggestion: pickFeedPostForDay(),
    lastPostedAt: state.lastPostedAt,
    lastSlug: state.lastSlug,
    history: (state.history ?? []).slice(-14),
    hasVideo: paths ? existsSync(paths.webm) || existsSync(paths.mp4) : false,
    scheduleHour: Number(process.env.META_SOCIAL_ORGANIC_HOUR ?? 15),
    automatic: isSocialOrganicEnabled(),
    taskInstalled: windowsTaskInstalled(),
    schedulerNote: isSocialOrganicEnabled()
      ? windowsTaskInstalled()
        ? `Automático — Windows task + painel após ${Number(process.env.META_SOCIAL_ORGANIC_HOUR ?? 15)}:00`
        : `Painel ativo — rode npm run social:organic:install para agendar no Windows`
      : "Desligado (META_SOCIAL_ORGANIC=0)",
  };
}

/**
 * Post next product in rotation to Instagram + Facebook.
 */
export async function runSocialOrganicPost({ dryRun = false, slug = null, force = false } = {}) {
  if (!isMetaAdsConfigured()) {
    return { ok: false, error: "Meta API not configured" };
  }
  if (!isSocialOrganicEnabled()) {
    return { ok: false, skipped: true, error: "META_SOCIAL_ORGANIC=0 — social autopilot disabled" };
  }

  const ads = loadAds();
  if (!ads.length) {
    return { ok: false, error: "No products in ads.json — run npm run social:pack" };
  }

  const state = loadOrganicState();
  const today = new Date().toDateString();
  if (
    !force &&
    !slug &&
    state.lastPostedAt &&
    new Date(state.lastPostedAt).toDateString() === today
  ) {
    return { ok: true, skipped: true, reason: "Already posted today", lastSlug: state.lastSlug };
  }

  let ad;
  let nextIndex = state.queueIndex;
  if (slug) {
    ad = ads.find((a) => a.slug === slug);
    if (!ad) return { ok: false, error: `Unknown slug: ${slug}` };
  } else {
    const pick = pickNextProduct(state, ads);
    ad = pick.ad;
    nextIndex = pick.nextIndex;
  }

  const copy = buildElaborateOrganicCopy(ad);
  const paths = videoPaths(ad);
  if (!existsSync(paths.webm) && !existsSync(paths.mp4)) {
    const { spawnSync } = await import("child_process");
    const rec = spawnSync(process.execPath, ["scripts/record-single-social-video.mjs", ad.slug], {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    });
    if (rec.status !== 0) {
      return { ok: false, error: `Could not record video for ${ad.slug}` };
    }
  }

  let mp4Path;
  let publicUrl;
  try {
    ({ mp4Path, publicUrl } = ensureReelMp4(ad));
  } catch (err) {
    return { ok: false, error: err.message };
  }

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      ad: { slug: ad.slug, product: ad.product },
      copy,
      mp4Path,
      publicUrl,
    };
  }

  const cfg = metaConfig();
  const igId = cfg.instagramActorId;
  if (!igId) {
    return { ok: false, error: "META_INSTAGRAM_ACTOR_ID missing — connect @shoptrove.us in Business Manager" };
  }

  const pageTok = await getPageAccessToken();
  const userToken = cfg.token;

  const results = { instagram: null, facebook: null };

  if (pageTok.ok) {
    results.facebook = await publishFacebookReel({
      pageToken: pageTok.token,
      pageId: cfg.pageId,
      mp4Path,
      caption: copy.facebook,
    });
  } else {
    results.facebook = { ok: false, error: pageTok.error };
  }

  results.instagram = await publishInstagramReel({
    igUserId: igId,
    token: userToken,
    mp4Path,
    caption: copy.instagram,
    publicUrl,
  });

  const ok = results.instagram?.ok || results.facebook?.ok;
  if (ok) {
    state.queueIndex = nextIndex;
    state.lastPostedAt = new Date().toISOString();
    state.lastSlug = ad.slug;
    state.history = [
      ...(state.history ?? []),
      {
        at: state.lastPostedAt,
        slug: ad.slug,
        product: ad.product,
        instagram: results.instagram?.ok,
        facebook: results.facebook?.ok,
      },
    ].slice(-60);
    saveOrganicState(state);

    appendLog({
      action: "social_organic_post",
      slug: ad.slug,
      instagram: results.instagram?.ok,
      facebook: results.facebook?.ok,
    });

    await sendTelegram(
      formatTelegram("alert", [buildOrganicTelegramMessage({ ad, copy, results })]),
    );
  }

  return {
    ok,
    ad: { slug: ad.slug, product: ad.product, price: ad.price },
    copy,
    results,
    nextIndex,
    error: ok ? null : [results.instagram?.error, results.facebook?.error].filter(Boolean).join(" · "),
  };
}
