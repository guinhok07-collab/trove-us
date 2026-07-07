/**
 * Campanhas Meta — sincroniza com autopilot local, limpa duplicatas vazias.
 */
import { metaConfig, verifyMetaToken } from "./meta-ads-api.mjs";

const API = "https://graph.facebook.com/v21.0";
const CAMPAIGN_NAME = "Trove Autopilot";

async function graphGet(path) {
  const { token } = metaConfig();
  const url = new URL(`${API}${path}`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("limit", "100");
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message ?? "Meta API error");
  }
  return data;
}

async function graphPost(path, body) {
  const { token } = metaConfig();
  const url = new URL(`${API}${path}`);
  url.searchParams.set("access_token", token);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message ?? "Meta API error");
  }
  return data;
}

export async function fetchCampaignOverview(keepCampaignId) {
  const token = await verifyMetaToken();
  if (!token.ok) {
    return { ok: false, error: token.error, campaigns: [], primary: null };
  }

  const { act } = metaConfig();
  const { data: campaigns } = await graphGet(
    `/${act}/campaigns?fields=id,name,status,effective_status`,
  );

  const trove = [];
  const other = [];

  for (const c of campaigns ?? []) {
    const { data: ads } = await graphGet(`/${c.id}/ads?fields=id,name,status,effective_status`);
    const adCount = (ads ?? []).length;
    const row = {
      id: c.id,
      name: c.name,
      status: c.effective_status ?? c.status,
      adCount,
      isPrimary: c.id === keepCampaignId,
      isEmpty: adCount === 0,
      isTrove: c.name === CAMPAIGN_NAME,
    };
    if (c.name === CAMPAIGN_NAME) trove.push(row);
    else other.push(row);
  }

  trove.sort((a, b) => b.adCount - a.adCount);
  const primary =
    trove.find((c) => c.id === keepCampaignId) ??
    trove.find((c) => c.adCount > 0) ??
    trove[0] ??
    null;

  return {
    ok: true,
    primary,
    troveCampaigns: trove,
    emptyTroveCount: trove.filter(
      (c) => c.isEmpty && c.id !== primary?.id && c.status !== "PAUSED",
    ).length,
    otherActive: other.filter((c) => c.adCount > 0 && c.status === "ACTIVE"),
    totalTrove: trove.length,
  };
}

export async function pauseEmptyTroveCampaigns(keepCampaignId, { dryRun = false } = {}) {
  const overview = await fetchCampaignOverview(keepCampaignId);
  if (!overview.ok) return { ok: false, error: overview.error, paused: [] };

  const toPause = overview.troveCampaigns.filter(
    (c) => c.isEmpty && c.id !== keepCampaignId && c.status !== "PAUSED",
  );

  const paused = [];
  for (const c of toPause) {
    if (!dryRun) {
      await graphPost(`/${c.id}`, { status: "PAUSED" });
    }
    paused.push({ id: c.id, name: c.name });
  }

  return {
    ok: true,
    paused,
    kept: keepCampaignId ?? overview.primary?.id,
    primary: overview.primary,
  };
}
