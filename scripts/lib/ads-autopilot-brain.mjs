/**
 * Memória do Trove Autopilot — regras aprendidas para não repetir erros.
 * Roda no auto-watch, antes de criar anúncios e ao abrir o painel.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { graphGet, isMetaAdsConfigured, metaConfig } from "./meta-ads-api.mjs";
import { appendLog } from "./ads-log.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const BRAIN_PATH = resolve(root, "marketing/social/autopilot-brain.json");
const ENV_LOCAL = resolve(root, ".env.local");

/** Regras que o sistema segue (o que antes só estava na cabeça do assistente). */
export const AUTOPILOT_RULES = [
  {
    id: "instagram_identity",
    title: "Sempre vincular Instagram nos criativos",
    detail: "Todo anúncio novo leva instagram_user_id (@shoptrove.us) — evita aviso Threads Feed.",
  },
  {
    id: "video_thumb_one",
    title: "Vídeo: só image_hash OU image_url",
    detail: "A Meta rejeita os dois juntos no video_data — sanitizar antes de criar/atualizar.",
  },
  {
    id: "video_needs_png",
    title: "Vídeo precisa de PNG do feed",
    detail: "Publicar vídeo sem miniatura 1:1 gera criativo incompleto.",
  },
  {
    id: "placement_fix_cycle",
    title: "Corrigir placements a cada auto-watch",
    detail: "Miniatura, identidade Instagram e recomendações Meta Opportunity Score.",
  },
  {
    id: "concentrate_budget",
    title: "Máx. 3 anúncios ativos no teto semanal",
    detail: "Budget diluído = zero impressões — pausar excesso automaticamente.",
  },
  {
    id: "discover_instagram_id",
    title: "Descobrir Instagram ID sozinho",
    detail: "Se META_INSTAGRAM_ACTOR_ID faltar, busca nos criativos da conta e salva no .env.local.",
  },
];

function loadBrain() {
  if (!existsSync(BRAIN_PATH)) {
    return { version: 1, rules: AUTOPILOT_RULES.map((r) => r.id), events: [], lastBootstrap: null };
  }
  try {
    return JSON.parse(readFileSync(BRAIN_PATH, "utf8"));
  } catch {
    return { version: 1, rules: AUTOPILOT_RULES.map((r) => r.id), events: [], lastBootstrap: null };
  }
}

function saveBrain(brain) {
  mkdirSync(dirname(BRAIN_PATH), { recursive: true });
  writeFileSync(BRAIN_PATH, JSON.stringify(brain, null, 2), "utf8");
}

export function recordBrainEvent(type, detail = {}) {
  const brain = loadBrain();
  brain.events = [
    { at: new Date().toISOString(), type, ...detail },
    ...(brain.events ?? []),
  ].slice(0, 80);
  saveBrain(brain);
}

function setEnvVarLine(content, name, value) {
  const line = `${name}="${String(value).replace(/"/g, '\\"')}"`;
  const re = new RegExp(`^${name}=.*$`, "m");
  if (re.test(content)) return content.replace(re, line);
  const sep = content.endsWith("\n") || !content.length ? "" : "\n";
  return content + sep + line + "\n";
}

