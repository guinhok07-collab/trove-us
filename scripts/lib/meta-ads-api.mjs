/**
 * Meta Marketing API helpers (Graph API v21).
 * Requires env: META_ACCESS_TOKEN, META_AD_ACCOUNT_ID, META_PAGE_ID
 */
import { readFileSync, existsSync } from "fs";
import {
  isRateLimitError,
  setLastUserError,
  translateMetaError,
  userErrorMessage,
} from "./meta-error-i18n.mjs";

const API = "https://graph.facebook.com/v21.0";

const TOKEN_CACHE_MS = 30 * 60 * 1000;
const RATE_LIMIT_COOLDOWN_MS = 20 * 60 * 1000;
let tokenCache = { at: 0, data: null };
let rateLimitUntil = 0;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function isMetaRateLimited() {
  return Date.now() < rateLimitUntil;
}

export function markMetaRateLimited(ms = RATE_LIMIT_COOLDOWN_MS) {
  rateLimitUntil = Date.now() + ms;
}

function cacheTokenResult(data) {
  tokenCache = { at: Date.now(), data };
  return data;
}

function insightPauseMs() {
  return Number(process.env.META_INSIGHTS_PAUSE_MS ?? 600);
}

function apiRetryCount() {
  return Number(process.env.META_API_RETRY_COUNT ?? 2);
}

export function metaConfig() {
  const token = process.env.META_ACCESS_TOKEN?.trim();
  const adAccountRaw = process.env.META_AD_ACCOUNT_ID?.trim() ?? "";
  const adAccountId = adAccountRaw.replace(/^act_/, "");
  const pageId = process.env.META_PAGE_ID?.trim();
  const pixelId =
    process.env.META_PIXEL_ID?.trim() ||
    process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://trove-us.com";

  if (!token || !adAccountId || !pageId) {
    throw new Error(
      "Missing META_ACCESS_TOKEN, META_AD_ACCOUNT_ID or META_PAGE_ID — see marketing/social/AUTOPILOT-SETUP.md",
    );
  }

  return {
    token,
    adAccountId,
    act: `act_${adAccountId}`,
    pageId,
    pixelId,
    siteUrl,
    dailyBudgetCents: Number(process.env.META_AD_DAILY_BUDGET_CENTS ?? 1000),
    maxNewAds: Number(process.env.META_AD_MAX_NEW ?? 3),
    adStatus: process.env.META_AD_STATUS?.trim() || "ACTIVE",
    instagramActorId: process.env.META_INSTAGRAM_ACTOR_ID?.trim() || "",
    threadsUserId: process.env.META_THREADS_USER_ID?.trim() || "",
  };
}

function applyIdentityToStory(objectStory, cfg) {
  if (cfg.instagramActorId) objectStory.instagram_user_id = cfg.instagramActorId;
  if (cfg.threadsUserId) objectStory.threads_user_id = cfg.threadsUserId;
  return objectStory;
}

/** Meta rejeita image_url + image_hash juntos em video_data. */
export function sanitizeVideoData(vd) {
  if (!vd) return vd;
  const out = {
    video_id: vd.video_id,
    title: vd.title,
    message: vd.message,
    link_description: vd.link_description,
    call_to_action: vd.call_to_action,
  };
  if (vd.image_hash) out.image_hash = vd.image_hash;
  else if (vd.image_url) out.image_url = vd.image_url;
  return out;
}

/** GET Graph (exportado para consultores). */
export async function graphGet(path, { fields } = {}) {
  const { token } = metaConfig();
  const url = new URL(`${API}${path}`);
  url.searchParams.set("access_token", token);
  if (fields) url.searchParams.set("fields", fields);
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) {
    const msg = data.error?.error_user_msg ?? data.error?.message ?? res.statusText;
    throw new Error(msg);
  }
  return data;
}

/** POST Graph JSON (exportado para consultores). */
export async function graphPost(path, body) {
  return graph(path, { method: "POST", body });
}

export async function createAdCreative({ name, object_story_spec }) {
  const cfg = metaConfig();
  return graph(`/${cfg.act}/adcreatives`, {
    method: "POST",
    body: { name, object_story_spec },
  });
}

export async function swapAdCreative(adId, creativeId) {
  return graph(`/${adId}`, {
    method: "POST",
    body: { creative: { creative_id: creativeId } },
  });
}

