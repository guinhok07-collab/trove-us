/**
 * Create Meta traffic ads from marketing/social/ads.json (autopilot).
 * Usage: node --env-file=.env.local scripts/meta-ads-autopilot.mjs [--dry-run]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  createTrafficAd,
  isMetaAdsConfigured,
  metaConfig,
} from "./lib/meta-ads-api.mjs";
import { sendTelegramTyped } from "./lib/telegram-notify.mjs";
import { bootstrapAutopilotBrain, preflightCreateAd, verifyAdHasInstagram } from "./lib/ads-autopilot-brain.mjs";

import { spawnSync } from "child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const feedDir = resolve(root, "marketing/social/output/feed");
const adsPath = resolve(root, "marketing/social/ads.json");
const statePath = resolve(root, "marketing/social/autopilot-state.json");
const dryRun = process.argv.includes("--dry-run");
const skipBuild = process.argv.includes("--skip-build");
const skipDeploy = process.argv.includes("--skip-deploy");

function loadState() {
  if (!existsSync(statePath)) return { ads: {}, lastRun: null };
  return JSON.parse(readFileSync(statePath, "utf8"));
}

function saveState(state) {
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, JSON.stringify(state, null, 2), "utf8");
}

function run(script, args = []) {
  const r = spawnSync(process.execPath, [resolve(root, "scripts", script), ...args], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) throw new Error(`${script} failed`);
}

console.log("\n=== Trove Meta Ads Autopilot ===\n");

if (!isMetaAdsConfigured()) {
  console.error("Configure Meta API env vars first — marketing/social/AUTOPILOT-SETUP.md");
  process.exit(1);
}

const cfg = metaConfig();

const brain = await bootstrapAutopilotBrain();
if (brain.lines?.length) {
  console.log(brain.lines.join("\n"));
  console.log("");
}

if (!skipBuild) {
  console.log("1/3 Building social pack (images + config)…");
  run("build-social-pack.mjs", ["4"]);
} else {
  console.log("1/3 Skipping build (--skip-build)");
}

if (!skipDeploy && !dryRun) {
  console.log("\n2/3 Deploying feed images to trove-us.com…");
  const deploy = spawnSync("npx", ["vercel", "--prod", "--yes"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });
  if (deploy.status !== 0) {
    console.warn("Deploy failed — ads will use product image URLs as fallback");
  }
} else {
  console.log("\n2/3 Skipping deploy");
}

if (!existsSync(adsPath)) {
  console.error("Missing ads.json — run build-social-pack first");
  process.exit(1);
}

const catalog = JSON.parse(readFileSync(adsPath, "utf8"));
const state = loadState();
const pending = catalog.filter((ad) => !state.ads[ad.slug]?.adId);
const batch = pending.slice(0, cfg.maxNewAds);

console.log(`\n3/3 Creating up to ${cfg.maxNewAds} new Meta ads (${batch.length} queued)…`);

const results = [];

for (const ad of batch) {
  const imagePath = resolve(feedDir, `${ad.file}.png`);
  const imageUrl = `${cfg.siteUrl}/social/feed/${ad.file}.png`;
  const title = `${ad.product} — ${ad.price} · Free shipping`;
  const message = ad.facebook.split("\n\nShop now:")[0].trim();

  console.log(`\n→ ${ad.product}`);
  console.log(`  Link: ${ad.url}`);
  console.log(`  Image: ${existsSync(imagePath) ? imagePath : imageUrl}`);

  const preflight = preflightCreateAd({
    slug: ad.slug,
    imagePath: existsSync(imagePath) ? imagePath : undefined,
    product: ad.product,
  });
  for (const issue of preflight.issues) {
    console.log(`  ⚠ ${issue.message}`);
  }
  if (!preflight.ok) {
    results.push({ slug: ad.slug, ok: false, error: preflight.issues.map((i) => i.message).join("; ") });
    continue;
  }

  if (dryRun) {
    results.push({ slug: ad.slug, dryRun: true });
    continue;
  }

  try {
    const ids = await createTrafficAd({
      name: ad.slug,
      message,
      title,
      link: ad.url,
      imagePath: existsSync(imagePath) ? imagePath : undefined,
      imageUrl: existsSync(imagePath) ? undefined : imageUrl,
      campaignId: state.campaignId,
    });

    state.campaignId = ids.campaignId;

    state.ads[ad.slug] = {
      ...ids,
      product: ad.product,
      url: ad.url,
      file: ad.file,
      createdAt: new Date().toISOString(),
      status: cfg.adStatus,
    };
    saveState(state);

    const verified = await verifyAdHasInstagram(ids.adId, { label: ad.slug });
    if (!verified.verified) {
      console.log(`  ⚠ Criativo sem Instagram — auto-watch vai corrigir no próximo ciclo`);
    }

    results.push({ slug: ad.slug, ok: true, adId: ids.adId });
    console.log(`  ✓ Ad created: ${ids.adId}`);
  } catch (err) {
    console.error(`  ✗ Failed: ${err.message}`);
    results.push({ slug: ad.slug, ok: false, error: err.message });

    if (err.message.includes("modo de desenvolvimento") || err.message.includes("development mode")) {
      console.error("  → Coloque o app Trove Autopilot em modo LIVE no developers.facebook.com");
    }

    if (
      (err.message.includes("picture") || err.message.includes("image")) &&
      ad.image
    ) {
      try {
        const ids = await createTrafficAd({
          name: ad.slug,
          message,
          title,
          link: ad.url,
          imageUrl: ad.image,
          campaignId: state.campaignId,
        });
        state.campaignId = ids.campaignId;
        state.ads[ad.slug] = {
          ...ids,
          product: ad.product,
          url: ad.url,
          file: ad.file,
          imageFallback: true,
          createdAt: new Date().toISOString(),
          status: cfg.adStatus,
        };
        saveState(state);
        results.push({ slug: ad.slug, ok: true, adId: ids.adId, fallback: true });
        console.log(`  ✓ Ad created with product photo fallback: ${ids.adId}`);
      } catch (err2) {
        console.error(`  ✗ Fallback failed: ${err2.message}`);
      }
    }
  }

  await sleep(1500);
}

state.lastRun = new Date().toISOString();
saveState(state);

const ok = results.filter((r) => r.ok).length;
const resultLines = results.map((r) =>
  r.ok
    ? `✅ ${r.slug} → ad ${r.adId}${r.fallback ? " (foto produto)" : ""}`
    : `❌ ${r.slug}: ${r.error ?? "dry-run"}`,
);

const blocks = [
  `Criados: ${ok}/${batch.length}`,
  `Budget: R$${(cfg.dailyBudgetCents / 100).toFixed(2)}/dia por anúncio · Status: ${cfg.adStatus}`,
  resultLines.join("\n"),
];

console.log("\n" + ["🤖 Trove Ads Autopilot", "", ...blocks].join("\n"));
if (!dryRun) await sendTelegramTyped("autopilot", blocks);

console.log("\nDone.\n");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
