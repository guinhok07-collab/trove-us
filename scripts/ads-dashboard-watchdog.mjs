/**
 * Mantém o painel Trove no ar — reinicia se cair e avisa no Telegram.
 * Usage: node --env-file=.env.local scripts/ads-dashboard-watchdog.mjs
 */
import { spawn, exec } from "child_process";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { sendTelegramTyped } from "./lib/telegram-notify.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.ADS_DASHBOARD_PORT ?? 3847);
const statePath = resolve(root, "marketing/social/dashboard-watchdog.json");
const ALERT_COOLDOWN_MS = Number(process.env.DASHBOARD_ALERT_COOLDOWN_MS ?? 30 * 60 * 1000);
const HEALTH_INTERVAL_MS = Number(process.env.DASHBOARD_HEALTH_MS ?? 5 * 60 * 1000);

let child = null;
let stopping = false;
let lastAlertAt = 0;
let hadCrash = false;

function isPidAlive(pid) {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function killProcessTree(pid) {
  if (!pid) return;
  if (process.platform === "win32") {
    exec(`taskkill /PID ${pid} /T /F`, () => {});
  } else {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      /* ignore */
    }
  }
}

function loadState() {
  if (!existsSync(statePath)) return {};
  try {
    return JSON.parse(readFileSync(statePath, "utf8"));
  } catch {
    return {};
  }
}

function saveState(patch) {
  mkdirSync(dirname(statePath), { recursive: true });
  const prev = loadState();
  writeFileSync(statePath, JSON.stringify({ ...prev, ...patch, pid: process.pid }, null, 2), "utf8");
}

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

async function maybeAlert(blocks) {
  const now = Date.now();
  if (now - lastAlertAt < ALERT_COOLDOWN_MS) return;
  lastAlertAt = now;
  await sendTelegramTyped("panel", Array.isArray(blocks) ? blocks : [blocks]);
}

function startChild() {
  if (stopping || child) return;

  void ping().then((up) => {
    if (stopping || child) return;
    if (up) {
      console.log("[watchdog] painel já online — não subir outro processo");
      saveState({ lastUp: true });
      return;
    }

    child = spawn(
      process.execPath,
      ["--env-file=.env.local", resolve(root, "scripts/ads-dashboard-server.mjs")],
      { cwd: root, stdio: ["ignore", "pipe", "pipe"], env: process.env },
    );

    child.stdout?.on("data", (buf) => process.stdout.write(buf));
    child.stderr?.on("data", (buf) => process.stderr.write(buf));

    child.on("exit", async (code, signal) => {
      const exitInfo = { code, signal: signal ?? null, at: new Date().toISOString() };
      child = null;
      if (stopping) return;

      const stillUp = await ping();
      if (stillUp) {
        console.log("[watchdog] painel já responde na porta — não reiniciar");
        saveState({ lastUp: true, recoveredAt: new Date().toISOString() });
        return;
      }

      hadCrash = true;
      const prev = loadState();
      const restarts = (prev.restarts ?? 0) + 1;
      saveState({ lastCrash: exitInfo, restarts, lastUp: false });

      console.error(`[watchdog] painel caiu (code=${code}, signal=${signal}) — reiniciando em 3s…`);
      void maybeAlert([
        `⚠️ Painel caiu (code ${code ?? "?"}).`,
        "Reiniciando automaticamente…",
        `http://localhost:${PORT}`,
      ]);

      setTimeout(() => {
        if (!stopping) startChild();
      }, 3000);
    });

    saveState({ startedAt: new Date().toISOString(), lastUp: true });
    console.log(`[watchdog] painel iniciado (pid ${child.pid}) → http://localhost:${PORT}`);
  });
}

async function healthLoop() {
  if (stopping) return;

  const up = await ping();
  if (!up && !child) {
    console.warn("[watchdog] painel offline — subindo processo…");
    startChild();
    await new Promise((r) => setTimeout(r, 4000));
  } else if (!up && child) {
    console.warn("[watchdog] sem resposta HTTP — reiniciando processo…");
    const deadPid = child.pid;
    child = null;
    killProcessTree(deadPid);
    setTimeout(() => {
      if (!stopping) startChild();
    }, 2000);
  } else if (up && hadCrash) {
    hadCrash = false;
    saveState({ lastUp: true, recoveredAt: new Date().toISOString() });
    void maybeAlert([`✅ Painel Trove voltou ao ar.`, `http://localhost:${PORT}`]);
  }

  setTimeout(healthLoop, HEALTH_INTERVAL_MS);
}

function shutdown() {
  stopping = true;
  if (child) {
    killProcessTree(child.pid);
    child = null;
  }
  saveState({ stoppedAt: new Date().toISOString(), watchdogPid: null });
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const prev = loadState();
if (prev.watchdogPid && prev.watchdogPid !== process.pid && isPidAlive(prev.watchdogPid)) {
  console.log(`[watchdog] já ativo (pid ${prev.watchdogPid}) — saindo`);
  process.exit(0);
}

console.log(`\n🛡️ Trove Dashboard Watchdog (porta ${PORT})\n`);
saveState({ watchdogStartedAt: new Date().toISOString(), watchdogPid: process.pid });
startChild();
healthLoop();
