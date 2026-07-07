/**
 * Puxa variáveis do Vercel (produção = site trove-us.com) para .env.local.
 * Só copia valores não-vazios; não apaga chaves locais (ex.: META_ACCESS_TOKEN).
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const envLocalPath = resolve(root, ".env.local");
const tmpPath = resolve(root, ".env.vercel.sync.tmp");

/** Chaves compartilhadas site ↔ autopilot local */
export const SYNC_KEYS = [
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "OWNER_PIN",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_META_PIXEL_ID",
  "NEXT_PUBLIC_PAYPAL_CLIENT_ID",
  "PAYPAL_CLIENT_SECRET",
  "PAYPAL_MODE",
  "CJ_API_KEY",
  "CJ_OPEN_ID",
  "CJ_PAY_TYPE",
  "CJ_FROM_COUNTRY",
  "CJ_STORE_NAME",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
  "REDIS_URL",
];

function parseEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function setEnvVar(content, name, value) {
  const line = `${name}="${value.replace(/"/g, '\\"')}"`;
  const re = new RegExp(`^${name}=.*$`, "m");
  if (re.test(content)) return content.replace(re, line);
  const sep = content.endsWith("\n") || !content.length ? "" : "\n";
  return content + sep + line + "\n";
}

function pullVercelProduction() {
  if (existsSync(tmpPath)) {
    try {
      unlinkSync(tmpPath);
    } catch {
      /* ignore */
    }
  }
  const r = spawnSync(
    "npx",
    ["vercel", "env", "pull", tmpPath, "--environment=production", "--yes"],
    { cwd: root, shell: true, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  );
  if (r.status !== 0 || !existsSync(tmpPath)) {
    throw new Error(r.stderr?.trim() || "Falha ao puxar env do Vercel (vercel login?)");
  }
  return parseEnv(readFileSync(tmpPath, "utf8"));
}

export function readEnvLocal() {
  if (!existsSync(envLocalPath)) return {};
  return parseEnv(readFileSync(envLocalPath, "utf8"));
}

/**
 * @param {{ keys?: string[], dryRun?: boolean }} opts
 */
export function syncFromVercel(opts = {}) {
  const keys = opts.keys ?? SYNC_KEYS;
  const dryRun = opts.dryRun ?? false;

  const remote = pullVercelProduction();
  const local = readEnvLocal();
  const updated = [];
  const skipped = [];
  const stillEmpty = [];

  let envContent = existsSync(envLocalPath)
    ? readFileSync(envLocalPath, "utf8")
    : "";

  for (const key of keys) {
    const remoteVal = remote[key]?.trim() ?? "";
    const localVal = local[key]?.trim() ?? "";

    if (!remoteVal) {
      stillEmpty.push(key);
      continue;
    }
    if (remoteVal === localVal) {
      skipped.push(key);
      continue;
    }
    updated.push({ key, from: localVal ? "local" : "empty", preview: mask(key, remoteVal) });
    if (!dryRun) {
      envContent = setEnvVar(envContent, key, remoteVal);
      local[key] = remoteVal;
    }
  }

  if (!dryRun && updated.length) {
    writeFileSync(envLocalPath, envContent, "utf8");
  }

  try {
    unlinkSync(tmpPath);
  } catch {
    /* ignore */
  }

  return {
    ok: true,
    updated,
    skipped,
    stillEmpty,
    dryRun,
    remoteHasTelegram: Boolean(
      remote.TELEGRAM_BOT_TOKEN?.trim() && remote.TELEGRAM_CHAT_ID?.trim(),
    ),
    localHasTelegram: Boolean(
      (local.TELEGRAM_BOT_TOKEN?.trim() || remote.TELEGRAM_BOT_TOKEN?.trim()) &&
        (local.TELEGRAM_CHAT_ID?.trim() || remote.TELEGRAM_CHAT_ID?.trim()),
    ),
  };
}

function mask(key, val) {
  if (key.includes("TOKEN") || key.includes("SECRET") || key.includes("KEY") || key === "OWNER_PIN") {
    if (val.length <= 8) return "****";
    return `${val.slice(0, 4)}…${val.slice(-4)}`;
  }
  return val;
}
