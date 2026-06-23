import { brand } from "@/data/brand";
import { formatUsd } from "@/lib/format";
import { orderNeedsSellerAction } from "@/lib/orders/action";
import { siteUrl } from "@/lib/site";
import type { StoredOrder } from "@/lib/orders/types";
import {
  formatAlertTime,
  isTelegramConfigured,
  sendTelegramAlert,
} from "@/lib/notifications/telegram";

function buildSaleMessage(order: StoredOrder): string {
  const lines = order.items.map(
    (item) => `• ${item.name} × ${item.quantity} — ${formatUsd(item.price * item.quantity)}`,
  );

  const adminUrl = `${siteUrl}/admin`;
  const trackUrl = `${siteUrl}/track?order=${encodeURIComponent(order.orderId)}&email=${encodeURIComponent(order.email)}`;
  const pending = orderNeedsSellerAction(order);

  const statusBlock = pending
    ? [
        "",
        "⚠️ CLIENTE PAGOU — PEDIDO NÃO FOI PRO CJ",
        order.fulfillmentError
          ? `Motivo: ${order.fulfillmentError}`
          : "Verifique saldo na wallet CJ ou envie manual no painel CJ.",
        "Abra o admin → Pedidos → venda pendente.",
      ]
    : order.cjOrderId
      ? ["", "✅ CJ: pedido enviado automaticamente.", `ID CJ: ${order.cjOrderId}`]
      : ["", "✅ Pagamento confirmado — preparando envio."];

  return [
    `Pedido: ${order.orderId}`,
    `Cliente: ${order.fullName}`,
    `E-mail: ${order.email}`,
    `Total: ${formatUsd(order.total)}`,
    `Horário: ${formatAlertTime(order.createdAt)}`,
    ...statusBlock,
    "",
    "Produtos:",
    ...lines,
    "",
    `Painel: ${adminUrl}`,
    `Rastrear: ${trackUrl}`,
  ].join("\n");
}

/** Optional: CallMeBot WhatsApp (https://www.callmebot.com/blog/free-api-whatsapp-messages/) */
async function sendWhatsAppCallMeBot(text: string): Promise<boolean> {
  const phone = process.env.WHATSAPP_NOTIFY_PHONE?.trim();
  const apiKey = process.env.WHATSAPP_CALLMEBOT_APIKEY?.trim();
  if (!phone || !apiKey) return false;

  const url = new URL("https://api.callmebot.com/whatsapp.php");
  url.searchParams.set("phone", phone);
  url.searchParams.set("text", text);
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    console.error("[notify/whatsapp]", res.status, await res.text());
    return false;
  }

  return true;
}

export function isSaleNotifyConfigured(): boolean {
  return (
    isTelegramConfigured() ||
    Boolean(
      process.env.WHATSAPP_NOTIFY_PHONE?.trim() &&
        process.env.WHATSAPP_CALLMEBOT_APIKEY?.trim(),
    )
  );
}

export async function notifyNewSale(order: StoredOrder): Promise<void> {
  if (!isSaleNotifyConfigured()) return;

  const message = buildSaleMessage(order);
  const pending = orderNeedsSellerAction(order);
  const kind = pending ? "pending_sale" : "sale";

  await Promise.all([
    sendTelegramAlert(kind, message, brand.name),
    sendWhatsAppCallMeBot(
      `${pending ? "⚠️ VENDA PENDENTE" : "🛒 Nova venda"} — ${brand.name}\n\n${message}`,
    ),
  ]);
}
