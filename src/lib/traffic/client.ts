import type { TrafficEventInput } from "./types";

export function recordTrafficEvent(payload: TrafficEventInput): void {
  if (typeof window === "undefined") return;

  try {
    void fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    /* ignore */
  }
}

export function readTrafficAttribution(): Pick<
  TrafficEventInput,
  "utmSource" | "utmMedium" | "utmCampaign" | "referrer"
> {
  if (typeof window === "undefined") return {};

  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get("utm_source") ?? undefined,
    utmMedium: params.get("utm_medium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? undefined,
    referrer: document.referrer || undefined,
  };
}
