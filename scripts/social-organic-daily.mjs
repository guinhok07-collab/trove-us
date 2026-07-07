#!/usr/bin/env node
/**
 * Social Autopilot — post today's product (skip if already posted).
 * Usage: node --env-file=.env.local scripts/social-organic-daily.mjs [--force] [--dry-run] [--slug=pet-hair-remover-roller]
 */
import { runSocialOrganicPost } from "./lib/social-organic-poster.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const slugArg = args.find((a) => a.startsWith("--slug="));
const slug = slugArg ? slugArg.split("=")[1] : null;

const result = await runSocialOrganicPost({ dryRun, force, slug });

if (result.skipped) {
  console.log("⏭", result.reason ?? result.error ?? "Skipped");
  process.exit(0);
}

if (!result.ok) {
  console.error("❌", result.error ?? "Social post failed");
  if (result.results) console.error(JSON.stringify(result.results, null, 2));
  process.exit(1);
}

if (dryRun) {
  console.log("✓ Dry run OK");
  console.log("Product:", result.ad?.product);
  console.log("Instagram caption preview:\n", result.copy?.instagram?.slice(0, 400), "...");
  process.exit(0);
}

console.log("✅ Social Autopilot posted:", result.ad?.product);
console.log("   Instagram:", result.results?.instagram?.ok ? "OK" : result.results?.instagram?.error);
console.log("   Facebook:", result.results?.facebook?.ok ? "OK" : result.results?.facebook?.error);
