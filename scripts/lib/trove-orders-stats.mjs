/**
 * Vendas por produto (slug) — lê pedidos do Redis (mesmo do site).
 */
import { Redis } from "@upstash/redis";

const ORDER_PREFIX = "trove:order:";
const ORDER_INDEX = "trove:orders:index";

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

const PAID_STATUSES = new Set(["paid", "processing", "shipped", "delivered"]);

/**
 * @returns {Promise<{ configured: boolean, bySlug: Record<string, { orders: number, units: number, revenue: number }>, totalOrders: number }>}
 */
export async function getSalesByProductSlug({ limit = 200 } = {}) {
  const redis = getRedis();
  if (!redis) {
    return { configured: false, bySlug: {}, totalOrders: 0 };
  }

  const ids = await redis.zrange(ORDER_INDEX, 0, limit - 1, { rev: true });
  const bySlug = {};
  let totalOrders = 0;

  for (const id of ids) {
    const order = await redis.get(`${ORDER_PREFIX}${id}`);
    if (!order || !PAID_STATUSES.has(order.status)) continue;
    totalOrders += 1;
    for (const item of order.items ?? []) {
      const slug = item.slug?.trim();
      if (!slug) continue;
      if (!bySlug[slug]) bySlug[slug] = { orders: 0, units: 0, revenue: 0 };
      bySlug[slug].orders += 1;
      bySlug[slug].units += Number(item.quantity ?? 1);
      bySlug[slug].revenue += Number(item.price ?? 0) * Number(item.quantity ?? 1);
    }
  }

  return { configured: true, bySlug, totalOrders };
}
