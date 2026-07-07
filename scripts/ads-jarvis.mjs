/**
 * JARVIS — ciclo completo Trove.
 * Usage: node --env-file=.env.local scripts/ads-jarvis.mjs [--dry-run]
 */
import { runJarvisCycle } from "./lib/ads-jarvis.mjs";
import { initDashboardSettings } from "./lib/dashboard-settings.mjs";

initDashboardSettings();

const dryRun = process.argv.includes("--dry-run");

console.log("\n=== JARVIS — Trove Autopilot ===\n");

const result = await runJarvisCycle({ dryRun, forceLlm: true });
if (!result.ok) {
  console.error(result.error);
  process.exit(1);
}

console.log(result.message);
if (result.report?.headline) {
  console.log("\n📣", result.report.headline);
}
console.log("\nDone.\n");
