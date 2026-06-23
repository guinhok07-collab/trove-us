import type { CreateStoreOrderItem } from "@/lib/cj/types";

export type OrderStatus =
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface StoredOrder {
  orderId: string;
  email: string;
  fullName: string;
  phone: string;
  address: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  items: CreateStoreOrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  status: OrderStatus;
  paypalCaptureId?: string;
  cjOrderId?: string;
  cjStatus?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  trackingStatus?: number;
  confirmationEmailSent: boolean;
  shippedEmailSent: boolean;
  /** Set when CJ auto-fulfill failed — seller must pay/ship manually. */
  fulfillmentError?: string;
  /** Seller marked the pending order as handled in /admin. */
  ownerResolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderTrackView {
  orderId: string;
  status: OrderStatus;
  statusLabel: string;
  email: string;
  fullName: string;
  items: { name: string; quantity: number; price: number; image: string }[];
  subtotal: number;
  shipping: number;
  total: number;
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  trackingStatus?: number;
  trackingStatusLabel?: string;
  createdAt: string;
  updatedAt: string;
}
