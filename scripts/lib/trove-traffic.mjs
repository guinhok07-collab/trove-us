/**
 * Tráfego real do site (mesmo Redis do trove-us.com).
 * Funil: page_view → view_product → add_to_cart → initiate_checkout → purchase
 */
import { Redis } from "@upstash/redis";

const DAY_INDEX = "trove:traffic:days";

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

function dayHashKey(date) {
  return `trove:traffic:day:${date}`;
}

function readCount(hash, field) {
  const v = hash?.[field];
  return typeof v === "number" ? v : Number(v) || 0;
}

/**
 * @param {number} days
 */
export async function getSiteTrafficReport(days = 14) {
  const redis = getRedis();
  if (!redis) {
    return {
      configured: false,
      totals: {
        pageView: 0,
        viewProduct: 0,
        addToCart: 0,
        viewCart: 0,
        initiateCheckout: 0,
        paymentStarted: 0,
        purchase: 0,
      },
      today: null,
      topProducts: [],
      topSources: [],
      days: [],
      funnelNote: "Redis de tráfego não configurado no .env.local",
    };
  }

  const limit = Math.min(Math.max(days, 1), 30);
  let dayList = await redis.zrange(DAY_INDEX, -limit, -1);
  if (!dayList?.length) {
    dayList = Array.from({ length: limit }, (_, i) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - (limit - 1 - i));
      return d.toISOString().slice(0, 10);
    });
  }

  const rows = [];
  const productTotals = new Map();
  const sourceTotals = new Map();

  for (const date of dayList) {
    const hash = (await redis.hgetall(dayHashKey(date))) ?? {};
    const row = {
      date,
      pageView: readCount(hash, "page_view"),
      viewProduct: readCount(hash, "view_product"),
      addToCart: readCount(hash, "add_to_cart"),
      viewCart: readCount(hash, "view_cart"),
      initiateCheckout: readCount(hash, "initiate_checkout"),
      paymentStarted: readCount(hash, "payment_started"),
      purchase: readCount(hash, "purchase"),
    };
    rows.push(row);

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

  const todayKey = new Date().toISOString().slice(0, 10);
  const today = rows.find((r) => r.date === todayKey) ?? null;

  const topProducts = [...productTotals.entries()]
    .map(([slug, views]) => ({ slug, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  const topSources = [...sourceTotals.entries()]
    .map(([source, views]) => ({ source, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  const views = totals.pageView || 1;
  const funnel = {
    viewToCartPct: Math.round((totals.addToCart / views) * 1000) / 10,
    cartToCheckoutPct: totals.addToCart
      ? Math.round((totals.initiateCheckout / totals.addToCart) * 1000) / 10
      : 0,
    checkoutToPaymentPct: totals.initiateCheckout
      ? Math.round((totals.paymentStarted / totals.initiateCheckout) * 1000) / 10
      : 0,
    paymentToPurchasePct: totals.paymentStarted
      ? Math.round((totals.purchase / totals.paymentStarted) * 1000) / 10
      : totals.initiateCheckout
        ? Math.round((totals.purchase / totals.initiateCheckout) * 1000) / 10
        : 0,
  };

  let bottleneck = "topo (tráfego)";
  if (totals.pageView > 0 && totals.addToCart === 0) bottleneck = "produto → carrinho";
  else if (totals.addToCart > 0 && totals.viewCart === 0 && totals.initiateCheckout === 0)
    bottleneck = "carrinho → checkout";
  else if (totals.initiateCheckout > 0 && totals.paymentStarted === 0)
    bottleneck = "checkout → formulário/pagamento";
  else if (totals.paymentStarted > 0 && totals.purchase === 0)
    bottleneck = "pagamento → confirmação (1ª venda)";
  else if (totals.initiateCheckout > 0 && totals.purchase === 0)
    bottleneck = "checkout → pagamento (1ª venda)";
  else if (totals.purchase > 0) bottleneck = "escalar o que já converte";

  return {
    configured: true,
    periodDays: limit,
    totals,
    today,
    topProducts,
    topSources,
    funnel,
    bottleneck,
    goal: {
      primary: "Conseguir pelo menos 1 venda (purchase)",
      next: "Repetir e escalar o que converteu",
    },
    recentDays: rows.slice(-7),
  };
}

/** Texto curto para findings da Aria */
export function trafficFindingsLine(report) {
  if (!report?.configured) return "Tráfego do site: Redis não ligado no painel.";
  const t = report.totals;
  const today = report.today;
  const todayBit = today
    ? `Hoje: ${today.pageView} visitas, ${today.viewProduct} produtos, ${today.addToCart} carrinho, ${today.initiateCheckout} checkout, ${today.paymentStarted} pagamento, ${today.purchase} compra(s).`
    : "";
  return (
    `Site (${report.periodDays}d): ${t.pageView} visitas · ${t.viewProduct} ver produto · ${t.addToCart} carrinho · ${t.initiateCheckout} checkout · ${t.paymentStarted} pagamento · ${t.purchase} compra(s). ` +
    `Gargalo: ${report.bottleneck}. ${todayBit} Meta: 1ª venda.`
  );
}
