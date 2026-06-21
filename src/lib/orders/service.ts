import type { CreateStoreOrderRequest } from "@/lib/cj/types";
import { sendEmail } from "@/lib/email/client";
import { subscribeToMarketing } from "@/lib/marketing/subscribe";
import { notifyNewSale } from "@/lib/notifications/sale-alert";
import {
  confirmationEmail,
  deliveredEmail,
  shippedEmail,
} from "@/lib/email/templates";
import {
  buildTrackingUrl,
  mapCjOrderStatus,
  trackingStatusLabel,
} from "@/lib/orders/tracking";
import { getOrder, getOrderByCjId, saveOrder, updateOrder } from "@/lib/orders/store";
import type { OrderTrackView, StoredOrder } from "@/lib/orders/types";

export function toTrackView(order: StoredOrder): OrderTrackView {
  return {
    orderId: order.orderId,
    status: order.status,
    statusLabel: orderStatusLabel(order.status),
    email: order.email,
    fullName: order.fullName,
    items: order.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      price: i.price,
      image: i.image,
    })),
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
    carrier: order.carrier,
    trackingStatus: order.trackingStatus,
    trackingStatusLabel: trackingStatusLabel(order.trackingStatus),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

function orderStatusLabel(status: StoredOrder["status"]): string {
  switch (status) {
    case "paid":
      return "Order confirmed — preparing to ship";
    case "processing":
      return "Processing at warehouse";
    case "shipped":
      return "Shipped — on the way";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
  }
}

export async function persistPaidOrder(
  order: CreateStoreOrderRequest,
  meta: {
    paypalCaptureId?: string;
    cjOrderId?: string;
    cjStatus?: string;
    fulfillmentMode?: string;
  },
): Promise<StoredOrder> {
  const now = new Date().toISOString();
  const stored: StoredOrder = {
    orderId: order.orderId,
    email: order.email.trim().toLowerCase(),
    fullName: order.fullName,
    phone: order.phone,
    address: order.address,
    address2: order.address2,
    city: order.city,
    state: order.state,
    zip: order.zip,
    items: order.items,
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
    status: meta.cjOrderId ? "processing" : "paid",
    paypalCaptureId: meta.paypalCaptureId,
    cjOrderId: meta.cjOrderId,
    cjStatus: meta.cjStatus,
    confirmationEmailSent: false,
    shippedEmailSent: false,
    createdAt: now,
    updatedAt: now,
  };

  await saveOrder(stored);
  await sendOrderConfirmation(stored.orderId);

  if (order.marketingOptIn) {
    void subscribeToMarketing({
      email: order.email,
      fullName: order.fullName,
      source: "checkout",
    }).catch((err) => {
      console.error("[orders] marketing subscribe failed:", err);
    });
  }

  void notifyNewSale(stored).catch((err) => {
    console.error("[orders] sale notify failed:", err);
  });
  return (await getOrder(stored.orderId)) ?? stored;
}

export async function sendOrderConfirmation(orderId: string): Promise<void> {
  const order = await getOrder(orderId);
  if (!order || order.confirmationEmailSent) return;

  const mail = confirmationEmail(order);
  const result = await sendEmail({ to: order.email, ...mail });
  if (result.ok) {
    await updateOrder(orderId, { confirmationEmailSent: true });
  }
}

export async function applyTrackingUpdate(input: {
  orderId?: string;
  cjOrderId?: string;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  carrier?: string | null;
  trackingStatus?: number;
  cjStatus?: string;
}): Promise<StoredOrder | null> {
  let order: StoredOrder | null = null;
  if (input.orderId) order = await getOrder(input.orderId);
  if (!order && input.cjOrderId) order = await getOrderByCjId(input.cjOrderId);
  if (!order) return null;

  const trackingNumber = input.trackingNumber?.trim() || order.trackingNumber;
  const carrier = input.carrier?.trim() || order.carrier;
  const trackingUrl =
    input.trackingUrl?.trim() ||
    (trackingNumber
      ? buildTrackingUrl(trackingNumber, carrier, order.trackingUrl)
      : order.trackingUrl);

  let status = order.status;
  if (input.trackingStatus === 12 || mapCjOrderStatus(input.cjStatus) === "delivered") {
    status = "delivered";
  } else if (trackingNumber) {
    status = "shipped";
  } else if (input.cjStatus) {
    status = mapCjOrderStatus(input.cjStatus);
  }

  const updated = await updateOrder(order.orderId, {
    trackingNumber,
    trackingUrl,
    carrier,
    trackingStatus: input.trackingStatus ?? order.trackingStatus,
    cjStatus: input.cjStatus ?? order.cjStatus,
    cjOrderId: input.cjOrderId ?? order.cjOrderId,
    status,
  });

  if (!updated) return null;

  if (trackingNumber && !order.shippedEmailSent) {
    const mail = shippedEmail(updated);
    const result = await sendEmail({ to: updated.email, ...mail });
    if (result.ok) {
      await updateOrder(updated.orderId, { shippedEmailSent: true });
    }
  }

  if (status === "delivered" && order.status !== "delivered") {
    const mail = deliveredEmail(updated);
    await sendEmail({ to: updated.email, ...mail });
  }

  return (await getOrder(updated.orderId)) ?? updated;
}

export async function lookupOrder(
  orderId: string,
  email: string,
): Promise<OrderTrackView | null> {
  const order = await getOrder(orderId.trim());
  if (!order) return null;
  if (order.email.toLowerCase() !== email.trim().toLowerCase()) return null;
  return toTrackView(order);
}
