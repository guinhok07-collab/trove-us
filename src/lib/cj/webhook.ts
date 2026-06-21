import { createHmac, timingSafeEqual } from "crypto";
import { applyTrackingUpdate } from "@/lib/orders/service";

export interface CjWebhookPayload {
  messageId?: string;
  type?: string;
  messageType?: string;
  params?: Record<string, unknown>;
}

function isProductionRuntime(): boolean {
  return (
    process.env.VERCEL_ENV === "production" ||
    (process.env.NODE_ENV === "production" && !process.env.VERCEL_ENV)
  );
}

export function verifyCjWebhookSignature(
  rawBody: string,
  signHeader: string | null,
): boolean {
  const openId = process.env.CJ_OPEN_ID?.trim();

  if (isProductionRuntime()) {
    if (!openId || !signHeader) return false;
  } else if (!openId || !signHeader) {
    // Local/preview: allow CJ URL validation before CJ_OPEN_ID is configured.
    return true;
  }

  const expected = createHmac("sha256", openId)
    .update(rawBody)
    .digest("base64");

  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(signHeader);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

export async function handleCjWebhookPayload(payload: CjWebhookPayload): Promise<void> {
  const type = (payload.type ?? "").toUpperCase();
  const params = payload.params ?? {};

  if (type === "ORDER") {
    const orderNumber = str(params.orderNumber) ?? str(params.orderNum);
    const cjOrderId = str(params.cjOrderId);
    const trackNumber = str(params.trackNumber);
    const trackingUrl = str(params.trackingUrl);
    const carrier = str(params.trackingProvider) ?? str(params.logisticName);
    const cjStatus = str(params.orderStatus);

    if (orderNumber || cjOrderId || trackNumber) {
      await applyTrackingUpdate({
        orderId: orderNumber,
        cjOrderId,
        trackingNumber: trackNumber,
        trackingUrl,
        carrier,
        cjStatus,
      });
    }
    return;
  }

  if (type === "LOGISTIC") {
    const cjOrderId = str(params.orderId);
    const trackingNumber = str(params.trackingNumber);
    const trackingUrl = str(params.trackingUrl);
    const carrier = str(params.trackingProvider) ?? str(params.logisticName);
    const trackingStatus = num(params.trackingStatus);
    const storeOrderNumbers = Array.isArray(params.storeOrderNumbers)
      ? params.storeOrderNumbers
      : [];
    const storeOrderId = storeOrderNumbers
      .map((x) => str(x))
      .find(Boolean);

    await applyTrackingUpdate({
      orderId: storeOrderId,
      cjOrderId,
      trackingNumber,
      trackingUrl,
      carrier,
      trackingStatus,
    });
  }
}
