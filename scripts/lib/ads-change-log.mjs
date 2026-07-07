/**
 * Relatório legível de mudanças (autopilot-log.jsonl).
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const logPath = resolve(root, "marketing/social/autopilot-log.jsonl");

const ACTION_PT = {
  watch: "Auto-watch executado",
  pause: "Anúncio pausado",
  fatigue_pause: "Pausado por fadiga",
  boost: "Orçamento diário aumentado",
  scale_top: "Orçamento escalado (bom desempenho)",
  autopilot: "Novos anúncios criados",
  video_publish: "Vídeo Reels publicado",
  meta_rec_reels: "Recomendação Meta (Reels) aplicada",
  meta_rec_apply: "Recomendação Meta aplicada",
  meta_rec_scale: "Scale Meta aplicado",
  consolidate_pause: "Pausado (concentrar budget)",
  consolidate_budget: "Orçamento ajustado (foco)",
};

function fmtMoney(cents) {
  if (cents == null) return "";
  return `R$ ${(cents / 100).toFixed(2)}`;
}

function describeEntry(e) {
  const base = ACTION_PT[e.action] ?? e.action;
  const parts = [base];
  if (e.slug) parts.push(e.slug);
  if (e.reason) parts.push(`— ${e.reason}`);
  if (e.budgetCents != null) parts.push(`→ ${fmtMoney(e.budgetCents)}/dia`);
  if (e.created != null) parts.push(`(${e.created} novo(s))`);
  if (e.paused != null && e.action === "watch") {
    parts.push(`· ${e.paused} pausados · ${e.boosted ?? 0} impulsionados`);
  }
  if (e.metaRecs) parts.push(`· ${e.metaRecs} rec. Meta`);
  return parts.join(" ");
}

export function readChangeLog(limit = 40) {
  if (!existsSync(logPath)) return [];
  try {
    const lines = readFileSync(logPath, "utf8").trim().split("\n").filter(Boolean);
    return lines
      .slice(-limit)
      .reverse()
      .map((line) => {
        const e = JSON.parse(line);
        return {
          at: e.at,
          action: e.action,
          slug: e.slug ?? null,
          summary: describeEntry(e),
          raw: e,
        };
      });
  } catch {
    return [];
  }
}

export function summarizeChanges(entries = []) {
  const counts = {};
  for (const e of entries) {
    counts[e.action] = (counts[e.action] ?? 0) + 1;
  }
  return counts;
}
