/**
 * Puxa config do site (Vercel produção) para .env.local
 * Usage: node scripts/sync-env-from-vercel.mjs [--dry-run]
 */
import { syncFromVercel } from "./lib/sync-vercel-env.mjs";

const dryRun = process.argv.includes("--dry-run");

try {
  const r = syncFromVercel({ dryRun });
  console.log(dryRun ? "\n=== Simulação (dry-run) ===\n" : "\n=== Sync Vercel → .env.local ===\n");

  if (r.updated.length) {
    console.log("Atualizados:");
    for (const u of r.updated) console.log(`  ✓ ${u.key} (${u.preview})`);
  } else {
    console.log("Nada novo para copiar.");
  }

  if (r.stillEmpty.includes("TELEGRAM_BOT_TOKEN") || r.stillEmpty.includes("TELEGRAM_CHAT_ID")) {
    console.log("\n⚠ Telegram no SITE ainda VAZIO no Vercel.");
    console.log("  As variáveis existem mas sem valor — vendas NÃO avisam no Telegram.");
    console.log("  Configure: npm run telegram:setup SEU_TOKEN SEU_CHAT_ID\n");
  } else if (r.remoteHasTelegram) {
    console.log("\n✓ Telegram encontrado no site e copiado para o PC.\n");
  }

  if (r.skipped.length) {
    console.log(`Já iguais: ${r.skipped.length} chave(s)`);
  }
} catch (err) {
  console.error("Erro:", err.message);
  process.exit(1);
}
