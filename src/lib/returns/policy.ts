export const RETURN_WINDOW_DAYS = 30;

export const RETURN_REASONS = [
  {
    id: "damaged_defective",
    label: "Damaged or defective",
    needsPhotos: true,
    sellerPaysReturn: true,
  },
  {
    id: "wrong_item",
    label: "Wrong item received",
    needsPhotos: true,
    sellerPaysReturn: true,
  },
  {
    id: "not_as_described",
    label: "Not as described",
    needsPhotos: true,
    sellerPaysReturn: true,
  },
  {
    id: "missing_parts",
    label: "Missing parts or accessories",
    needsPhotos: true,
    sellerPaysReturn: true,
  },
  {
    id: "changed_mind",
    label: "Changed my mind / no longer needed",
    needsPhotos: false,
    sellerPaysReturn: false,
  },
] as const;

export type ReturnReasonId = (typeof RETURN_REASONS)[number]["id"];

export function getReturnReason(id: string) {
  return RETURN_REASONS.find((r) => r.id === id);
}

export const RETURN_STEPS = [
  "Submit this form with your order number and the email used at checkout.",
  "Wait for our approval email (usually within 1 business day). Do not ship anything until we approve.",
  "If we ask for photos, reply to our email within 48 hours with clear images of the item, packaging, and shipping label.",
  "Ship the approved item back with tracking if we provide a return address (change-of-mind returns: customer pays return shipping).",
  "Refund is issued to your original payment method within 5–7 business days after we approve the return.",
] as const;

export const RETURN_FRAUD_RULES = [
  "Return requests must use the same email address as the original order.",
  "Items must be unused, unworn, and in original packaging with all tags and accessories.",
  "Claims for damage, wrong items, or missing parts require photo proof. Requests without proof may be denied.",
  "Do not file a PayPal or card chargeback while a return is being reviewed — contact us first.",
  "Returns shipped without an approved RMA number may be refused.",
  "Repeated false claims, empty-box returns, or used items sent back may result in denied refunds and blocked future orders.",
  "Refunds are limited to the amount paid for the returned item(s); original shipping is non-refundable on change-of-mind returns.",
] as const;
