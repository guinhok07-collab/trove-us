/**
 * Relatório diário — resumo ROAS, vendas, anúncios → Telegram.
 * Usage: node --env-file=.env.local scripts/ads-daily-report.mjs [--dry-run]
 */
import { buildDashboardPayload } from "./lib/ads-dashboard-data.mjs";
import { sendTelegramTyped } from "./lib/telegram-notify.mjs";

const dryRun = process.argv.includes("--dry-run");

const d = await buildDashboardPayload({ skipHealth: true });
const t = d.totals;
const date = new Date().toLocaleDateString("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
});

function fmtRoas(v) {
  if (v == null || v === 0) return "—";
  return `${v.toFixed(2)}x`;
}

const blocks = [
  date,
  [
    `🟢 Ativos: ${t.active} · Pausados: ${t.paused ?? 0}`,
    `💰 Gasto 7d: R$ ${t.spend.toFixed(2)} · Cliques: ${t.clicks}`,
    `🛒 Vendas: ${t.salesTotal} (${t.siteOrders ?? 0} site · ${t.metaPurchases ?? 0} pixel)`,
    `📈 ROAS: ${fmtRoas(t.roas)} · Receita: R$ ${(t.revenue ?? 0).toFixed(2)}`,
  ].join("\n"),
];

if (d.ads.length) {
  blocks.push(
    [
      "Por anúncio:",
      ...d.ads.map(
        (a) =>
          `• ${a.product}: ${a.salesTotal || 0} vendas · R$ ${a.spendBrl.toFixed(2)} · ROAS ${fmtRoas(a.roas)}`,
      ),
    ].join("\n"),
  );
} else {
  blocks.push("Nenhum anúncio no painel.");
}

if (d.weeklyBudget) {
  const w = d.weeklyBudget;
  blocks.push(`💰 Semana: R$ ${w.spentBrl?.toFixed(2) ?? "0.00"} / R$ ${w.capBrl ?? 120} (${w.pct ?? 0}%)`);
}

if (d.aiMarketer?.actions?.[0]) {
  blocks.push(`💡 Próximo passo: ${d.aiMarketer.actions[0].title}`);
}

const msg = blocks.join("\n\n");
console.log(msg);

if (!dryRun) {
  const sent = await sendTelegramTyped("daily", blocks);
  if (!sent) {
    console.warn("\nTelegram não configurado — relatório só no console.");
  }
}
