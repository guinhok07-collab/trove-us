/**
 * Social Autopilot scheduler — posts once per day after META_SOCIAL_ORGANIC_HOUR.
 * Runs inside the dashboard server (backup when Windows task missed).
 */
import {
  isSocialOrganicEnabled,
  loadOrganicState,
  runSocialOrganicPost,
} from "./social-organic-poster.mjs";
import { appendLog } from "./ads-log.mjs";

let running = false;

export function getScheduledHour() {
  const h = Number(process.env.META_SOCIAL_ORGANIC_HOUR ?? 15);
  return Number.isFinite(h) && h >= 0 && h <= 23 ? h : 15;
}

/** @returns {{ run: boolean, reason?: string, hour?: number }} */
export function shouldRunSocialOrganicNow(now = new Date()) {
  if (!isSocialOrganicEnabled()) {
    return { run: false, reason: "disabled" };
  }

  const state = loadOrganicState();
  const today = now.toDateString();
  if (state.lastPostedAt && new Date(state.lastPostedAt).toDateString() === today) {
    return { run: false, reason: "already_posted" };
  }

  const hour = getScheduledHour();
  if (now.getHours() < hour) {
    return { run: false, reason: "before_hour", hour };
  }

  return { run: true, hour };
}

export async function tickSocialOrganicScheduler({ source = "scheduler" } = {}) {
  if (running) return { skipped: true, reason: "busy" };

  const check = shouldRunSocialOrganicNow();
  if (!check.run) return { skipped: true, reason: check.reason, hour: check.hour };

  running = true;
  try {
    appendLog({ action: "social_organic_scheduler_start", source });
    return await runSocialOrganicPost({ dryRun: false, force: false });
  } finally {
    running = false;
  }
}

/**
 * Start background checks (default every 10 min).
 * @returns {() => void} stop function
 */
export function startSocialOrganicScheduler({ intervalMs = 10 * 60 * 1000, log = () => {} } = {}) {
  if (!isSocialOrganicEnabled()) {
    log("Social Autopilot OFF (META_SOCIAL_ORGANIC=0)");
    return () => {};
  }

  const hour = getScheduledHour();
  log(`Social Autopilot ON — 1 Reel/dia após ${hour}:00 (checagem a cada ${Math.round(intervalMs / 60000)} min)`);

  const tick = () => {
    void tickSocialOrganicScheduler({ source: "dashboard-server" }).then((r) => {
      if (r.skipped) return;
      if (r.ok && !r.dryRun) {
        log(`Social Autopilot publicou: ${r.ad?.product ?? r.ad?.slug}`);
      } else if (!r.ok) {
        log(`Social Autopilot erro: ${r.error ?? "unknown"}`);
      }
    });
  };

  setTimeout(tick, 20_000);
  const id = setInterval(tick, intervalMs);
  return () => clearInterval(id);
}
