/**
 * Trove Autopilot — painel local de acompanhamento.
 * Usage: node --env-file=.env.local scripts/ads-dashboard-server.mjs
 * Abre: http://localhost:3847
 */
import { createServer } from "http";
import { spawn } from "child_process";
import { writeFileSync, mkdirSync, existsSync, createReadStream } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { buildDashboardPayload } from "./lib/ads-dashboard-data.mjs";
import { setAdStatus, isMetaAdsConfigured } from "./lib/meta-ads-api.mjs";
import { syncFromVercel } from "./lib/sync-vercel-env.mjs";
import { runHealthCheck } from "./lib/trove-health.mjs";
import { DASHBOARD_HTML } from "./lib/dashboard-ui.mjs";
import { applyMarketerAction } from "./lib/apply-marketer-action.mjs";
import { handlePermissionDecision } from "./lib/ads-llm-advisor.mjs";
import { getJarvisStatusForUi, askJarvis } from "./lib/ads-jarvis.mjs";
import { loadState } from "./lib/ads-auto-engine.mjs";
import { initDashboardSettings, getSettingsForUi, saveDashboardSettings } from "./lib/dashboard-settings.mjs";
import { bootstrapAutopilotBrain } from "./lib/ads-autopilot-brain.mjs";
import { userErrorMessage } from "./lib/meta-error-i18n.mjs";
import { startSocialOrganicScheduler } from "./lib/social-organic-scheduler.mjs";
import { startJarvisWatchdog } from "./lib/jarvis-watchdog.mjs";
import {
  startJob,
  appendJobOutput,
  finishJob,
  getJobStatus,
  isJobRunning,
} from "./lib/ads-job-tracker.mjs";

initDashboardSettings();
void bootstrapAutopilotBrain().catch(() => {});

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.ADS_DASHBOARD_PORT ?? 3847);
const feedDir = resolve(root, "marketing/social/output/feed");
const logPath = resolve(root, "marketing/social/dashboard-server.log");
const DATA_CACHE_MS = Number(process.env.DASHBOARD_DATA_CACHE_MS ?? 45_000);
const DATA_BUILD_TIMEOUT_MS = Number(process.env.DASHBOARD_DATA_TIMEOUT_MS ?? 90_000);

let runningJob = null;
let lastSyncAt = 0;
let dataCache = { at: 0, payload: null };
let dataBuildRunning = false;
let dataBuildQueue = null;

function logLine(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    mkdirSync(dirname(logPath), { recursive: true });
    writeFileSync(logPath, line, { flag: "a" });
  } catch {
    /* ignore */
  }
  console.error(line.trim());
}

