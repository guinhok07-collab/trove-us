import { Redis } from "@upstash/redis";
import type { MarketingSubscriber } from "./types";

const CONTACT_PREFIX = "trove:marketing:contact:";
const INDEX_KEY = "trove:marketing:index";

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

export function isMarketingStoreConfigured(): boolean {
  return Boolean(getRedisConfig());
}

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  const config = getRedisConfig();
  redisClient = config ? new Redis(config) : null;
  return redisClient;
}

function contactKey(email: string) {
  return `${CONTACT_PREFIX}${email.trim().toLowerCase()}`;
}

export function normalizeMarketingEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getSubscriber(
  email: string,
): Promise<MarketingSubscriber | null> {
  const redis = getRedis();
  if (!redis) return null;
  return (await redis.get<MarketingSubscriber>(contactKey(email))) ?? null;
}

export async function saveSubscriber(
  subscriber: MarketingSubscriber,
): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    console.warn("[marketing] Redis not configured — contact not saved:", subscriber.email);
    return;
  }

  const existing = await getSubscriber(subscriber.email);
  await redis.set(contactKey(subscriber.email), subscriber);

  if (!existing) {
    await redis.zadd(INDEX_KEY, {
      score: new Date(subscriber.subscribedAt).getTime(),
      member: subscriber.email,
    });
  }
}

export async function listSubscribers(limit = 500): Promise<MarketingSubscriber[]> {
  const redis = getRedis();
  if (!redis) return [];

  const emails = await redis.zrange(INDEX_KEY, 0, limit - 1, { rev: true });
  if (!emails.length) return [];

  const keys = emails.map((email) => contactKey(String(email)));
  const rows = await redis.mget<MarketingSubscriber[]>(...keys);
  return rows.filter((row): row is MarketingSubscriber => Boolean(row));
}
