import type { ReturnReasonId } from "./policy";

export type ReturnRequestStatus = "pending" | "approved" | "denied" | "refunded";

export interface StoredReturnRequest {
  rmaId: string;
  orderId: string;
  email: string;
  customerName: string;
  reasonId: ReturnReasonId;
  reasonLabel: string;
  itemNames: string[];
  details: string;
  orderTotal: number;
  paypalCaptureId?: string;
  cjOrderId?: string;
  orderStatus?: string;
  trackingNumber?: string;
  needsPhotos: boolean;
  status: ReturnRequestStatus;
  ownerNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReturnRequestSummary {
  rmaId: string;
  orderId: string;
  customerName: string;
  email: string;
  reasonLabel: string;
  orderTotal: number;
  status: ReturnRequestStatus;
  needsPhotos: boolean;
  createdAt: string;
}
