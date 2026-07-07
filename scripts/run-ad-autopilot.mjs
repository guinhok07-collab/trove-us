/**
 * Autopilot + auto-watch in one run.
 */
import { spawnSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function run(script) {
  const r = spawnSync(
    process.execPath,
    ["--env-file=.env.local", resolve(root, "scripts", script)],
    { cwd: root, stdio: "inherit", env: process.env },
  );
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log("\n=== Trove Full Ad Autopilot ===\n");
run("ads-auto-watch.mjs");
console.log("\nAll done.\n");
