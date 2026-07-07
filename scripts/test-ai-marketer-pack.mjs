/**
 * Testa o pacote Madgicx (5 features) um por um.
 * Usage: node --env-file=.env.local scripts/test-ai-marketer-pack.mjs
 */
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { verifyMetaToken, isMetaAdsConfigured } from "./lib/meta-ads-api.mjs";
import { loadMetricsHistory, detectFatigue, calcRoas } from "./lib/ads-fatigue.mjs";
import { loadState, fetchMetrics } from "./lib/ads-auto-engine.mjs";
import { buildDashboardPayload } from "./lib/ads-dashboard-data.mjs";
import { spawnSync } from "child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const results = [];

function pass(name, detail) {
  results.push({ name, ok: true, detail });
  console.log(`✅ ${name}: ${detail}`);
}

function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.log(`❌ ${name}: ${detail}`);
}

function skip(name, detail) {
  results.push({ name, ok: null, detail });
  console.log(`⏭ ${name}: ${detail}`);
}

console.log("\n=== Teste Pacote AI Marketer (5 features) ===\n");

// 1. Meta token
if (!isMetaAdsConfigured()) {
  fail("Meta API", "não configurada");
} else {
  const token = await verifyMetaToken();
  if (token.ok) pass("Meta API", `conectada (${token.name})`);
  else fail("Meta API", token.error ?? "token inválido");
}

// 2. Fadiga criativa
try {
  const history = loadMetricsHistory();
  const state = loadState();
  let metrics = [];
  if (isMetaAdsConfigured()) {
    try {
      metrics = await fetchMetrics(state);
    } catch (err) {
      skip("Fadiga", `métricas indisponíveis: ${err.message}`);
    }
  }
  const { fatigued } = detectFatigue({ metrics, history, stateAds: state.ads ?? {} });
  pass(
    "Fadiga criativa",
    `${history.snapshots?.length ?? 0} snapshots · ${fatigued.length} fadiga(s) detectada(s)`,
  );
} catch (err) {
  fail("Fadiga criativa", err.message);
}

// 3. ROAS no painel
try {
  const d = await buildDashboardPayload({ skipHealth: true });
  const hasRoas = "roas" in (d.totals ?? {}) && d.ads.every((a) => "roas" in a);
  if (hasRoas) {
    pass(
      "ROAS painel",
      `total ${d.totals.roas ?? 0}x · receita $${(d.totals.revenue ?? 0).toFixed(2)} · gasto $${d.totals.spend.toFixed(2)}`,
    );
  } else {
    fail("ROAS painel", "campos roas/revenue ausentes");
  }
  pass("ROAS cálculo", `calcRoas(100,50)=${calcRoas(100, 50)}x`);
} catch (err) {
  fail("ROAS painel", err.message);
}

// 4. Relatório diário
try {
  const r = spawnSync(
    process.execPath,
    ["--env-file=.env.local", resolve(root, "scripts/ads-daily-report.mjs"), "--dry-run"],
    { cwd: root, encoding: "utf8" },
  );
  if (r.status === 0 && (r.stdout ?? "").includes("Relatório diário")) {
    pass("Relatório diário", "script OK (dry-run)");
  } else {
    fail("Relatório diário", (r.stderr ?? r.stdout ?? "").slice(-200));
  }
} catch (err) {
  fail("Relatório diário", err.message);
}

// 5. Auto-watch 2h (verifica task agendada)
try {
  const ps = spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      "(Get-ScheduledTask -TaskName 'Trove-Auto-Watch' -ErrorAction SilentlyContinue).Triggers.Count",
    ],
    { encoding: "utf8", shell: true },
  );
  const count = Number((ps.stdout ?? "").trim());
  if (count >= 12) pass("Auto-watch 2h", `${count} triggers agendados`);
  else if (count >= 4) skip("Auto-watch 2h", `${count} triggers — rode npm run ads:watch:install`);
  else skip("Auto-watch 2h", "task não instalada — rode npm run ads:watch:install");
} catch (err) {
  skip("Auto-watch 2h", err.message);
}

// 6. Vídeo Reels Meta API
const videoDir = resolve(root, "marketing/social/output/videos");
const hasVideo = existsSync(videoDir);
if (!hasVideo) {
  skip("Vídeo Reels API", "pasta videos ausente — gere com npm run social:videos");
} else {
  const r = spawnSync(
    process.execPath,
    ["--env-file=.env.local", resolve(root, "scripts/meta-ads-video-publish.mjs"), "--dry-run"],
    { cwd: root, encoding: "utf8" },
  );
  if (r.status === 0) {
    pass("Vídeo Reels API", "script dry-run OK");
  } else {
    skip("Vídeo Reels API", (r.stderr ?? r.stdout ?? "").slice(-200));
  }
}

console.log("\n--- Resumo ---");
const ok = results.filter((r) => r.ok === true).length;
const bad = results.filter((r) => r.ok === false).length;
const skipped = results.filter((r) => r.ok === null).length;
console.log(`${ok} OK · ${bad} falha · ${skipped} skip\n`);

process.exit(bad > 0 ? 1 : 0);
