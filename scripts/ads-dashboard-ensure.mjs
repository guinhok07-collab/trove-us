/**
 * Verifica se o painel responde; reinicia se estiver offline (task agendada).
 * Usage: node --env-file=.env.local scripts/ads-dashboard-ensure.mjs
 */
import { spawn } from "child_process";
import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { sendTelegramTyped } from "./lib/telegram-notify.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.ADS_DASHBOARD_PORT ?? 3847);
const lockPath = resolve(root, "marketing/social/dashboard-watchdog.json");

async function ping() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`http://localhost:${PORT}/api/ping`, { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

function isPidAlive(pid) {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function watchdogLikelyRunning() {
  if (!existsSync(lockPath)) return false;
  try {
    const st = JSON.parse(readFileSync(lockPath, "utf8"));
    if (st.watchdogPid && isPidAlive(st.watchdogPid)) return true;
    return false;
  } catch {
    return false;
  }
}

function startWatchdog() {
  const child = spawn(
    process.execPath,
    ["--env-file=.env.local", resolve(root, "scripts/ads-dashboard-watchdog.mjs")],
    { cwd: root, detached: true, stdio: "ignore", env: process.env },
  );
  child.unref();
}

function startServer() {
  const child = spawn(
    process.execPath,
    ["--env-file=.env.local", resolve(root, "scripts/ads-dashboard-server.mjs")],
    { cwd: root, detached: true, stdio: "ignore", env: process.env },
  );
  child.unref();
}

if (await ping()) {
  process.exit(0);
}

console.log("Painel offline — tentando recuperar…");

if (!watchdogLikelyRunning()) {
  startWatchdog();
} else {
  startServer();
}

await new Promise((r) => setTimeout(r, 6000));

if (await ping()) {
  await sendTelegramTyped("panel", [`✅ Painel Trove estava offline e foi reiniciado.`, `http://localhost:${PORT}`]);
  process.exit(0);
}

await sendTelegramTyped("panel", [
  "🔴 Painel Trove OFFLINE — não consegui reiniciar.",
  "Abra o ícone Trove na área de trabalho ou rode: npm run ads:dashboard",
]);
process.exit(1);
