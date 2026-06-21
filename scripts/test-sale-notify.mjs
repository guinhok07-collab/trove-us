/**
 * Test sale notification. Run after setting env vars in Vercel or locally:
 *   npx vercel env run --environment=production -- node scripts/test-sale-notify.mjs
 */
const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

if (!token || !chatId) {
  console.error("Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID first.");
  process.exit(1);
}

const text = [
  "🛒 Teste — Trove",
  "",
  "Pedido: TRV-TEST-NOTIFY",
  "Cliente: Igor Gomes",
  "Total: $12.98",
  `Horário: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
  "",
  "Se você recebeu isso, os avisos de venda estão funcionando ✅",
].join("\n");

const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ chat_id: chatId, text }),
});

const json = await res.json();
if (!json.ok) {
  console.error("Failed:", json);
  process.exit(1);
}

console.log("Telegram test message sent ✅");
