import { Redis } from "@upstash/redis";
import type { StoredOrder } from "./types";

const ORDER_PREFIX = "trove:order:";
const CJ_INDEX_PREFIX = "trove:order:cj:";
const ORDER_INDEX = "trove:orders:index";

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

export function isOrderStoreConfigured(): boolean {
  return Boolean(getRedisConfig());
}

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  const config = getRedisConfig();
  redisClient = config ? new Redis(config) : null;
  return redisClient;
}

function orderKey(orderId: string) {
  return `${ORDER_PREFIX}${orderId}`;
}

function cjKey(cjOrderId: string) {
  return `${CJ_INDEX_PREFIX}${cjOrderId}`;
}

export async function saveOrder(order: StoredOrder): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    console.warn("[orders] Redis not configured — order not persisted:", order.orderId);
    return;
  }

  const existing = await redis.get<StoredOrder>(orderKey(order.orderId));

  await redis.set(orderKey(order.orderId), order);
  if (order.cjOrderId) {
    await redis.set(cjKey(order.cjOrderId), order.orderId);
  }

  if (!existing) {
    await redis.zadd(ORDER_INDEX, {
      score: new Date(order.createdAt).getTime(),
      member: order.orderId,
    });
  }
}

export async function listRecentOrders(limit = 40): Promise<StoredOrder[]> {
  const redis = getRedis();
  if (!redis) return [];

  const ids = await redis.zrange(ORDER_INDEX, 0, limit - 1, { rev: true });
  if (!ids.length) return [];

  const keys = ids.map((id) => orderKey(String(id)));
  const rows = await redis.mget<StoredOrder[]>(...keys);
  return rows.filter((o): o is StoredOrder => Boolean(o));
}

export async function getOrder(orderId: string): Promise<StoredOrder | null> {
  const redis = getRedis();
  if (!redis) return null;
  return (await redis.get<StoredOrder>(orderKey(orderId))) ?? null;
}

export async function getOrderByCjId(cjOrderId: string): Promise<StoredOrder | null> {
  const redis = getRedis();
  if (!redis) return null;
  const orderId = await redis.get<string>(cjKey(cjOrderId));
  if (!orderId) return null;
  return getOrder(orderId);
}

export async function updateOrder(
  orderId: string,
  patch: Partial<StoredOrder>,
): Promise<StoredOrder | null> {
  const existing = await getOrder(orderId);
  if (!existing) return null;

  const updated: StoredOrder = {
    ...existing,
    ...patch,
    orderId: existing.orderId,
    updatedAt: new Date().toISOString(),
  };

  await saveOrder(updated);
  return updated;
}
