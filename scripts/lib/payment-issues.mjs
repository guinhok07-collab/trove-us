/**
 * Problemas de pagamento no checkout (Redis — mesmo store do site).
 */
import { Redis } from "@upstash/redis";

const ISSUE_PREFIX = "trove:payment-issue:";
const ISSUE_INDEX = "trove:payment-issues:index";

function getRedis() {
  const url =
    process.env.KV_REST_API_URL?.trim() ||
    process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token =
    process.env.KV_REST_API_TOKEN?.trim() ||
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function issueKey(id) {
  return `${ISSUE_PREFIX}${id}`;
}

export async function getPaymentIssuesSummary() {
  const redis = getRedis();
  if (!redis) return { configured: false, openCount: 0, recent: [] };

  const ids = await redis.zrange(ISSUE_INDEX, 0, 99, { rev: true });
  if (!ids?.length) return { configured: true, openCount: 0, recent: [] };

  const keys = ids.map((id) => issueKey(String(id)));
  const rows = (await redis.mget(...keys)).filter(Boolean);
  const open = rows.filter((i) => i.status === "open");

  return {
    configured: true,
    openCount: open.length,
    recent: open.slice(0, 6).map((i) => ({
      issueId: i.issueId,
      fullName: i.fullName,
      phone: i.phone,
      email: i.email,
      problem: i.problem,
      source: i.source,
      createdAt: i.createdAt,
    })),
  };
}
