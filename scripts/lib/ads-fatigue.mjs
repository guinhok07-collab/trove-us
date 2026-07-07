/**
 * Detecção de fadiga criativa — CTR cai enquanto impressões sobem.
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const historyPath = resolve(root, "marketing/social/metrics-history.json");

const MIN_IMPRESSIONS = Number(process.env.META_AD_FATIGUE_MIN_IMPRESSIONS ?? 300);
const CTR_DROP_PCT = Number(process.env.META_AD_FATIGUE_CTR_DROP ?? 25);
const IMPRESSIONS_RISE_PCT = Number(process.env.META_AD_FATIGUE_IMP_RISE ?? 30);
const MAX_AGE_DAYS = Number(process.env.META_AD_FATIGUE_MAX_AGE_DAYS ?? 14);

export function loadMetricsHistory(path = historyPath) {
  if (!existsSync(path)) return { snapshots: [] };
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return { snapshots: [] };
  }
}

function metricBySlug(snapshot) {
  const map = new Map();
  for (const row of snapshot.ads ?? []) {
    if (row.slug) map.set(row.slug, row);
  }
  return map;
}

/**
 * @returns {{ fatigued: Array<{ slug, reason, ctrDrop, impressionsRise }> }}
 */
export function detectFatigue({ metrics = [], history, stateAds = {} } = {}) {
  const snapshots = (history ?? loadMetricsHistory()).snapshots ?? [];
  const fatigued = [];
  const recent = snapshots.slice(-6);
  if (recent.length < 2) return { fatigued };

  const oldest = recent[0];
  const newest = recent[recent.length - 1];
  const oldMap = metricBySlug(oldest);
  const newMap = metricBySlug(newest);

  for (const m of metrics) {
    const meta = stateAds[m.slug];
    if (!meta || meta.status !== "ACTIVE") continue;
    if ((m.purchases ?? 0) > 0 || (m.siteOrders ?? 0) > 0) continue;

    const prev = oldMap.get(m.slug);
    const curr = newMap.get(m.slug) ?? m;
    const impressions = Number(curr.impressions ?? m.impressions ?? 0);
    const ctr = Number(curr.ctr ?? m.ctr ?? 0);

    if (impressions < MIN_IMPRESSIONS) {
      const createdAt = meta.createdAt ? new Date(meta.createdAt).getTime() : 0;
      const ageDays = createdAt ? (Date.now() - createdAt) / 86400000 : 0;
      if (ageDays >= MAX_AGE_DAYS && impressions >= 200) {
        fatigued.push({
          slug: m.slug,
          reason: `Anúncio com ${Math.floor(ageDays)} dias no ar — hora de rotacionar criativo`,
          ctrDrop: 0,
          impressionsRise: 0,
          type: "age",
        });
      }
      continue;
    }

    const prevCtr = Number(prev?.ctr ?? 0);
    const prevImp = Number(prev?.impressions ?? 0);
    if (!prevCtr || !prevImp) continue;

    const ctrDrop = ((prevCtr - ctr) / prevCtr) * 100;
    const impRise = ((impressions - prevImp) / prevImp) * 100;

    if (ctrDrop >= CTR_DROP_PCT && impRise >= IMPRESSIONS_RISE_PCT && ctr < prevCtr) {
      fatigued.push({
        slug: m.slug,
        reason: `Fadiga: CTR ${prevCtr.toFixed(2)}% → ${ctr.toFixed(2)}% · +${impRise.toFixed(0)}% impressões`,
        ctrDrop,
        impressionsRise: impRise,
        type: "metrics",
      });
    }
  }

  return { fatigued };
}

export function calcRoas(revenue, spend) {
  const rev = Number(revenue ?? 0);
  const sp = Number(spend ?? 0);
  if (sp <= 0) return rev > 0 ? null : 0;
  return rev / sp;
}
