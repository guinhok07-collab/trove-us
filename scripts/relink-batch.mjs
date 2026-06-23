/**
 * Relink a batch of slugs by CJ PID with rate-limit spacing.
 * Usage: node --env-file=.env.local scripts/relink-batch.mjs slug:pid:ship ...
 */
import { execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const pairs = process.argv.slice(2);

for (const pair of pairs) {
  const [slug, pid, ship = "3.5"] = pair.split(":");
  console.log(`\n→ ${slug} ${pid}`);
  execSync(`node --env-file=.env.local scripts/relink-product-cj.mjs ${slug} ${pid} ${ship}`, {
    cwd: root,
    stdio: "inherit",
  });
  execSync("node -e \"setTimeout(()=>{},2500)\"", { cwd: root, stdio: "inherit" });
}

console.log("\nBatch relink done.");