function withTimeout(promise, ms, label = "operação") {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} demorou demais (${Math.round(ms / 1000)}s)`)), ms);
    }),
  ]);
}

async function getDashboardDataSafe() {
  const now = Date.now();
  if (dataCache.payload && now - dataCache.at < DATA_CACHE_MS) {
    return { ...dataCache.payload, cached: true, cacheAgeSec: Math.round((now - dataCache.at) / 1000) };
  }

  if (dataBuildRunning && dataBuildQueue) {
    return dataBuildQueue;
  }

  dataBuildRunning = true;
  dataBuildQueue = withTimeout(
    buildDashboardPayload({ syncFirst: false, skipHealth: true }),
    DATA_BUILD_TIMEOUT_MS,
    "Carregar painel",
  )
    .then((payload) => {
      dataCache = { at: Date.now(), payload };
      dataBuildRunning = false;
      dataBuildQueue = null;
      return payload;
    })
    .catch((err) => {
      dataBuildRunning = false;
      dataBuildQueue = null;
      logLine(`buildDashboardPayload falhou: ${err.message}`);
      if (dataCache.payload) {
        return {
          ...dataCache.payload,
          cached: true,
          stale: true,
          userAlerts: [
            ...(dataCache.payload.userAlerts ?? []),
            { type: "warn", title: "Dados em cache", detail: "Meta lenta ou offline — mostrando última atualização." },
          ],
        };
      }
      throw err;
    });

  return dataBuildQueue;
}

function spawnDashboardJob(scriptKey, scriptFile) {
  startJob(scriptKey);
  const child = spawn(
    process.execPath,
    ["--env-file=.env.local", resolve(root, "scripts", scriptFile)],
    { cwd: root, shell: false },
  );
  child.stdout?.on("data", (buf) => appendJobOutput(buf));
  child.stderr?.on("data", (buf) => appendJobOutput(buf));
  child.on("close", (code) => {
    finishJob(code ?? 1);
    runningJob = null;
  });
  runningJob = child;
  return child;
}

async function maybeAutoSync() {
  const now = Date.now();
  if (now - lastSyncAt < 60 * 60 * 1000) return null;
  lastSyncAt = now;
  try {
    return await withTimeout(
      Promise.resolve(syncFromVercel({ dryRun: false })),
      25_000,
      "Sync Vercel",
    );
  } catch (err) {
    logLine(`maybeAutoSync: ${err.message}`);
    return null;
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  try {
    if (url.pathname === "/api/data") {
      if (url.searchParams.get("sync") === "1") await maybeAutoSync();
      const data = await getDashboardDataSafe();
      json(res, data);
      return;
    }

    if (url.pathname === "/api/ping") {
      json(res, { ok: true, at: new Date().toISOString(), port: PORT });
      return;
    }

    if (url.pathname === "/api/health") {
      const health = await runHealthCheck({ syncFirst: url.searchParams.get("sync") === "1" });
      json(res, health);
      return;
    }

    if (url.pathname === "/api/sync-env" && req.method === "POST") {
      try {
        const result = syncFromVercel({ dryRun: false });
        for (const { key } of result.updated) {
          const { readEnvLocal } = await import("./lib/sync-vercel-env.mjs");
          const local = readEnvLocal();
          if (local[key] !== undefined) process.env[key] = local[key];
        }
        json(res, { ok: true, ...result });
      } catch (err) {
        json(res, { ok: false, error: userErrorMessage(err) }, 500);
      }
      return;
    }

    if (url.pathname === "/api/settings" && req.method === "GET") {
      json(res, { ok: true, settings: getSettingsForUi() });
      return;
    }

    if (url.pathname === "/api/settings" && req.method === "POST") {
      const body = await readJsonBody(req);
      const result = saveDashboardSettings(body ?? {});
      if (!result.ok) {
        json(res, { ok: false, errors: result.errors }, 400);
        return;
      }
      json(res, { ok: true, settings: getSettingsForUi(), message: "Configurações salvas — já valendo nesta sessão." });
      return;
    }

    if (url.pathname === "/api/pause" && req.method === "POST") {
      const adId = url.searchParams.get("adId");
      if (!adId || !isMetaAdsConfigured()) {
        json(res, { ok: false, error: "Meta não configurado" }, 400);
        return;
      }
      await setAdStatus(adId, "PAUSED");
      const { readFileSync, writeFileSync, existsSync } = await import("fs");
      const statePath = resolve(root, "marketing/social/autopilot-state.json");
      if (existsSync(statePath)) {
        const state = JSON.parse(readFileSync(statePath, "utf8"));
        for (const [, meta] of Object.entries(state.ads ?? {})) {
          if (meta.adId === adId) {
            meta.status = "PAUSED";
            meta.pausedAt = new Date().toISOString();
            meta.pauseReason = "manual (painel)";
          }
        }
        writeFileSync(statePath, JSON.stringify(state, null, 2), "utf8");
      }
      json(res, { ok: true });
      return;
    }

    if (url.pathname === "/api/apply" && req.method === "POST") {
      const action = url.searchParams.get("action");
      const slug = url.searchParams.get("slug") ?? undefined;
      const adId = url.searchParams.get("adId") ?? undefined;
      if (!action) {
        json(res, { ok: false, error: "Ação obrigatória" }, 400);
        return;
      }
      try {
        const result = await applyMarketerAction(action, { slug, adId });
        if (result.async) {
          if (isJobRunning()) {
            json(res, { ok: false, error: "Já tem um comando rodando — veja o painel de progresso acima." }, 409);
            return;
          }
          const scripts = { optimize: "ads-auto-optimize.mjs", watch: "ads-auto-watch.mjs", autopilot: "meta-ads-autopilot.mjs" };
          spawnDashboardJob(result.script, scripts[result.script]);
          json(res, { ok: true, message: `${getJobStatus().label} iniciada — acompanhe ao vivo no painel.` });
          return;
        }
        json(res, result);
      } catch (err) {
        json(res, { ok: false, error: userErrorMessage(err) }, 500);
      }
      return;
    }

    if (url.pathname === "/api/run" && req.method === "POST") {
      const script = url.searchParams.get("script");
      const allowed = {
        watch: "ads-auto-watch.mjs",
        jarvis: "ads-jarvis.mjs",
        review: "meta-ads-review.mjs",
        autopilot: "meta-ads-autopilot.mjs",
        run: "run-ad-autopilot.mjs",
        optimize: "ads-auto-optimize.mjs",
        "meta-recs": "meta-recommendations-sync.mjs",
      };
      if (!allowed[script]) {
        json(res, { ok: false, error: "Script inválido" }, 400);
        return;
      }
      if (isJobRunning()) {
        json(res, { ok: false, error: "Já tem um comando rodando — aguarde terminar." }, 409);
        return;
      }
      spawnDashboardJob(script, allowed[script]);
      json(res, { ok: true, message: `${getJobStatus().label} — acompanhe ao vivo no painel.` });
      return;
    }

    if (url.pathname === "/api/job-status") {
      json(res, getJobStatus());
      return;
    }

    if (url.pathname === "/api/jarvis-boot") {
      try {
        const data = await getDashboardDataSafe();
        json(res, {
          ok: true,
          jarvis: data.jarvis,
          totals: data.totals,
          adsCount: (data.ads || []).length,
        });
      } catch {
        const state = loadState();
        const ads = Object.values(state.ads ?? {});
        const active = ads.filter((a) => a.status === "ACTIVE").length;
        const paused = ads.filter((a) => a.status === "PAUSED").length;
        const totals = { active, paused, salesTotal: 0, clicks: 0, spend: 0 };
        const jarvis = getJarvisStatusForUi({ totals, weeklyBudget: { spentBrl: 0, capBrl: 120 } });
        json(res, { ok: true, jarvis, totals, adsCount: ads.length });
      }
      return;
    }

    if (url.pathname === "/api/alexa/capabilities" && req.method === "GET") {
      const { checkAlexaCapabilities } = await import("./lib/jarvis-pc.mjs");
      const { isAlexaMode } = await import("./lib/jarvis-alexa.mjs");
      json(res, {
        ok: true,
        alexaModeDefault: isAlexaMode(),
        capabilities: checkAlexaCapabilities(),
      });
      return;
    }

    if (url.pathname === "/api/jarvis-ask" && req.method === "POST") {
      const body = await readJsonBody(req);
      const question = body?.question?.trim();
      if (!question) {
        json(res, { ok: false, error: "Diga ou digite uma pergunta." }, 400);
        return;
      }
      try {
        const result = await askJarvis(question, {
          wake: Boolean(body?.wake),
          alexaMode: body?.alexaMode !== false && body?.alexaMode !== 0,
        });
        json(res, result, result.ok ? 200 : 400);
      } catch (err) {
        json(res, { ok: false, error: userErrorMessage(err) }, 500);
      }
      return;
    }

    if (url.pathname === "/api/jarvis-personal" && req.method === "GET") {
      const { getDueForPanel, listPersonalItems, fireDuePersonalItems } = await import(
        "./lib/jarvis-personal.mjs"
      );
      await fireDuePersonalItems().catch(() => {});
      json(res, {
        ok: true,
        due: getDueForPanel(),
        items: listPersonalItems(),
      });
      return;
    }

    if (url.pathname === "/api/jarvis-personal/ack" && req.method === "POST") {
      const body = await readJsonBody(req);
      const { ackDue } = await import("./lib/jarvis-personal.mjs");
      ackDue(body?.id);
      json(res, { ok: true });
      return;
    }

    if (url.pathname === "/api/jarvis-tts" && req.method === "POST") {
      try {
        const body = await readJsonBody(req);
        const { synthesizeJarvisSpeech, listJarvisTtsVoices } = await import("./lib/jarvis-tts.mjs");
        if (body?.list) {
          json(res, { ok: true, voices: listJarvisTtsVoices() });
          return;
        }
        const { buffer, contentType, voice, model } = await synthesizeJarvisSpeech(body?.text, {
          voice: body?.voice || process.env.OPENAI_TTS_VOICE || "nova",
        });
        res.writeHead(200, {
          "Content-Type": contentType,
          "Cache-Control": "no-store",
          "X-Jarvis-Voice": voice,
          "X-Jarvis-Tts-Model": model,
        });
        res.end(buffer);
      } catch (err) {
        json(res, { ok: false, error: userErrorMessage(err) }, 500);
      }
      return;
    }

    if (url.pathname === "/api/jarvis-tts/voices" && req.method === "GET") {
      const { listJarvisTtsVoices } = await import("./lib/jarvis-tts.mjs");
      json(res, { ok: true, voices: listJarvisTtsVoices() });
      return;
    }

    if (url.pathname === "/api/jarvis" && req.method === "GET") {
      const data = await getDashboardDataSafe();
      json(res, data.jarvis ?? getJarvisStatusForUi());
      return;
    }

    if (url.pathname === "/api/jarvis" && req.method === "POST") {
      if (isJobRunning()) {
        json(res, { ok: false, error: "JARVIS já está rodando — aguarde." }, 409);
        return;
      }
      spawnDashboardJob("jarvis", "ads-jarvis.mjs");
      json(res, { ok: true, message: "JARVIS iniciado — diagnóstico + correções + consultora." });
      return;
    }

    if (url.pathname === "/api/llm-permission" && req.method === "POST") {
      const body = await readJsonBody(req);
      const decision = body?.decision ?? url.searchParams.get("decision");
      if (!decision || !["approve", "dismiss"].includes(decision)) {
        json(res, { ok: false, error: "Use decision=approve ou dismiss" }, 400);
        return;
      }
      try {
        const result = await handlePermissionDecision(decision);
        json(res, result, result.ok ? 200 : 400);
      } catch (err) {
        json(res, { ok: false, error: userErrorMessage(err) }, 500);
      }
      return;
    }

    if (url.pathname === "/api/social-organic" && req.method === "GET") {
      const { getSocialOrganicStatus } = await import("./lib/social-organic-poster.mjs");
      json(res, { ok: true, ...getSocialOrganicStatus() });
      return;
    }

    if (url.pathname === "/api/social-organic" && req.method === "POST") {
      const force = url.searchParams.get("force") === "1";
      try {
        const { runSocialOrganicPost } = await import("./lib/social-organic-poster.mjs");
        const result = await runSocialOrganicPost({ force });
        json(res, result, result.ok ? 200 : 400);
      } catch (err) {
        json(res, { ok: false, error: userErrorMessage(err) }, 500);
      }
      return;
    }

    if (url.pathname === "/api/creative") {
      const slug = url.searchParams.get("slug");
      const file = url.searchParams.get("file") ?? slug;
      const candidates = [`${file}.png`, `${slug}.png`].filter(Boolean);
      const png = candidates.map((f) => resolve(feedDir, f)).find((p) => existsSync(p));
      if (!png) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "public, max-age=300" });
      createReadStream(png).pipe(res);
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    });
    res.end(DASHBOARD_HTML);
  } catch (err) {
    json(res, { ok: false, error: userErrorMessage(err) }, 500);
  }
});

server.listen(PORT, () => {
  const outHtml = resolve(root, "marketing/social/dashboard.html");
  mkdirSync(dirname(outHtml), { recursive: true });
  try {
    writeFileSync(outHtml, DASHBOARD_HTML, "utf8");
  } catch {
    /* ignore */
  }
  server.timeout = 120_000;
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
  logLine(`Painel online → http://localhost:${PORT}`);
  console.log(`\n  Trove Autopilot Painel → http://localhost:${PORT}\n`);
  console.log("  Estável: erros não derrubam o servidor · cache 45s · watchdog reinicia se cair\n");
  void getDashboardDataSafe().catch((err) => logLine(`warmup: ${err.message}`));

  startSocialOrganicScheduler({
    intervalMs: Number(process.env.META_SOCIAL_ORGANIC_CHECK_MS ?? 10 * 60 * 1000),
    log: (msg) => logLine(`[social] ${msg}`),
  });

  startJarvisWatchdog({
    intervalMs: Number(process.env.JARVIS_WATCHDOG_MS ?? 60 * 1000),
    log: (msg) => logLine(`[jarvis-watch] ${msg}`),
  });

  if (process.env.ADS_DASHBOARD_OPEN === "1") {
    import("child_process").then(({ exec }) => {
      exec(`start http://localhost:${PORT}`);
    });
  }
});

server.on("error", (err) => {
  logLine(`server error: ${err.message}`);
  if (err.code === "EADDRINUSE") {
    console.error(`\n  Porta ${PORT} já em uso — watchdog ou outro painel já está rodando.\n`);
    process.exit(0);
  }
});

process.on("uncaughtException", (err) => {
  logLine(`uncaughtException: ${err?.stack ?? err}`);
});

process.on("unhandledRejection", (err) => {
  logLine(`unhandledRejection: ${err?.stack ?? err}`);
});

function json(res, body, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return null;
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return null;
  }
}

function renderStaticNote(data) {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem"><h1>Trove Autopilot</h1><p>Painel ao vivo: <a href="http://localhost:${PORT}">http://localhost:${PORT}</a></p><p>Atualizado: ${data.generatedAt}</p><p>Anúncios ativos: ${data.totals.active}</p><p>Vendas: ${data.totals.salesTotal}</p></body></html>`;
}
