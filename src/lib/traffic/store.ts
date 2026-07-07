import { Redis } from "@upstash/redis";
import type {
  TrafficDayRow,
  TrafficEventInput,
  TrafficEventType,
  TrafficReport,
} from "./types";
import { getCjPayType, isCjConfigured } from "@/lib/cj/client";
import { isTelegramConfigured } from "@/lib/notifications/telegram";

const DAY_INDEX = "trove:traffic:days";
const EVENT_TYPES: TrafficEventType[] = [
  "page_view",
  "view_product",
  "add_to_cart",
  "view_cart",
  "initiate_checkout",
  "payment_started",
  "purchase",
];

let redisClient: Redis | null | undefined;

function getRedisConfig() {
  const url =
    process.env.KV_REST_API_URL?.trim() ||
    process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token =
    process.env.KV_REST_API_TOKEN?.trim() ||
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return url && token ? { url, token } : null;
}

export function isTrafficStoreConfigured(): boolean {
  return Boolean(getRedisConfig());
}

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  const config = getRedisConfig();
  redisClient = config ? new Redis(config) : null;
  return redisClient;
}

function dayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function dayHashKey(date: string) {
  return `trove:traffic:day:${date}`;
}

export function parseTrafficSource(
  utmSource?: string,
  referrer?: string,
): string | undefined {
  const utm = utmSource?.trim().toLowerCase();
  if (utm) return utm.slice(0, 40);

  if (!referrer?.trim()) return "direct";

  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (host.includes("facebook") || host.includes("fb.com")) return "facebook";
    if (host.includes("instagram")) return "instagram";
    if (host.includes("google")) return "google";
    if (host.includes("trove-us.com")) return "direct";
    return host.replace(/^www\./, "").slice(0, 40);
  } catch {
    return undefined;
  }
}

export async function recordTrafficEvent(
  event: TrafficEventInput,
): Promise<{ ok: boolean }> {
  const redis = getRedis();
  if (!redis) return { ok: false };

  const day = dayKey();
  const key = dayHashKey(day);

  await redis.hincrby(key, event.type, 1);

  if (event.productSlug?.trim()) {
    await redis.hincrby(
      key,
      `product:${event.productSlug.trim().slice(0, 80)}`,
      1,
    );
  }

  const source = parseTrafficSource(event.utmSource, event.referrer);
  if (source) {
    await redis.hincrby(key, `source:${source}`, 1);
  }

  await redis.expire(key, 60 * 60 * 24 * 92);
  await redis.zadd(DAY_INDEX, { score: Date.parse(`${day}T12:00:00Z`), member: day });

  return { ok: true };
}

function readCount(hash: Record<string, unknown>, field: TrafficEventType): number {
  const v = hash[field];
  return typeof v === "number" ? v : Number(v) || 0;
}

function formatDayLabel(date: string): string {
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}

export async function getTrafficReport(days = 14): Promise<TrafficReport> {
  const redis = getRedis();
  const payType = getCjPayType();
  const health = {
    metaPixel: Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim()),
    paypalLive: process.env.PAYPAL_MODE?.trim().toLowerCase() === "live",
    cjConfigured: isCjConfigured(),
    cjPayType: payType,
    cjManualPay: payType === 3,
    redis: Boolean(redis),
    telegram: isTelegramConfigured(),
  };

  if (!redis) {
    return {
      ok: true,
      configured: false,
      days: [],
      totals: {
        pageView: 0,
        viewProduct: 0,
        addToCart: 0,
        viewCart: 0,
        initiateCheckout: 0,
        paymentStarted: 0,
        purchase: 0,
      },
      topProducts: [],
      topSources: [],
      health,
    };
  }

  const limit = Math.min(Math.max(days, 1), 30);
  const dayMembers = await redis.zrange(DAY_INDEX, -limit, -1);
  const dayList =
    dayMembers.length > 0
      ? (dayMembers as string[])
      : Array.from({ length: limit }, (_, i) => {
          const d = new Date();
          d.setUTCDate(d.getUTCDate() - (limit - 1 - i));
          return dayKey(d);
        });

  const rows: TrafficDayRow[] = [];
  const productTotals = new Map<string, number>();
  const sourceTotals = new Map<string, number>();

  for (const date of dayList) {
    const hash =
      (await redis.hgetall<Record<string, unknown>>(dayHashKey(date))) ?? {};
    rows.push({
      date,
      label: formatDayLabel(date),
      pageView: readCount(hash, "page_view"),
      viewProduct: readCount(hash, "view_product"),
      addToCart: readCount(hash, "add_to_cart"),
      viewCart: readCount(hash, "view_cart"),
      initiateCheckout: readCount(hash, "initiate_checkout"),
      paymentStarted: readCount(hash, "payment_started"),
      purchase: readCount(hash, "purchase"),
    });

    for (const [field, value] of Object.entries(hash)) {
      const count = typeof value === "number" ? value : Number(value) || 0;
      if (field.startsWith("product:")) {
        const slug = field.slice(8);
        productTotals.set(slug, (productTotals.get(slug) ?? 0) + count);
      }
      if (field.startsWith("source:")) {
        const source = field.slice(7);
        sourceTotals.set(source, (sourceTotals.get(source) ?? 0) + count);
      }
    }
  }

  const totals = rows.reduce(
    (acc, row) => ({
      pageView: acc.pageView + row.pageView,
      viewProduct: acc.viewProduct + row.viewProduct,
      addToCart: acc.addToCart + row.addToCart,
      viewCart: acc.viewCart + row.viewCart,
      initiateCheckout: acc.initiateCheckout + row.initiateCheckout,
      paymentStarted: acc.paymentStarted + row.paymentStarted,
      purchase: acc.purchase + row.purchase,
    }),
    {
      pageView: 0,
      viewProduct: 0,
      addToCart: 0,
      viewCart: 0,
      initiateCheckout: 0,
      paymentStarted: 0,
      purchase: 0,
    },
  );

  const topProducts = [...productTotals.entries()]
    .map(([slug, views]) => ({ slug, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  const topSources = [...sourceTotals.entries()]
    .map(([source, views]) => ({ source, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  return {
    ok: true,
    configured: true,
    days: rows,
    totals,
    topProducts,
    topSources,
    health,
  };
}
