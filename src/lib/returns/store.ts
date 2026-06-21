import { Redis } from "@upstash/redis";
import type { ReturnRequestStatus, StoredReturnRequest } from "./types";

const RETURN_PREFIX = "trove:return:";
const RETURN_INDEX = "trove:returns:index";

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

export function isReturnStoreConfigured(): boolean {
  return Boolean(getRedisConfig());
}

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  const config = getRedisConfig();
  redisClient = config ? new Redis(config) : null;
  return redisClient;
}

function returnKey(rmaId: string) {
  return `${RETURN_PREFIX}${rmaId}`;
}

export async function saveReturnRequest(
  request: StoredReturnRequest,
): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    console.warn("[returns] Redis not configured — return not persisted:", request.rmaId);
    return;
  }

  await redis.set(returnKey(request.rmaId), request);
  await redis.zadd(RETURN_INDEX, {
    score: new Date(request.createdAt).getTime(),
    member: request.rmaId,
  });
}

export async function getReturnRequest(
  rmaId: string,
): Promise<StoredReturnRequest | null> {
  const redis = getRedis();
  if (!redis) return null;
  return (await redis.get<StoredReturnRequest>(returnKey(rmaId))) ?? null;
}

export async function listReturnRequests(input?: {
  limit?: number;
  status?: ReturnRequestStatus;
}): Promise<StoredReturnRequest[]> {
  const redis = getRedis();
  if (!redis) return [];

  const limit = input?.limit ?? 50;
  const ids = await redis.zrange(RETURN_INDEX, 0, limit - 1, { rev: true });
  if (!ids.length) return [];

  const keys = ids.map((id) => returnKey(String(id)));
  const rows = await redis.mget<StoredReturnRequest[]>(...keys);
  const items = rows.filter((r): r is StoredReturnRequest => Boolean(r));

  if (input?.status) {
    return items.filter((r) => r.status === input.status);
  }

  return items;
}

export async function updateReturnRequest(
  rmaId: string,
  patch: Partial<Pick<StoredReturnRequest, "status" | "ownerNote">>,
): Promise<StoredReturnRequest | null> {
  const existing = await getReturnRequest(rmaId);
  if (!existing) return null;

  const updated: StoredReturnRequest = {
    ...existing,
    ...patch,
    rmaId: existing.rmaId,
    updatedAt: new Date().toISOString(),
  };

  await saveReturnRequest(updated);
  return updated;
}

export async function countPendingReturns(): Promise<number> {
  const pending = await listReturnRequests({ limit: 200, status: "pending" });
  return pending.length;
}
