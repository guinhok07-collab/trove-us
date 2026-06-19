import type { CjAccessTokenData, CjApiResponse } from "./types";
import { CJ_API_BASE } from "./types";

let cachedToken: { value: string; expiresAt: number } | null = null;

function parseExpiry(iso: string): number {
  const ts = Date.parse(iso);
  return Number.isNaN(ts) ? Date.now() + 12 * 60 * 60 * 1000 : ts;
}

export async function getCjAccessToken(apiKey: string): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }

  const res = await fetch(`${CJ_API_BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
    cache: "no-store",
  });

  const json = (await res.json()) as CjApiResponse<CjAccessTokenData>;
  if (!json.result || !json.data?.accessToken) {
    throw new Error(json.message || "Failed to authenticate with CJ API");
  }

  cachedToken = {
    value: json.data.accessToken,
    expiresAt: parseExpiry(json.data.accessTokenExpiryDate),
  };

  return cachedToken.value;
}

export function clearCjTokenCache() {
  cachedToken = null;
}
