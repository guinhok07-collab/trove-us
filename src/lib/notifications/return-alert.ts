import { siteUrl } from "@/lib/site";
import { formatUsd } from "@/lib/format";
import { sendTelegramAlert, formatAlertTime } from "@/lib/notifications/telegram";
import type { StoredReturnRequest } from "@/lib/returns/types";

export async function notifyReturnRequest(
  request: StoredReturnRequest,
): Promise<void> {
  const adminUrl = `${siteUrl}/admin`;

  const body = [
    `Motivo: ${request.reasonLabel}`,
    `RMA: ${request.rmaId}`,
    `Pedido: ${request.orderId}`,
    `Cliente: ${request.customerName}`,
    `E-mail: ${request.email}`,
    `Total pago: ${formatUsd(request.orderTotal)}`,
    `Status pedido: ${request.orderStatus ?? "—"}`,
    request.trackingNumber ? `Tracking: ${request.trackingNumber}` : null,
    request.paypalCaptureId ? `PayPal: ${request.paypalCaptureId}` : null,
    request.cjOrderId ? `CJ: ${request.cjOrderId}` : null,
    "",
    "Itens:",
    ...request.itemNames.map((n) => `• ${n}`),
    "",
    "Mensagem do cliente:",
    request.details,
    "",
    request.needsPhotos ? "📷 Aguardando fotos do cliente (48h)." : null,
    `Horário: ${formatAlertTime(request.createdAt)}`,
    "",
    `Abrir painel: ${adminUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  await sendTelegramAlert("return", body, request.reasonLabel);
}