export async function getAdCreative(creativeId) {
  return graphGet(`/${creativeId}`, { fields: "id,name,object_story_spec,asset_feed_spec" });
}

export function isMetaAdsConfigured() {
  try {
    metaConfig();
    return true;
  } catch {
    return false;
  }
}

async function graph(path, { method = "GET", body } = {}, attempt = 0) {
  const { token } = metaConfig();
  const url = new URL(`${API}${path}`);
  url.searchParams.set("access_token", token);

  const init = { method, headers: {} };
  if (body && method === "POST") {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url, init);
  const data = await res.json();
    if (!res.ok || data.error) {
      const msg = data.error?.error_user_msg ?? data.error?.message ?? res.statusText;
      const code = data.error?.code ?? res.status;
      const raw = `Meta API ${path}: [${code}] ${msg}`;

      if (isRateLimitError({ message: msg, code })) {
        markMetaRateLimited();
      }

      if (isRateLimitError({ message: msg, code }) && attempt < apiRetryCount()) {
        await sleep(15000 * (attempt + 1));
        return graph(path, { method, body }, attempt + 1);
      }

    const translated = setLastUserError(raw);
    throw new Error(translated.message);
  }
  return data;
}

export async function ensureAutopilotCampaign(campaignId) {
  const cfg = metaConfig();
  if (campaignId) {
    try {
      await graph(`/${campaignId}?fields=id,name,status`);
      return campaignId;
    } catch {
      /* recreate */
    }
  }
  const campaign = await graph(`/${cfg.act}/campaigns`, {
    method: "POST",
    body: {
      name: "Trove Autopilot",
      objective: "OUTCOME_TRAFFIC",
      status: cfg.adStatus,
      buying_type: "AUCTION",
      special_ad_categories: [],
      is_adset_budget_sharing_enabled: false,
    },
  });
  return campaign.id;
}

