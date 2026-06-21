import type { StoredOrder } from "@/lib/orders/types";
import { RETURN_WINDOW_DAYS } from "./policy";

export interface ReturnEligibility {
  eligible: boolean;
  message: string;
  deadline?: string;
  daysRemaining?: number;
}

function addDays(iso: string, days: number): Date {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function returnAnchorDate(order: StoredOrder): Date | null {
  if (order.status === "delivered" || order.status === "shipped") {
    return new Date(order.updatedAt);
  }
  return null;
}

export function checkReturnEligibility(order: StoredOrder): ReturnEligibility {
  if (order.status === "cancelled") {
    return {
      eligible: false,
      message: "This order was cancelled and is not eligible for return.",
    };
  }

  if (order.status === "paid" || order.status === "processing") {
    return {
      eligible: false,
      message:
        "This order has not shipped yet. If you need to cancel before it ships, email us immediately with your order number.",
    };
  }

  const anchor = returnAnchorDate(order);
  if (!anchor) {
    return {
      eligible: false,
      message: "This order is not eligible for return yet.",
    };
  }

  const deadline = addDays(anchor.toISOString(), RETURN_WINDOW_DAYS);
  const now = new Date();

  if (now > deadline) {
    return {
      eligible: false,
      message: `The ${RETURN_WINDOW_DAYS}-day return window for this order has expired.`,
      deadline: deadline.toISOString(),
      daysRemaining: 0,
    };
  }

  const msLeft = deadline.getTime() - now.getTime();
  const daysRemaining = Math.max(1, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

  return {
    eligible: true,
    message: "This order is within the return window.",
    deadline: deadline.toISOString(),
    daysRemaining,
  };
}

export function generateRmaId(orderId: string): string {
  const suffix = Date.now().toString(36).toUpperCase().slice(-6);
  const core = orderId.replace(/[^A-Z0-9]/gi, "").slice(-8).toUpperCase();
  return `RMA-${core}-${suffix}`;
}
