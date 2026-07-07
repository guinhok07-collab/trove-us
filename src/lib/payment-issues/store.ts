import { Redis } from "@upstash/redis";
import type {
  PaymentIssueStatus,
  StoredPaymentIssue,
} from "./types";

const ISSUE_PREFIX = "trove:payment-issue:";
const ISSUE_INDEX = "trove:payment-issues:index";

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

export function isPaymentIssueStoreConfigured(): boolean {
  return Boolean(getRedisConfig());
}

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  const config = getRedisConfig();
  redisClient = config ? new Redis(config) : null;
  return redisClient;
}

function issueKey(issueId: string) {
  return `${ISSUE_PREFIX}${issueId}`;
}

export function generatePaymentIssueId(): string {
  return `PAY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function savePaymentIssue(issue: StoredPaymentIssue): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    console.warn("[payment-issues] Redis not configured:", issue.issueId);
    return;
  }

  await redis.set(issueKey(issue.issueId), issue);
  await redis.zadd(ISSUE_INDEX, {
    score: new Date(issue.createdAt).getTime(),
    member: issue.issueId,
  });
}

export async function getPaymentIssue(
  issueId: string,
): Promise<StoredPaymentIssue | null> {
  const redis = getRedis();
  if (!redis) return null;
  return (await redis.get<StoredPaymentIssue>(issueKey(issueId))) ?? null;
}

export async function listPaymentIssues(input?: {
  limit?: number;
  status?: PaymentIssueStatus;
}): Promise<StoredPaymentIssue[]> {
  const redis = getRedis();
  if (!redis) return [];

  const limit = input?.limit ?? 50;
  const ids = await redis.zrange(ISSUE_INDEX, 0, limit - 1, { rev: true });
  if (!ids.length) return [];

  const keys = ids.map((id) => issueKey(String(id)));
  const rows = await redis.mget<StoredPaymentIssue[]>(...keys);
  const items = rows.filter((r): r is StoredPaymentIssue => Boolean(r));

  if (input?.status) {
    return items.filter((r) => r.status === input.status);
  }

  return items;
}

export async function updatePaymentIssue(
  issueId: string,
  patch: Partial<Pick<StoredPaymentIssue, "status" | "ownerNote">>,
): Promise<StoredPaymentIssue | null> {
  const existing = await getPaymentIssue(issueId);
  if (!existing) return null;

  const updated: StoredPaymentIssue = {
    ...existing,
    ...patch,
    issueId: existing.issueId,
    updatedAt: new Date().toISOString(),
  };

  await savePaymentIssue(updated);
  return updated;
}

export async function countOpenPaymentIssues(): Promise<number> {
  const open = await listPaymentIssues({ limit: 200, status: "open" });
  return open.length;
}
