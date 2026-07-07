/**
 * Verifica tudo: site, Telegram, Meta, agendamento.
 * Usage: node --env-file=.env.local scripts/trove-health-check.mjs [--sync]
 */
import { runHealthCheck } from "./lib/trove-health.mjs";

const syncFirst = process.argv.includes("--sync");

const r = await runHealthCheck({ syncFirst });

console.log("\n=== Trove — verificação completa ===\n");

for (const c of r.checks) {
  const icon = c.ok ? "✅" : c.severity === "warn" ? "⚠️" : "❌";
  console.log(`${icon} ${c.label}`);
  console.log(`   ${c.detail}\n`);
}

if (r.errors.length) {
  console.log("ERROS (corrigir):");
  r.errors.forEach((e) => console.log(`  • ${e}`));
  console.log("");
}

if (r.warnings.length) {
  console.log("AVISOS:");
  r.warnings.forEach((w) => console.log(`  • ${w}`));
  console.log("");
}

if (r.sync?.updated?.length) {
  console.log(`Sync: ${r.sync.updated.length} chave(s) copiada(s) do site.\n`);
}

process.exit(r.ok ? 0 : 1);