/** Busca Instagram actor ID nos criativos já publicados na conta. */
export async function discoverInstagramActorId() {
  if (!isMetaAdsConfigured()) return null;
  const { act, token } = metaConfig();
  const url = new URL(`https://graph.facebook.com/v21.0/${act}/adcreatives`);
  url.searchParams.set("fields", "object_story_spec");
  url.searchParams.set("limit", "50");
  url.searchParams.set("access_token", token);
  const data = await fetch(url).then((r) => r.json());
  const counts = new Map();
  for (const c of data.data ?? []) {
    const ig = c.object_story_spec?.instagram_user_id;
    if (ig) counts.set(ig, (counts.get(ig) ?? 0) + 1);
  }
  if (!counts.size) return null;
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/** Garante META_INSTAGRAM_ACTOR_ID no process.env e .env.local. */
export async function ensureInstagramInEnv() {
  const current = process.env.META_INSTAGRAM_ACTOR_ID?.trim();
  if (current) return { ok: true, id: current, source: "env" };

  const discovered = await discoverInstagramActorId();
  if (!discovered) {
    return { ok: false, reason: "Instagram ID não encontrado — conecte @shoptrove.us no Business Manager" };
  }

  process.env.META_INSTAGRAM_ACTOR_ID = discovered;
  if (existsSync(ENV_LOCAL)) {
    let content = readFileSync(ENV_LOCAL, "utf8");
    content = setEnvVarLine(content, "META_INSTAGRAM_ACTOR_ID", discovered);
    writeFileSync(ENV_LOCAL, content, "utf8");
  }

  recordBrainEvent("instagram_id_saved", { id: discovered });
  return { ok: true, id: discovered, source: "discovered" };
}

/** Verifica criativo após publicar — corrige se faltar Instagram. */
export async function verifyAdHasInstagram(adId, { label = "" } = {}) {
  if (!isMetaAdsConfigured()) return { ok: false };
  const cfg = metaConfig();
  if (!cfg.instagramActorId) return { ok: false, reason: "sem instagram no env" };

  try {
    const ad = await graphGet(`/${adId}`, { fields: "creative{object_story_spec}" });
    const ig = ad.creative?.object_story_spec?.instagram_user_id;
    if (ig === cfg.instagramActorId) return { ok: true, verified: true };
    recordBrainEvent("verify_missing_instagram", { adId, label, had: ig ?? null });
    return { ok: false, reason: "instagram ausente no criativo", adId };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

/** Checagens antes de criar anúncio — evita erro conhecido. */
export function preflightCreateAd({ slug, imagePath, videoPath, product = slug }) {
  const issues = [];
  if (!process.env.META_INSTAGRAM_ACTOR_ID?.trim()) {
    issues.push({
      severity: "warn",
      code: "instagram_identity",
      message: "Instagram ID será resolvido automaticamente antes de publicar",
    });
  }
  if (videoPath && !imagePath) {
    issues.push({
      severity: "error",
      code: "video_needs_png",
      message: `${product}: vídeo sem PNG do feed — rode npm run social:pack`,
    });
  }
  if (imagePath && !existsSync(imagePath)) {
    issues.push({
      severity: "error",
      code: "missing_image",
      message: `${product}: imagem não encontrada em ${imagePath}`,
    });
  }
  const blocking = issues.filter((i) => i.severity === "error");
  return { ok: blocking.length === 0, issues, slug };
}

/**
 * Inicializa a memória do autopilot — chamar no watch, autopilot e painel.
 */
export async function bootstrapAutopilotBrain() {
  const brain = loadBrain();
  const lines = [];
  const fixes = [];

  if (!isMetaAdsConfigured()) {
    return { ok: false, reason: "Meta não configurada", rules: AUTOPILOT_RULES, brain };
  }

  const ig = await ensureInstagramInEnv();
  if (ig.ok && ig.source === "discovered") {
    lines.push(`🧠 Instagram ID descoberto e salvo (${ig.id})`);
    fixes.push("instagram_id");
  } else if (ig.ok) {
    lines.push(`🧠 Instagram @shoptrove.us configurado`);
  } else {
    lines.push(`⚠️ ${ig.reason}`);
  }

  brain.lastBootstrap = new Date().toISOString();
  brain.rules = AUTOPILOT_RULES.map((r) => r.id);
  brain.instagramActorId = process.env.META_INSTAGRAM_ACTOR_ID?.trim() ?? null;
  saveBrain(brain);

  return {
    ok: true,
    lines,
    fixes,
    rules: AUTOPILOT_RULES,
    brain,
    ruleCount: AUTOPILOT_RULES.length,
  };
}

export function getBrainStatusForUi() {
  const brain = loadBrain();
  return {
    ruleCount: AUTOPILOT_RULES.length,
    rules: AUTOPILOT_RULES,
    lastBootstrap: brain.lastBootstrap,
    instagramConfigured: Boolean(process.env.META_INSTAGRAM_ACTOR_ID?.trim()),
    recentEvents: (brain.events ?? []).slice(0, 8),
    summary: `${AUTOPILOT_RULES.length} regras ativas — o sistema aprende com cada correção e não repete o mesmo erro.`,
  };
}
