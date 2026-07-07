/**
 * Otimização automática: limpa campanhas vazias, gera criativos, roda auto-watch.
 * Usage: node --env-file=.env.local scripts/ads-auto-optimize.mjs [--dry-run]
 */
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import { loadState, saveState, runAutoWatch } from "./lib/ads-auto-engine.mjs";
import { pauseEmptyTroveCampaigns } from "./lib/meta-campaigns.mjs";
import { isMetaAdsConfigured } from "./lib/meta-ads-api.mjs";
import { sendTelegramTyped } from "./lib/telegram-notify.mjs";
import { initDashboardSettings } from "./lib/dashboard-settings.mjs";

initDashboardSettings();

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const feedDir = resolve(root, "marketing/social/output/feed");
const videoDir = resolve(root, "marketing/social/output/videos");
const dryRun = process.argv.includes("--dry-run");

const lines = ["🔧 Trove Auto-Optimize", ""];

if (!isMetaAdsConfigured()) {
  console.error("Meta API não configurada");
  process.exit(1);
}

const state = loadState();
const keepId = state.campaignId;

// 1. Pausar campanhas Trove Autopilot vazias (lixo de testes)
console.log("1/4 Limpando campanhas vazias no Meta…");
const cleanup = await pauseEmptyTroveCampaigns(keepId, { dryRun });
if (cleanup.ok && cleanup.paused.length) {
  lines.push(`🧹 ${cleanup.paused.length} campanha(s) vazia(s) pausada(s)`);
  console.log(`  Pausadas: ${cleanup.paused.length}`);
} else if (cleanup.ok) {
  lines.push("🧹 Nenhuma campanha vazia para limpar");
  console.log("  Nada para limpar");
} else {
  lines.push(`⚠️ Limpeza: ${cleanup.error}`);
}

// 2. Gerar imagens/vídeos para anúncios ativos
console.log("\n2/4 Verificando criativos (imagem + vídeo)…");
const activeSlugs = Object.entries(state.ads ?? {})
  .filter(([, m]) => m.status === "ACTIVE")
  .map(([slug, m]) => ({ slug, file: m.file ?? slug }));

let needCreatives = false;
for (const { slug, file } of activeSlugs) {
  const png = resolve(feedDir, `${file}.png`);
  const webm = resolve(videoDir, `${file}.webm`);
  if (!existsSync(png) || !existsSync(webm)) {
    needCreatives = true;
    console.log(`  Falta criativo: ${slug} (png=${existsSync(png)} webm=${existsSync(webm)})`);
  }
}

if (needCreatives && !dryRun) {
  console.log("  Gerando social pack (imagens + vídeos)…");
  const limit = String(Math.max(activeSlugs.length, 3));
  const r = spawnSync(
    process.execPath,
    [resolve(root, "scripts/build-social-pack.mjs"), limit],
    { cwd: root, stdio: "inherit", env: process.env },
  );
  if (r.status === 0) {
    lines.push(`🎬 Criativos gerados (imagens + vídeos Reels)`);
  } else {
    lines.push("⚠️ Falha ao gerar criativos — rode npm run social:pack");
  }
} else if (needCreatives) {
  lines.push("🎬 Criativos faltando (dry-run)");
} else {
  lines.push("✅ Criativos OK (imagem + vídeo)");
  console.log("  Todos os criativos existem");
}

// Marcar tipo criativo no state
for (const [slug, meta] of Object.entries(state.ads ?? {})) {
  const file = meta.file ?? slug;
  meta.creativeType = existsSync(resolve(videoDir, `${file}.webm`)) ? "image+video" : "image";
  meta.hasVideo = existsSync(resolve(videoDir, `${file}.webm`));
  meta.hasImage = existsSync(resolve(feedDir, `${file}.png`));
}
saveState(state);

// 2b. Publicar vídeos Reels no Meta (se .webm existir)
console.log("\n2b/4 Publicando vídeos Reels no Meta…");
if (!dryRun) {
  const vr = spawnSync(
    process.execPath,
    ["--env-file=.env.local", resolve(root, "scripts/meta-ads-video-publish.mjs")],
    { cwd: root, stdio: "pipe", encoding: "utf8" },
  );
  const published = (vr.stdout ?? "").match(/✓ Video ad/g)?.length ?? 0;
  if (published) {
    lines.push(`📹 ${published} vídeo(s) Reels publicado(s) no Meta`);
    console.log(`  ${published} vídeo(s) publicado(s)`);
  } else if (vr.status !== 0) {
    const err = (vr.stderr ?? vr.stdout ?? "").slice(-150);
    if (!err.includes("sem vídeo")) lines.push(`⚠️ Vídeo Meta: ${err}`);
    console.log("  Nenhum vídeo novo para publicar");
  } else {
    console.log("  Nenhum vídeo novo para publicar");
  }
} else {
  lines.push("📹 Vídeo Reels (dry-run)");
}

// 3. Auto-watch (analisar, pausar, impulsionar, criar novos)
console.log("\n3/4 Rodando auto-watch…");
if (!dryRun) {
  const watch = await runAutoWatch({ dryRun: false, skipTelegram: true });
  if (watch.ok) {
    const w = watch.review ?? {};
    lines.push(
      "",
      `📊 Auto-watch: ${w.kept?.length ?? 0} ok · ${w.paused?.length ?? 0} pausados · ${w.boosted?.length ?? 0} impulsionados`,
    );
  } else {
    lines.push(`⚠️ Auto-watch: ${watch.error}`);
  }
}

const summaryBlocks = [
  lines.slice(1).filter(Boolean).join("\n"),
  "⏱ Próximo auto-watch em ~2 horas",
];
console.log("\n" + lines.join("\n") + "\n");
if (!dryRun) await sendTelegramTyped("optimize", summaryBlocks);
