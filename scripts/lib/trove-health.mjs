/**
 * Verificação completa: site, Telegram, Meta, agendamento, etc.
 */
import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { isMetaAdsConfigured, verifyMetaToken, verifyAdAccountBilling } from "./meta-ads-api.mjs";
import { isLlmConfigured, verifyOpenAiStatus } from "./ads-llm-advisor.mjs";
import { isRateLimitError, translateMetaError } from "./meta-error-i18n.mjs";
import { readEnvLocal, syncFromVercel, SYNC_KEYS } from "./sync-vercel-env.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SITE = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://trove-us.com";
let remoteTelegramCache = { at: 0, value: false };

function check(id, label, ok, detail, severity = ok ? "ok" : "error") {
  const sev = ok ? "ok" : severity;
  return { id, label, ok, detail, severity: sev };
}

function remoteHasTelegramCached() {
  const now = Date.now();
  if (now - remoteTelegramCache.at < 5 * 60 * 1000) return remoteTelegramCache.value;
  try {
    const remote = syncFromVercel({
      keys: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"],
      dryRun: true,
    });
    remoteTelegramCache = { at: now, value: remote.remoteHasTelegram };
    return remote.remoteHasTelegram;
  } catch {
    return remoteTelegramCache.value;
  }
}

function scheduledTaskStatus() {
  if (process.platform !== "win32") {
    return { installed: false, ready: false, detail: "Agendamento só no Windows" };
  }
  const r = spawnSync(
    "schtasks",
    ["/Query", "/TN", "Trove-Auto-Watch", "/FO", "LIST"],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    return { installed: false, ready: false, detail: "Tarefa Trove-Auto-Watch não instalada" };
  }
  const statusMatch = r.stdout.match(/Status:\s*(.+)/i);
  const status = statusMatch?.[1]?.trim() ?? "desconhecido";
  return {
    installed: true,
    ready: /Ready|running|Em execução/i.test(status),
    detail: `Trove-Auto-Watch · ${status} · 12x/dia (2h)`,
  };
}

function socialOrganicTaskStatus() {
  if (process.platform !== "win32") {
    return { installed: false, ready: false, detail: "Agendamento só no Windows" };
  }
  const r = spawnSync(
    "schtasks",
    ["/Query", "/TN", "Trove-Social-Organic", "/FO", "LIST"],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    return {
      installed: false,
      ready: false,
      detail: "Tarefa Trove-Social-Organic não instalada — npm run social:organic:install",
    };
  }
  const statusMatch = r.stdout.match(/Status:\s*(.+)/i);
  const status = statusMatch?.[1]?.trim() ?? "desconhecido";
  const hour = Number(process.env.META_SOCIAL_ORGANIC_HOUR ?? 15);
  return {
    installed: true,
    ready: /Ready|running|Em execução/i.test(status),
    detail: `Trove-Social-Organic · ${status} · 1 Reel/dia ~${hour}:00`,
  };
}

function dashboardWatchdogStatus() {
  if (process.platform !== "win32") {
    return { installed: false, ok: false, detail: "Só no Windows" };
  }
  const r = spawnSync(
    "schtasks",
    ["/Query", "/TN", "Trove-Dashboard-Watchdog", "/FO", "LIST"],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    return { installed: false, ok: false, detail: "Watchdog painel não instalado — npm run ads:dashboard:install" };
  }
  return { installed: true, ok: true, detail: "Watchdog painel no login + checagem 10 min" };
}

function desktopShortcutExists() {
  const profile = process.env.USERPROFILE;
  if (!profile) return false;
  const candidates = [
    resolve(profile, "OneDrive/Desktop/Trove.lnk"),
    resolve(profile, "Desktop/Trove.lnk"),
    resolve(profile, "OneDrive/Desktop/Trove Autopilot.lnk"),
    resolve(profile, "Desktop/Trove Autopilot.lnk"),
  ];
  return candidates.some((p) => existsSync(p));
}

