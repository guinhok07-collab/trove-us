import type { StoredOrder } from "@/lib/orders/types";

/** Paid but not sent to CJ — seller must act (wallet, manual CJ pay, etc.). */
export function orderNeedsSellerAction(order: StoredOrder): boolean {
  if (order.ownerResolvedAt) return false;
  if (order.cjOrderId) return false;
  if (order.status === "cancelled" || order.status === "shipped" || order.status === "delivered") {
    return false;
  }
  return order.status === "paid" || Boolean(order.fulfillmentError?.trim());
}

export function pendingActionLabel(order: StoredOrder): string {
  if (!orderNeedsSellerAction(order)) return "";
  if (order.fulfillmentError?.trim()) {
    return "Pendente — CJ falhou";
  }
  return "Pendente — enviar no CJ";
}
