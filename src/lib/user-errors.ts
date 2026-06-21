import { brand } from "@/data/brand";

const SUPPORT = brand.supportEmail;

type ErrorContext = "checkout" | "payment" | "track" | "order";

function looksTechnical(text: string): boolean {
  if (text.length > 140) return true;
  if (/[\[{]/.test(text)) return true;
  if (
    /\b(401|500|502|503|UNPROCESSABLE|PAYEE_|debug_id|CJ API|cjVid|variant ID)\b/i.test(
      text,
    )
  ) {
    return true;
  }
  return false;
}

/** Turn API/technical errors into plain language for shoppers. */
export function toUserErrorMessage(
  raw: unknown,
  context: ErrorContext = "checkout",
): string {
  const text =
    typeof raw === "string"
      ? raw
      : raw instanceof Error
        ? raw.message
        : "";

  const lower = text.toLowerCase();

  if (lower.includes("payee_account_restricted") || lower.includes("restricted")) {
    return "Payments are temporarily unavailable. Please try again soon or email us for help.";
  }

  if (
    lower.includes("semantically incorrect") ||
    lower.includes("business validation")
  ) {
    return "We couldn't start your payment. Please try again or use another card or PayPal account.";
  }

  if (lower.includes("cancelled") || lower.includes("canceled")) {
    return "Payment was cancelled. Your order was not placed.";
  }

  if (
    lower.includes("paypal") ||
    lower.includes("capture failed") ||
    lower.includes("create order failed") ||
    lower.includes("authentication failed")
  ) {
    return "Your payment couldn't be completed. You were not charged — please try again.";
  }

  if (lower.includes("missing cj variant") || lower.includes("cjvId")) {
    return "An item in your cart is temporarily unavailable. Please contact support before ordering.";
  }

  if (
    lower.includes("no cj shipping") ||
    lower.includes("shipping option") ||
    lower.includes("cj api") ||
    lower.includes("cj error")
  ) {
    return "We couldn't arrange shipping to this address. Check your ZIP code or contact support.";
  }

  if (lower.includes("phone number is required")) {
    return "Please add a phone number — we need it for delivery.";
  }

  if (lower.includes("invalid payload") || lower.includes("invalid order")) {
    return "Please complete all required fields and try again.";
  }

  if (
    lower.includes("unknown product") ||
    lower.includes("out of stock") ||
    lower.includes("invalid quantity") ||
    lower.includes("cart is empty") ||
    lower.includes("amount does not match") ||
    lower.includes("does not match this order")
  ) {
    return "Your cart changed or is invalid. Refresh the page and try again.";
  }

  if (lower.includes("order not found")) {
    return "We couldn't find that order. Double-check your order number and email.";
  }

  if (lower.includes("order tracking is not configured")) {
    return "Tracking is temporarily unavailable. Please try again later.";
  }

  if (text && !looksTechnical(text)) {
    return text;
  }

  if (context === "payment") {
    return `Your payment couldn't be completed. Please try again or contact ${SUPPORT}.`;
  }

  if (context === "track") {
    return "We couldn't find that order. Check your order number and email.";
  }

  if (context === "order") {
    return `We couldn't finish placing your order. Please try again or contact ${SUPPORT}.`;
  }

  return `Something went wrong. Please try again or contact ${SUPPORT}.`;
}

/** Friendly status note after a successful payment (hides warehouse/API details). */
export function toUserOrderNote(raw?: string): string | undefined {
  if (!raw?.trim()) return undefined;

  const lower = raw.toLowerCase();

  if (lower.includes("order created in cj") || lower.includes("order sent to cj")) {
    return "Your order is confirmed. We'll email you when it ships.";
  }

  if (lower.includes("pay in cj dashboard")) {
    return "Your order is confirmed. We're preparing it for shipment.";
  }

  if (
    lower.includes("cj fulfillment failed") ||
    lower.includes("missing cj") ||
    lower.includes("shipping option") ||
    lower.includes("cj api")
  ) {
    return "Your order is confirmed. Our team is processing it — watch your inbox for updates.";
  }

  if (looksTechnical(raw)) {
    return "Your order is confirmed. We'll email you shipping updates soon.";
  }

  return raw;
}
