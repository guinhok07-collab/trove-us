/**

 * Modo automático — JARVIS quando META_JARVIS_MODE=1, senão auto-watch clássico.

 */

import { runJarvisCycle, isJarvisMode } from "./lib/ads-jarvis.mjs";

import { runAutoWatch } from "./lib/ads-auto-engine.mjs";

import { initDashboardSettings } from "./lib/dashboard-settings.mjs";



initDashboardSettings();



const dryRun = process.argv.includes("--dry-run");



console.log(`\n=== Trove ${isJarvisMode() ? "JARVIS" : "Auto-Watch"} ===\n`);



const result = isJarvisMode()

  ? await runJarvisCycle({ dryRun })

  : await runAutoWatch({ dryRun });



if (!result.ok) {

  console.error(result.error);

  process.exit(1);

}



console.log(result.message);

console.log("\nDone.\n");

