/**
 * JARVIS em segundo plano — vigia agenda e avisa no Telegram enquanto o dono está em outro lugar.
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { formatTelegram, sendTelegram } from "./telegram-notify.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const STATE_PATH = resolve(root, "marketing/social/jarvis-watchdog-state.json");

function loadState() {
  if (!existsSync(STATE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(STATE_PATH, "utf8"));
  } catch {
    return {};
  }
}

function saveState(patch) {
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  const prev = loadState();
  writeFileSync(STATE_PATH, JSON.stringify({ ...prev, ...patch }, null, 2), "utf8");
}

export async function tickJarvisWatchdog({ log = () => {}, runAutonomy = false } = {}) {
  try {
    const { fireDuePersonalItems } = await import("./jarvis-personal.mjs");
    const personalFired = await fireDuePersonalItems();
    if (personalFired.length) {
      log(`JARVIS pessoal: ${personalFired.length} lembrete(s)/alarme(s) disparado(s)`);
    }

    let autonomy = null;
    if (runAutonomy) {
      const { runAutonomousCycle } = await import("./jarvis-autonomy.mjs");
      autonomy = await runAutonomousCycle({ log, notify: true });
    }

    const { buildDashboardPayload } = await import("./ads-dashboard-data.mjs");
    const payload = await buildDashboardPayload({ skipHealth: true, syncFirst: false });
    const agenda = payload.agenda;
    const due = (agenda?.items ?? []).filter(
      (i) => i.status === "overdue" || i.status === "due" || i.status === "ringing",
    );
    if (!due.length) {
      log("JARVIS watchdog: agenda limpa");
      return { ok: true, due: 0, personalFired: personalFired.length, autonomy };
    }

    const key = due.map((d) => d.id).sort().join("|");
    const prev = loadState();
    const now = Date.now();
    const cooldownMs = 6 * 60 * 60 * 1000;
    if (prev.lastKey === key && prev.lastAt && now - prev.lastAt < cooldownMs) {
      return {
        ok: true,
        due: due.length,
        skipped: "cooldown",
        personalFired: personalFired.length,
        autonomy,
      };
    }

    // Só Telegram de “precisa de você” se autonomia não resolveu sozinha
    const needsHuman = due.filter(
      (i) =>
        i.id === "meta-token" ||
        i.id === "meta-billing" ||
        i.id === "openai-billing" ||
        i.id === "checkout-payment-issues" ||
        i.kind === "payment",
    );
    if (needsHuman.length) {
      const lines = needsHuman.slice(0, 6).map((i) => `• ${i.title} — ${i.when}`);
      const name = process.env.META_OWNER_NAME?.trim() || "Igor";
      await sendTelegram(
        formatTelegram("jarvis", [
          `${name}, isso eu não resolvo sozinha — precisa de você:`,
          lines.join("\n"),
          "O resto (lembretes, pausar ruins, Reel na hora) eu faço no automático.",
        ]),
      );
      saveState({ lastKey: key, lastAt: now, lastCount: needsHuman.length });
      log(`JARVIS watchdog: pediu você em ${needsHuman.length} item(ns)`);
    }

    return {
      ok: true,
      due: due.length,
      notified: needsHuman.length > 0,
      personalFired: personalFired.length,
      autonomy,
    };
  } catch (err) {
    log(`JARVIS watchdog erro: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

export function startJarvisWatchdog({
  intervalMs = 60 * 1000,
  autonomyEveryMs = 15 * 60 * 1000,
  log = () => {},
} = {}) {
  log("JARVIS nível 2 ON — lembretes 1 min · autonomia ads/Reel 15 min");
  let lastAutonomy = 0;

  const tick = () => {
    const now = Date.now();
    const runAutonomy = now - lastAutonomy >= autonomyEveryMs;
    if (runAutonomy) lastAutonomy = now;
    void tickJarvisWatchdog({ log, runAutonomy });
  };

  setTimeout(tick, 15_000);
  const id = setInterval(tick, intervalMs);
  return () => clearInterval(id);
}