async function pingSite() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(SITE, { signal: ctrl.signal, redirect: "follow" });
    clearTimeout(t);
    return { ok: res.ok, status: res.status, detail: `${SITE} → HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, status: 0, detail: `${SITE} offline: ${err.message}` };
  }
}

async function testTelegram(token, chatId) {
  if (!token || !chatId) {
    return { ok: false, detail: "Token ou Chat ID vazio" };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await res.json();
    if (!data.ok) {
      return { ok: false, detail: data.description || "Bot inválido" };
    }
    return { ok: true, detail: `Bot @${data.result.username} · Chat ${chatId}` };
  } catch (err) {
    return { ok: false, detail: err.message };
  }
}

/**
 * @param {{ syncFirst?: boolean, reloadEnv?: boolean }} opts
 */
export async function runHealthCheck(opts = {}) {
  let syncResult = null;
  if (opts.syncFirst) {
    try {
      syncResult = syncFromVercel({ keys: SYNC_KEYS, dryRun: false });
      if (opts.reloadEnv !== false && syncResult.updated.length) {
        for (const { key } of syncResult.updated) {
          const local = readEnvLocal();
          if (local[key] !== undefined) process.env[key] = local[key];
        }
      }
    } catch (err) {
      syncResult = { ok: false, error: err.message };
    }
  }

  const local = readEnvLocal();
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() || local.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim() || local.TELEGRAM_CHAT_ID?.trim();
  const telegramLocal = Boolean(token && chatId);

  const remoteTelegram = remoteHasTelegramCached();

  const [site, telegramTest, task, socialTask] = await Promise.all([
    pingSite(),
    testTelegram(token, chatId),
    Promise.resolve(scheduledTaskStatus()),
    Promise.resolve(socialOrganicTaskStatus()),
  ]);

  const metaOk = isMetaAdsConfigured();
  let metaTokenOk = false;
  let metaTokenDetail = "META_ACCESS_TOKEN ou conta faltando";
  if (metaOk) {
    const tok = await verifyMetaToken();
    metaTokenOk = tok.ok || (tok.rateLimited && !tok.expired);
    if (tok.ok) {
      metaTokenDetail = `Conectado como ${tok.name ?? tok.id}`;
    } else if (tok.rateLimited) {
      metaTokenDetail = translateMetaError("Application request limit reached").message;
    } else if (tok.expired) {
      metaTokenDetail = `TOKEN EXPIRADO — renove no Meta Business. ${tok.error}`;
    } else {
      metaTokenDetail = tok.error ?? "Token inválido";
    }
  }
  const dashboard = dashboardWatchdogStatus();

  let openAiBilling = { configured: false, ok: false, billingOk: false, detail: "OpenAI não configurada" };
  if (isLlmConfigured()) {
    openAiBilling = await verifyOpenAiStatus();
  }

  let metaBilling = { configured: false, ok: true, paymentOk: true, detail: "Meta não configurado" };
  if (metaOk) {
    metaBilling = await verifyAdAccountBilling();
  }

  const checks = [
    check("site", "Site trove-us.com", site.ok, site.detail),
    check(
      "telegram-site",
      "Telegram (site/Vercel)",
      remoteTelegram,
      remoteTelegram
        ? "Chave e Chat ID no Vercel — site avisa vendas em tempo real"
        : telegramLocal && telegramTest.ok
          ? "Só no PC — autopilot OK; vendas do site precisam npm run telegram:setup + deploy"
          : "VAZIO no Vercel — configure em vercel.com ou npm run telegram:setup",
      remoteTelegram ? "ok" : telegramLocal && telegramTest.ok ? "warn" : "error",
    ),
    check(
      "telegram-local",
      "Telegram (PC / autopilot)",
      telegramLocal && telegramTest.ok,
      telegramLocal
        ? telegramTest.detail
        : remoteTelegram
          ? "No site tem — rode npm run env:sync"
          : "Sem token/Chat ID — alertas de ads não chegam",
      telegramLocal && telegramTest.ok ? "ok" : "warn",
    ),
    check(
      "meta",
      "Meta Ads API",
      metaOk && metaTokenOk,
      metaTokenDetail,
      metaOk && metaTokenOk ? "ok" : metaOk && !metaTokenOk && /Limite temporário|limitou consultas/i.test(metaTokenDetail) ? "warn" : "error",
    ),
    check(
      "auto-watch",
      "Auto-watch 12x/dia (2h)",
      task.installed,
      task.detail,
      task.installed ? "ok" : "warn",
    ),
    check(
      "social-organic",
      "Social Autopilot 1 Reel/dia",
      socialTask.installed,
      socialTask.detail,
      socialTask.installed ? "ok" : "warn",
    ),
    check(
      "dashboard-watchdog",
      "Painel sempre no ar",
      dashboard.ok,
      dashboard.detail,
      dashboard.ok ? "ok" : "warn",
    ),
    check(
      "meta-billing",
      "Pagamento Meta Ads",
      metaBilling.paymentOk !== false,
      metaBilling.detail ?? "Conta de anúncios",
      metaBilling.paymentOk !== false ? "ok" : "error",
    ),
    check(
      "openai-billing",
      "Crédito OpenAI (JARVIS)",
      !openAiBilling.configured || openAiBilling.billingOk === true,
      openAiBilling.configured
        ? openAiBilling.detail
        : "Sem OPENAI_API_KEY — JARVIS usa modo básico",
      !openAiBilling.configured ? "warn" : openAiBilling.billingOk ? "ok" : "error",
    ),
    check(
      "desktop-app",
      "App desktop",
      desktopShortcutExists(),
      desktopShortcutExists()
        ? "Atalho Trove na Area de Trabalho"
        : "Rode npm run ads:app:install",
      desktopShortcutExists() ? "ok" : "warn",
    ),
  ];

  const errors = checks.filter((c) => !c.ok && c.severity === "error").map((c) => c.detail);
  const warnings = checks.filter((c) => !c.ok && c.severity === "warn").map((c) => c.detail);

  return {
    ok: errors.length === 0,
    generatedAt: new Date().toISOString(),
    checks,
    errors,
    warnings,
    sync: syncResult,
    telegram: {
      siteConfigured: remoteTelegram,
      localConfigured: telegramLocal,
      working: telegramLocal && telegramTest.ok,
    },
  };
}
