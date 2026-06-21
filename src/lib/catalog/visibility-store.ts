import { Redis } from "@upstash/redis";
import type { VisibilityOverride } from "./visibility";

const VISIBILITY_KEY = "trove:catalog:visibility";

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

export function isVisibilityStoreConfigured(): boolean {
  return Boolean(getRedisConfig());
}

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  const config = getRedisConfig();
  redisClient = config ? new Redis(config) : null;
  return redisClient;
}

export async function getVisibilityOverrides(): Promise<VisibilityOverride> {
  const redis = getRedis();
  if (!redis) return {};
  const raw = await redis.get<VisibilityOverride>(VISIBILITY_KEY);
  return raw && typeof raw === "object" ? raw : {};
}

export async function setProductVisibility(
  slug: string,
  visible: boolean,
): Promise<VisibilityOverride> {
  const redis = getRedis();
  const current = await getVisibilityOverrides();
  const next = { ...current, [slug]: visible };
  if (redis) {
    await redis.set(VISIBILITY_KEY, next);
  }
  return next;
}

export async function setVisibilityOverrides(
  overrides: VisibilityOverride,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(VISIBILITY_KEY, overrides);
}