export async function uploadAdImage(imagePath) {
  const { token, act } = metaConfig();
  if (!existsSync(imagePath)) {
    throw new Error(`Image not found: ${imagePath}`);
  }
  const bytes = readFileSync(imagePath);
  const filename = imagePath.split(/[/\\]/).pop() ?? "creative.png";
  const form = new FormData();
  form.append("access_token", token);
  form.append(
    "filename",
    new Blob([bytes], { type: "image/png" }),
    filename,
  );

  const res = await fetch(`${API}/${act}/adimages`, { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok || data.error) {
    const msg = data.error?.error_user_msg ?? data.error?.message ?? res.statusText;
    setLastUserError(`Meta image upload: ${msg}`);
    throw new Error(userErrorMessage(`Meta image upload: ${msg}`));
  }
  const entry = Object.values(data.images ?? {})[0];
  if (!entry?.hash) throw new Error("Meta image upload: no hash returned");
  return entry.hash;
}

export async function createTrafficAd({
  name,
  message,
  title,
  link,
  imageUrl,
  imagePath,
  campaignId,
}) {
  const cfg = metaConfig();
  const cid = await ensureAutopilotCampaign(campaignId);

  const adset = await graph(`/${cfg.act}/adsets`, {
    method: "POST",
    body: {
      name: `Trove · ${name}`,
      campaign_id: cid,
      daily_budget: cfg.dailyBudgetCents,
      billing_event: "IMPRESSIONS",
      optimization_goal: "LINK_CLICKS",
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      destination_type: "WEBSITE",
      targeting: {
        geo_locations: { countries: ["US"] },
        age_min: 25,
        age_max: 54,
        targeting_automation: { advantage_audience: 0 },
      },
      status: cfg.adStatus,
    },
  });

  const linkData = {
    link,
    message,
    name: title,
    call_to_action: { type: "SHOP_NOW", value: { link } },
  };

  if (imagePath) {
    linkData.image_hash = await uploadAdImage(imagePath);
  } else if (imageUrl) {
    linkData.picture = imageUrl;
  }

  const objectStory = {
    page_id: cfg.pageId,
    link_data: linkData,
  };
  applyIdentityToStory(objectStory, cfg);

  const creative = await graph(`/${cfg.act}/adcreatives`, {
    method: "POST",
    body: {
      name: `Creative · ${name}`,
      object_story_spec: objectStory,
    },
  });

  const ad = await graph(`/${cfg.act}/ads`, {
    method: "POST",
    body: {
      name: `Ad · ${name}`,
      adset_id: adset.id,
      creative: { creative_id: creative.id },
      status: cfg.adStatus,
    },
  });

  return {
    campaignId: cid,
    adsetId: adset.id,
    creativeId: creative.id,
    adId: ad.id,
  };
}

export async function updateAdsetDailyBudget(adsetId, dailyBudgetCents) {
  return graph(`/${adsetId}`, {
    method: "POST",
    body: { daily_budget: dailyBudgetCents },
  });
}

export async function setAdStatus(adId, status) {
  return graph(`/${adId}`, { method: "POST", body: { status } });
}

export async function getAdInsights(adIds, { datePreset = "last_3d", timeRange = null } = {}) {
  if (!adIds.length) return [];
  const fields = [
    "ad_id",
    "ad_name",
    "spend",
    "impressions",
    "clicks",
    "ctr",
    "cpc",
    "actions",
    "action_values",
  ].join(",");

  const out = [];
  for (const adId of adIds) {
    try {
      let path = `/${adId}/insights?fields=${fields}`;
      if (timeRange) {
        path += `&time_range=${encodeURIComponent(JSON.stringify(timeRange))}`;
      } else {
        path += `&date_preset=${datePreset}`;
      }
      const data = await graph(path);
      if (data.data?.[0]) out.push(data.data[0]);
      if (adIds.length > 1) await sleep(insightPauseMs());
    } catch (err) {
      console.warn(`Insights ${adId}:`, err.message);
      if (isRateLimitError(err)) break;
    }
  }
  return out;
}

/** Segunda-feira 00:00 até hoje (fuso local). */
export function currentWeekTimeRange() {
  const now = new Date();
  const start = new Date(now);
  const dow = start.getDay();
  const toMonday = dow === 0 ? 6 : dow - 1;
  start.setDate(start.getDate() - toMonday);
  start.setHours(0, 0, 0, 0);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { since: fmt(start), until: fmt(now) };
}

export function extractAction(insight, actionType) {
  const actions = insight.actions ?? [];
  const hit = actions.find((a) => a.action_type === actionType);
  return hit ? Number(hit.value) : 0;
}

const PURCHASE_ACTIONS = [
  "purchase",
  "omni_purchase",
  "offsite_conversion.fb_pixel_purchase",
  "web_in_store_purchase",
];

export function extractPurchases(insight) {
  let total = 0;
  for (const t of PURCHASE_ACTIONS) total += extractAction(insight, t);
  return total;
}

export function extractPurchaseValue(insight) {
  const values = insight.action_values ?? [];
  let total = 0;
  for (const t of PURCHASE_ACTIONS) {
    const hit = values.find((a) => a.action_type === t);
    if (hit) total += Number(hit.value ?? 0);
  }
  return total;
}

/** Valida se o token Meta ainda funciona (não expirou). Usa cache para não estourar limite da API. */
export async function verifyMetaToken({ force = false } = {}) {
  const now = Date.now();
  if (!force && tokenCache.data && now - tokenCache.at < TOKEN_CACHE_MS) {
    return tokenCache.data;
  }
  if (!force && isMetaRateLimited()) {
    if (tokenCache.data?.ok) {
      return { ...tokenCache.data, rateLimited: true, fromCache: true };
    }
    return {
      ok: false,
      rateLimited: true,
      expired: false,
      error: translateMetaError("Application request limit reached").message,
      code: 4,
    };
  }

  try {
    const { token } = metaConfig();
    const url = new URL(`${API}/me`);
    url.searchParams.set("access_token", token);
    url.searchParams.set("fields", "id,name");
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || data.error) {
      const raw = data.error?.error_user_msg ?? data.error?.message ?? "Token inválido";
      const code = data.error?.code;
      if (isRateLimitError({ message: raw, code })) {
        markMetaRateLimited();
        if (tokenCache.data?.ok) {
          return cacheTokenResult({ ...tokenCache.data, rateLimited: true, fromCache: true });
        }
        const translated = translateMetaError(raw);
        return {
          ok: false,
          rateLimited: true,
          expired: false,
          error: translated.message,
          code,
        };
      }
      const translated = translateMetaError(raw);
      return {
        ok: false,
        expired: code === 190,
        rateLimited: false,
        error: translated.message,
        code,
      };
    }
    return cacheTokenResult({ ok: true, id: data.id, name: data.name, rateLimited: false });
  } catch (err) {
    return { ok: false, error: translateMetaError(err).message, rateLimited: false };
  }
}

