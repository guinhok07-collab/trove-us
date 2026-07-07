/**
 * Configurações do painel — persistidas em JSON, aplicadas ao process.env em tempo real.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SETTINGS_PATH = resolve(root, "marketing/social/dashboard-settings.json");
const ENV_LOCAL_PATH = resolve(root, ".env.local");

export const SETTINGS_DEFAULTS = {
  weeklyBudgetBrl: 120,
  dailyBudgetCents: 1000,
  targetActiveAds: 3,
  maxNewAdsPerRun: 3,
  maxDailyBudgetCents: 2000,
  watchIntervalHours: 2,
  dashboardRefreshSeconds: 60,
  autoBoost: true,
  autoPause: true,
  autoApplyMetaRecs: true,
  rateLimitPauseMs: 800,
  metaApiRetryCount: 2,
};

const ENV_MAP = {
  weeklyBudgetBrl: "META_WEEKLY_BUDGET_BRL",
  dailyBudgetCents: "META_AD_DAILY_BUDGET_CENTS",
  targetActiveAds: "META_AD_TARGET_ACTIVE",
  maxNewAdsPerRun: "META_AD_MAX_NEW",
  maxDailyBudgetCents: "META_AD_MAX_BUDGET_CENTS",
};

const BOOL_ENV_MAP = {
  autoBoost: "META_AD_AUTO_BOOST",
  autoPause: "META_AD_SMART_PAUSE",
  autoApplyMetaRecs: "META_REC_AUTO_APPLY",
};

function readFileSettings() {
  if (!existsSync(SETTINGS_PATH)) return {};
  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, "utf8"));
  } catch {
    return {};
  }
}

function envNumber(key, fallback) {
  const v = process.env[key]?.trim();
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function envBool(key, fallback) {
  const v = process.env[key]?.trim();
  if (v === undefined || v === "") return fallback;
  return v !== "0" && v.toLowerCase() !== "false";
}

export function getEffectiveSettings() {
  const file = readFileSettings();
  const merged = { ...SETTINGS_DEFAULTS, ...file };

  return {
    weeklyBudgetBrl: envNumber("META_WEEKLY_BUDGET_BRL", merged.weeklyBudgetBrl),
    dailyBudgetCents: envNumber("META_AD_DAILY_BUDGET_CENTS", merged.dailyBudgetCents),
    targetActiveAds: envNumber("META_AD_TARGET_ACTIVE", merged.targetActiveAds),
    maxNewAdsPerRun: envNumber("META_AD_MAX_NEW", merged.maxNewAdsPerRun),
    maxDailyBudgetCents: envNumber("META_AD_MAX_BUDGET_CENTS", merged.maxDailyBudgetCents),
    watchIntervalHours: merged.watchIntervalHours ?? SETTINGS_DEFAULTS.watchIntervalHours,
    dashboardRefreshSeconds: merged.dashboardRefreshSeconds ?? SETTINGS_DEFAULTS.dashboardRefreshSeconds,
    autoBoost: envBool("META_AD_AUTO_BOOST", merged.autoBoost !== false),
    autoPause: envBool("META_AD_SMART_PAUSE", merged.autoPause !== false),
    autoApplyMetaRecs: envBool("META_REC_AUTO_APPLY", merged.autoApplyMetaRecs !== false),
    rateLimitPauseMs: merged.rateLimitPauseMs ?? SETTINGS_DEFAULTS.rateLimitPauseMs,
    metaApiRetryCount: merged.metaApiRetryCount ?? SETTINGS_DEFAULTS.metaApiRetryCount,
    updatedAt: merged.updatedAt ?? null,
  };
}

export function applySettingsToEnv(settings = getEffectiveSettings()) {
  for (const [key, envKey] of Object.entries(ENV_MAP)) {
    process.env[envKey] = String(settings[key]);
  }
  for (const [key, envKey] of Object.entries(BOOL_ENV_MAP)) {
    process.env[envKey] = settings[key] ? "1" : "0";
  }
  return settings;
}

function setEnvVarLine(content, name, value) {
  const line = `${name}="${String(value).replace(/"/g, '\\"')}"`;
  const re = new RegExp(`^${name}=.*$`, "m");
  if (re.test(content)) return content.replace(re, line);
  const sep = content.endsWith("\n") || !content.length ? "" : "\n";
  return content + sep + line + "\n";
}

function syncSettingsToEnvLocal(settings) {
  if (!existsSync(ENV_LOCAL_PATH)) return;
  let content = readFileSync(ENV_LOCAL_PATH, "utf8");
  for (const [key, envKey] of Object.entries(ENV_MAP)) {
    content = setEnvVarLine(content, envKey, settings[key]);
  }
  for (const [key, envKey] of Object.entries(BOOL_ENV_MAP)) {
    content = setEnvVarLine(content, envKey, settings[key] ? "1" : "0");
  }
  writeFileSync(ENV_LOCAL_PATH, content, "utf8");
}

export function initDashboardSettings() {
  const file = readFileSettings();
  const settings = { ...SETTINGS_DEFAULTS, ...file };
  applySettingsToEnv(settings);
  return settings;
}

export function validateSettings(input) {
  const errors = [];
  const s = { ...input };

  if (s.weeklyBudgetBrl != null) {
    s.weeklyBudgetBrl = Number(s.weeklyBudgetBrl);
    if (!Number.isFinite(s.weeklyBudgetBrl) || s.weeklyBudgetBrl < 30 || s.weeklyBudgetBrl > 10000) {
      errors.push("Orçamento semanal deve ser entre R$ 30 e R$ 10.000.");
    }
  }

  if (s.dailyBudgetCents != null) {
    s.dailyBudgetCents = Math.round(Number(s.dailyBudgetCents));
    if (!Number.isFinite(s.dailyBudgetCents) || s.dailyBudgetCents < 200 || s.dailyBudgetCents > 50000) {
      errors.push("Orçamento diário por anúncio: entre R$ 2,00 e R$ 500,00.");
    }
  }

  if (s.targetActiveAds != null) {
    s.targetActiveAds = Math.round(Number(s.targetActiveAds));
    if (!Number.isFinite(s.targetActiveAds) || s.targetActiveAds < 1 || s.targetActiveAds > 30) {
      errors.push("Anúncios ativos alvo: entre 1 e 30.");
    }
  }

  if (s.maxNewAdsPerRun != null) {
    s.maxNewAdsPerRun = Math.round(Number(s.maxNewAdsPerRun));
    if (!Number.isFinite(s.maxNewAdsPerRun) || s.maxNewAdsPerRun < 0 || s.maxNewAdsPerRun > 15) {
      errors.push("Máx. novos por rodada: entre 0 e 15.");
    }
  }

  if (s.maxDailyBudgetCents != null) {
    s.maxDailyBudgetCents = Math.round(Number(s.maxDailyBudgetCents));
    if (!Number.isFinite(s.maxDailyBudgetCents) || s.maxDailyBudgetCents < 500) {
      errors.push("Teto diário máximo por anúncio: mínimo R$ 5,00.");
    }
  }

  if (s.dashboardRefreshSeconds != null) {
    s.dashboardRefreshSeconds = Math.round(Number(s.dashboardRefreshSeconds));
    if (!Number.isFinite(s.dashboardRefreshSeconds) || s.dashboardRefreshSeconds < 30 || s.dashboardRefreshSeconds > 600) {
      errors.push("Atualização do painel: entre 30 e 600 segundos.");
    }
  }

  if (s.watchIntervalHours != null) {
    s.watchIntervalHours = Number(s.watchIntervalHours);
    if (![1, 2, 3, 4, 6, 12, 24].includes(s.watchIntervalHours)) {
      errors.push("Intervalo auto-watch: escolha 1, 2, 3, 4, 6, 12 ou 24 horas.");
    }
  }

  return { ok: errors.length === 0, errors, settings: s };
}

export function saveDashboardSettings(patch) {
  const current = { ...SETTINGS_DEFAULTS, ...readFileSettings() };
  const merged = { ...current, ...patch, updatedAt: new Date().toISOString() };
  const validation = validateSettings(merged);
  if (!validation.ok) {
    return { ok: false, errors: validation.errors };
  }

  mkdirSync(dirname(SETTINGS_PATH), { recursive: true });
  writeFileSync(SETTINGS_PATH, JSON.stringify(validation.settings, null, 2), "utf8");
  applySettingsToEnv(validation.settings);
  syncSettingsToEnvLocal(validation.settings);
  return { ok: true, settings: validation.settings };
}

export function getSettingsForUi() {
  const s = getEffectiveSettings();
  const maxDailyPerAd = s.targetActiveAds > 0
    ? (s.weeklyBudgetBrl / 7 / s.targetActiveAds).toFixed(2)
    : "0.00";

  return {
    ...s,
    dailyBudgetBrl: (s.dailyBudgetCents / 100).toFixed(2),
    maxDailyBudgetBrl: (s.maxDailyBudgetCents / 100).toFixed(2),
    maxDailyPerAdBrl: maxDailyPerAd,
  };
}
