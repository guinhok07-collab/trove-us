export type PaymentIssueSource =
  | "customer"
  | "auto_create"
  | "auto_capture"
  | "auto_client";

export type PaymentIssueStatus = "open" | "contacted" | "resolved";

export interface StoredPaymentIssue {
  issueId: string;
  source: PaymentIssueSource;
  status: PaymentIssueStatus;
  fullName: string;
  email: string;
  phone: string;
  problem: string;
  technicalDetail?: string;
  orderId?: string;
  cartTotal?: number;
  path?: string;
  createdAt: string;
  updatedAt: string;
  ownerNote?: string;
}

export const PAYMENT_ISSUE_SOURCE_LABEL: Record<PaymentIssueSource, string> = {
  customer: "Cliente reportou",
  auto_create: "Erro ao iniciar pagamento",
  auto_capture: "Erro ao confirmar pagamento",
  auto_client: "Erro no checkout (detectado)",
};

export const PAYMENT_ISSUE_STATUS_LABEL: Record<PaymentIssueStatus, string> = {
  open: "Aberto",
  contacted: "Contatado",
  resolved: "Resolvido",
};