const ACCOUNT_STATUS_PT = {
  1: { ok: true, label: "Conta ativa" },
  2: { ok: false, label: "Conta desativada" },
  3: { ok: false, label: "Pagamento pendente na Meta" },
  7: { ok: false, label: "Conta em revisão de risco" },
  8: { ok: false, label: "Acerto de pagamento pendente" },
  9: { ok: false, label: "Falha no cartão — período de carência" },
  100: { ok: false, label: "Conta fechando" },
  101: { ok: false, label: "Conta fechada" },
};

const DISABLE_REASON_PT = {
  3: "Problema de pagamento na Meta",
  4: "Conta encerrada por política",
  7: "Conta encerrada permanentemente",
};

let adAccountBillingCache = { at: 0, data: null };
const AD_ACCOUNT_BILLING_TTL_MS = 15 * 60 * 1000;

/** Verifica forma de pagamento / status de cobrança da conta de anúncios Meta. */
export async function verifyAdAccountBilling({ force = false } = {}) {
  if (!isMetaAdsConfigured()) {
    return { ok: false, configured: false, detail: "Meta não configurado" };
  }
  const now = Date.now();
  if (!force && adAccountBillingCache.data && now - adAccountBillingCache.at < AD_ACCOUNT_BILLING_TTL_MS) {
    return adAccountBillingCache.data;
  }
  if (!force && isMetaRateLimited()) {
    if (adAccountBillingCache.data) {
      return { ...adAccountBillingCache.data, rateLimited: true, fromCache: true };
    }
    return {
      ok: false,
      configured: true,
      paymentOk: false,
      detail: "Limite Meta — não foi possível verificar pagamento agora",
      rateLimited: true,
    };
  }

  try {
    const data = await graphGet(`/${metaConfig().act}`, {
      fields: "name,account_status,disable_reason,funding_source_details,balance,currency,amount_spent",
    });
    const status = Number(data.account_status ?? 0);
    const statusInfo = ACCOUNT_STATUS_PT[status] ?? { ok: status === 1, label: `Status ${status}` };
    const disableReason = DISABLE_REASON_PT[data.disable_reason] ?? null;
    const hasFunding = Boolean(
      data.funding_source_details &&
        (data.funding_source_details.id || data.funding_source_details.type),
    );
    const paymentIssue =
      !statusInfo.ok ||
      Boolean(disableReason) ||
      status === 3 ||
      status === 9;

    let detail = statusInfo.label;
    if (data.name) detail = `${data.name} · ${detail}`;
    if (disableReason) detail += ` · ${disableReason}`;
    if (!hasFunding && status === 1) {
      detail += " · Verifique forma de pagamento no Meta Ads";
    }
    if (hasFunding && status === 1 && !paymentIssue) {
      detail += " · Pagamento OK";
    }

    const result = {
      ok: !paymentIssue,
      configured: true,
      paymentOk: !paymentIssue,
      accountStatus: status,
      hasFunding,
      disableReason: data.disable_reason ?? null,
      detail,
      balance: data.balance,
      currency: data.currency,
      rateLimited: false,
    };
    adAccountBillingCache = { at: now, data: result };
    return result;
  } catch (err) {
    const msg = translateMetaError(err).message;
    if (isRateLimitError(err)) markMetaRateLimited();
    const result = {
      ok: false,
      configured: true,
      paymentOk: false,
      detail: msg,
      rateLimited: isRateLimitError(err),
    };
    if (!isRateLimitError(err)) adAccountBillingCache = { at: now, data: result };
    return result;
  }
}

export function insightSpendBrl(insight) {
  return Math.round(Number(insight.spend ?? 0) * 100);
}

/** Pontuação de oportunidade Meta (0–100) — mesmo painel do Ads Manager. */
export async function getOpportunityScore() {
  const { token, act } = metaConfig();
  const url = new URL(`${API}/${act}`);
  url.searchParams.set("fields", "opportunity_score");
  url.searchParams.set("access_token", token);
  const data = await fetch(url).then((r) => r.json());
  if (data.error) throw new Error(data.error.message);
  return Number(data.opportunity_score ?? 0);
}

