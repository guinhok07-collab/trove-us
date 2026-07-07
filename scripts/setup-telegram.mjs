/**
 * Configura Telegram no .env.local + Vercel Production.
 * Usage:
 *   node scripts/setup-telegram.mjs <BOT_TOKEN> <CHAT_ID>
 * Ou sem args — mostra instrucoes.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");

const token = process.argv[2]?.trim();
const chatId = process.argv[3]?.trim();

if (!token || !chatId) {
  console.log(`
=== Telegram Trove — configuracao ===

Verifiquei o Vercel (producao): TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID estao VAZIOS.
O site ainda NAO envia alertas no Telegram.

PASSO 1 — Criar bot (2 min)
  1. Abra Telegram → busque @BotFather
  2. Envie: /newbot
  3. Nome: Trove Alerts
  4. Username: trove_alerts_bot (ou similar)
  5. Copie o TOKEN (ex: 7123456789:AAH...)

PASSO 2 — Seu Chat ID
  1. Envie qualquer mensagem para o seu bot
  2. Abra no navegador (troque TOKEN):
     https://api.telegram.org/bot<TOKEN>/getUpdates
  3. Copie "chat":{"id": NUMERO }

PASSO 3 — Rodar este script:
  node scripts/setup-telegram.mjs SEU_TOKEN SEU_CHAT_ID

Isso salva no .env.local e no Vercel (producao + site).
`);
  process.exit(0);
}

// Test send
const testRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    chat_id: chatId,
    text: "✅ Trove conectado!\n\nAlertas de:\n🛒 vendas\n🤖 autopilot ads\n↩️ devolucoes",
  }),
});
const testData = await testRes.json();
if (!testData.ok) {
  console.error("Erro Telegram:", testData.description);
  process.exit(1);
}
console.log("Teste OK — mensagem enviada no Telegram");

// Update .env.local
let env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
function setVar(name, value) {
  const line = `${name}="${value}"`;
  const re = new RegExp(`^${name}=.*$`, "m");
  env = re.test(env) ? env.replace(re, line) : env.trimEnd() + `\n${line}\n`;
}
setVar("TELEGRAM_BOT_TOKEN", token);
setVar("TELEGRAM_CHAT_ID", chatId);
writeFileSync(envPath, env, "utf8");
console.log("Salvo em .env.local");

// Sync Vercel production
for (const [name, val] of [
  ["TELEGRAM_BOT_TOKEN", token],
  ["TELEGRAM_CHAT_ID", chatId],
]) {
  spawnSync("npx", ["vercel", "env", "rm", name, "production", "--yes"], {
    cwd: root,
    shell: true,
    stdio: "ignore",
  });
  const add = spawnSync(
    "npx",
    ["vercel", "env", "add", name, "production"],
    {
      cwd: root,
      shell: true,
      input: val,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  if (add.status !== 0) {
    console.warn(`Vercel ${name}: adicione manualmente no dashboard Vercel → Settings → Environment Variables`);
  } else {
    console.log(`Vercel ${name} OK`);
  }
}

console.log("\nPronto! Autopilot e site usarao Telegram agora.");
console.log("Teste autopilot: npm run ads:watch\n");
