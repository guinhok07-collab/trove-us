import { notifyPaymentIssue } from "@/lib/notifications/payment-issue-alert";
import {
  generatePaymentIssueId,
  savePaymentIssue,
} from "./store";
import type { PaymentIssueSource, StoredPaymentIssue } from "./types";

export interface RecordPaymentIssueInput {
  source: PaymentIssueSource;
  fullName?: string;
  email?: string;
  phone?: string;
  problem: string;
  technicalDetail?: string;
  orderId?: string;
  cartTotal?: number;
  path?: string;
  notify?: boolean;
}

export async function recordPaymentIssue(
  input: RecordPaymentIssueInput,
): Promise<StoredPaymentIssue> {
  const now = new Date().toISOString();
  const issue: StoredPaymentIssue = {
    issueId: generatePaymentIssueId(),
    source: input.source,
    status: "open",
    fullName: input.fullName?.trim() || "Visitante",
    email: input.email?.trim().toLowerCase() || "",
    phone: input.phone?.trim() || "",
    problem: input.problem.trim().slice(0, 2000),
    technicalDetail: input.technicalDetail?.trim().slice(0, 2000),
    orderId: input.orderId?.trim(),
    cartTotal: input.cartTotal,
    path: input.path?.slice(0, 200),
    createdAt: now,
    updatedAt: now,
  };

  await savePaymentIssue(issue);

  if (input.notify !== false) {
    void notifyPaymentIssue(issue).catch((err) => {
      console.error("[payment-issues] telegram failed:", err);
    });
  }

  return issue;
}