/** Recomendações pendentes do Meta (Opportunity Score). */
export async function fetchMetaRecommendations() {
  const { token, act } = metaConfig();
  const fields =
    "recommendations{type,recommendation_signature,recommendation_stage,object_ids,recommendation_content,url}";
  const url = new URL(`${API}/${act}/recommendations`);
  url.searchParams.set("fields", fields);
  url.searchParams.set("access_token", token);
  const data = await fetch(url).then((r) => r.json());
  if (data.error) throw new Error(data.error.message);
  const flat = [];
  for (const block of data.data ?? []) {
    for (const rec of block.recommendations ?? []) {
      flat.push(rec);
    }
  }
  return flat;
}

/** Aplica recomendação com signature via API Meta (MUSIC, placements, etc.). */
export async function applyMetaRecommendation(signature, extraData = {}) {
  const { token, act } = metaConfig();
  const form = new URLSearchParams();
  form.set("access_token", token);
  form.set("recommendation_signature", signature);
  if (Object.keys(extraData).length) {
    form.set("extra_data", JSON.stringify(extraData));
  }
  const res = await fetch(`${API}/${act}/recommendations`, { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok || data.error) {
    const msg = data.error?.error_user_msg ?? data.error?.message ?? res.statusText;
    throw new Error(`Meta apply recommendation: ${msg}`);
  }
  return data;
}

function videoMime(filename) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".mov")) return "video/quicktime";
  return "video/webm";
}

/** Upload vídeo para biblioteca de anúncios (Reels/Stories/In-feed). */
export async function uploadAdVideo(videoPath) {
  const { token, act } = metaConfig();
  if (!existsSync(videoPath)) {
    throw new Error(`Video not found: ${videoPath}`);
  }
  const bytes = readFileSync(videoPath);
  const filename = videoPath.split(/[/\\]/).pop() ?? "creative.webm";
  const form = new FormData();
  form.append("access_token", token);
  form.append(
    "source",
    new Blob([bytes], { type: videoMime(filename) }),
    filename,
  );

  const res = await fetch(`${API}/${act}/advideos`, { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok || data.error) {
    const msg = data.error?.error_user_msg ?? data.error?.message ?? res.statusText;
    throw new Error(`Meta video upload: ${msg}`);
  }
  if (!data.id) throw new Error("Meta video upload: no id returned");
  return data.id;
}

/** Cria anúncio de tráfego com vídeo (Reels + Feed). */
export async function createTrafficVideoAd({
  name,
  message,
  title,
  link,
  videoPath,
  imagePath,
  campaignId,
}) {
  const cfg = metaConfig();
  const cid = await ensureAutopilotCampaign(campaignId);
  const videoId = await uploadAdVideo(videoPath);

  const adset = await graph(`/${cfg.act}/adsets`, {
    method: "POST",
    body: {
      name: `Trove Video · ${name}`,
      campaign_id: cid,
      daily_budget: cfg.dailyBudgetCents,
      billing_event: "IMPRESSIONS",
      optimization_goal: "LINK_CLICKS",
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      destination_type: "WEBSITE",
      targeting: {
        geo_locations: { countries: ["US"] },
        age_min: 25,
        age_max: 54,
        targeting_automation: { advantage_audience: 0 },
      },
      status: cfg.adStatus,
    },
  });

  const videoData = {
    video_id: videoId,
    title,
    message,
    link_description: title,
    call_to_action: { type: "SHOP_NOW", value: { link } },
  };

  if (imagePath && existsSync(imagePath)) {
    videoData.image_hash = await uploadAdImage(imagePath);
  }

  const objectStory = {
    page_id: cfg.pageId,
    video_data: videoData,
  };
  applyIdentityToStory(objectStory, cfg);

  const creative = await graph(`/${cfg.act}/adcreatives`, {
    method: "POST",
    body: {
      name: `Video Creative · ${name}`,
      object_story_spec: objectStory,
    },
  });

  const ad = await graph(`/${cfg.act}/ads`, {
    method: "POST",
    body: {
      name: `Video Ad · ${name}`,
      adset_id: adset.id,
      creative: { creative_id: creative.id },
      status: cfg.adStatus,
    },
  });

  return {
    campaignId: cid,
    adsetId: adset.id,
    creativeId: creative.id,
    adId: ad.id,
    videoId,
  };
}
