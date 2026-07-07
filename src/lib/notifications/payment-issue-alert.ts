import { formatUsd } from "@/lib/format";
import {
  PAYMENT_ISSUE_SOURCE_LABEL,
  type StoredPaymentIssue,
} from "@/lib/payment-issues/types";
import { formatAlertTime, sendTelegramAlert } from "./telegram";

export async function notifyPaymentIssue(
  issue: StoredPaymentIssue,
): Promise<boolean> {
  const lines = [
    `ID: ${issue.issueId}`,
    `Fonte: ${PAYMENT_ISSUE_SOURCE_LABEL[issue.source]}`,
    `Nome: ${issue.fullName || "—"}`,
    `Telefone: ${issue.phone || "—"}`,
    `E-mail: ${issue.email || "—"}`,
    `Problema: ${issue.problem}`,
  ];

  if (issue.technicalDetail) {
    lines.push(`Detalhe técnico: ${issue.technicalDetail.slice(0, 400)}`);
  }
  if (issue.orderId) lines.push(`Pedido: ${issue.orderId}`);
  if (issue.cartTotal != null) lines.push(`Total: ${formatUsd(issue.cartTotal)}`);
  if (issue.path) lines.push(`Página: ${issue.path}`);

  lines.push(`Horário: ${formatAlertTime(issue.createdAt)}`);

  return sendTelegramAlert(
    "payment_issue",
    lines.join("\n"),
    issue.fullName || issue.email || issue.issueId,
  );
}
