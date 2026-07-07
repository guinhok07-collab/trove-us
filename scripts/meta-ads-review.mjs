/**
 * Review Meta ads — auto-pause losers, Telegram report.
 * Usage: node --env-file=.env.local scripts/meta-ads-review.mjs [--dry-run]
 */
import { reviewAndAdjust } from "./lib/ads-auto-engine.mjs";
import { sendTelegramTyped } from "./lib/telegram-notify.mjs";
import { isMetaAdsConfigured } from "./lib/meta-ads-api.mjs";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const statePath = resolve(root, "marketing/social/autopilot-state.json");
const dryRun = process.argv.includes("--dry-run");

console.log("\n=== Trove Meta Ads Review ===\n");

if (!existsSync(statePath)) {
  console.log("No autopilot-state.json — run ads:autopilot first");
  process.exit(0);
}

if (!isMetaAdsConfigured()) {
  console.error("Meta API not configured");
  process.exit(1);
}

const { paused, kept, boosted, report } = await reviewAndAdjust({ dryRun });

const summary = [
  `Pausados: ${paused.length} · Ativos: ${kept.length} · Boost: ${boosted.length}`,
  report.slice(0, 8).join("\n"),
  dryRun ? "(dry-run)" : "Ajustes automáticos aplicados.",
].filter(Boolean);

console.log(["📊 Trove Ads Review", "", ...summary].join("\n"));
if (!dryRun || paused.length) await sendTelegramTyped("meta", summary);
console.log("\nDone.\n");
