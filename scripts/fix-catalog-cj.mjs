/**
 * Auto-fix catalog: sync variants + audit CJ (+ media).
 * Usage: node --env-file=.env.local scripts/fix-catalog-cj.mjs
 *
 * For wrong CJ products: node --env-file=.env.local scripts/relink-strict-mismatches.mjs
 */
import { execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

console.log("→ sync-all-variants.mjs");
execSync("node --env-file=.env.local scripts/sync-all-variants.mjs", {
  cwd: root,
  stdio: "inherit",
});

console.log("→ relabel-variants.mjs");
execSync("node scripts/relabel-variants.mjs", { cwd: root, stdio: "inherit" });

console.log("→ audit-catalog-cj.mjs");
execSync("node --env-file=.env.local scripts/audit-catalog-cj.mjs", {
  cwd: root,
  stdio: "inherit",
});

console.log("→ audit-catalog-media.mjs");
execSync("node --env-file=.env.local scripts/audit-catalog-media.mjs", {
  cwd: root,
  stdio: "inherit",
});

console.log("\nDone. Se houver 'CJ errado' no admin, rode relink-strict-mismatches.mjs");
