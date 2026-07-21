"use client";

import {
  FUNDING,
  PayPalButtons,
  PayPalMessages,
  PayPalScriptProvider,
  usePayPalScriptReducer,
} from "@paypal/react-paypal-js";
import type { CreateStoreOrderRequest } from "@/lib/cj/types";
import { toUserErrorMessage } from "@/lib/user-errors";
import { recordTrafficEvent } from "@/lib/traffic/client";
import { reportPaymentErrorAuto } from "@/components/payment-help-form";
import { PaymentButtonShell } from "@/components/payment-button-shell";

interface PayPalCheckoutProps {
  clientId: string;
  mode: string;
  total: number;
  orderPayload: CreateStoreOrderRequest | null;
  locked?: boolean;
  disabled?: boolean;
  onSuccess: (result: {
    orderId: string;
    paypalCaptureId?: string;
    cjOrderId?: string;
    message?: string;
  }) => void;
  onError: (message: string) => void;
}

type FundingSource =
  | typeof FUNDING.CARD
  | typeof FUNDING.PAYPAL
  | typeof FUNDING.PAYLATER;

function formatPayPalSdkError(err: unknown): string {
  if (!err) return "PayPal SDK error";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null) {
    const o = err as { message?: string; name?: string; details?: unknown };
    if (o.message) return o.message;
    try {
      return JSON.stringify(err);
    } catch {
      return "PayPal SDK error";
    }
  }
  return String(err);
}

function isTransientNetworkError(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("load failed") ||
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed") ||
    lower.includes("the internet connection appears to be offline") ||
    lower.includes("err_internet_disconnected")
  );
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = 1,
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, init);
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (!isTransientNetworkError(msg) || attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, 800));
    }
  }
  throw lastErr;
}

export function PayPalCheckout({
  clientId,
  mode,
  total,
  orderPayload,
  locked = false,
  disabled,
  onSuccess,
  onError,
}: PayPalCheckoutProps) {
  const live = mode === "live";
  const showPayLater = total >= 30;
  const showDirectCard =
    !live || process.env.NEXT_PUBLIC_PAYPAL_ADVANCED_CARD === "1";

  const scriptOptions = {
    clientId,
    currency: "USD",
    intent: "capture" as const,
    components: live ? "buttons,messages" : "buttons",
    locale: "en_US",
    ...(showDirectCard
      ? { enableFunding: showPayLater ? "card,paylater" : "card" }
      : showPayLater
        ? { enableFunding: "paylater" }
        : {}),
    ...(live ? {} : { buyerCountry: "US" }),
  };

  const fundingButtons: Array<{
    source: FundingSource;
    variant: "paypal" | "card" | "paylater";
  }> = [{ source: FUNDING.PAYPAL, variant: "paypal" }];

  if (showDirectCard) {
    fundingButtons.push({
      source: FUNDING.CARD,
      variant: "card",
    });
  }

  if (showPayLater) {
    fundingButtons.push({
      source: FUNDING.PAYLATER,
      variant: "paylater",
    });
  }

  return (
    <PayPalScriptProvider options={scriptOptions}>
      <div className={disabled ? "pointer-events-none opacity-50" : ""}>
        {live && showPayLater && !locked && orderPayload ? (
          <div className="mb-3 min-h-[24px]">
            <PayPalMessages
              amount={Math.round(total * 100) / 100}
              placement="payment"
              style={{ layout: "text", logo: { type: "primary" } }}
            />
          </div>
        ) : null}

        <PayPalCheckoutButtons
          fundingButtons={fundingButtons}
          locked={locked}
          disabled={disabled}
          orderPayload={orderPayload}
          onSuccess={onSuccess}
          onError={onError}
        />
      </div>
    </PayPalScriptProvider>
  );
}

function PayPalCheckoutButtons({
  fundingButtons,
  locked,
  disabled,
  orderPayload,
  onSuccess,
  onError,
}: {
  fundingButtons: Array<{
    source: FundingSource;
    variant: "paypal" | "card" | "paylater";
  }>;
  locked: boolean;
  disabled?: boolean;
  orderPayload: CreateStoreOrderRequest | null;
  onSuccess: PayPalCheckoutProps["onSuccess"];
  onError: PayPalCheckoutProps["onError"];
}) {
  const [{ isResolved, isRejected }] = usePayPalScriptReducer();
  const ready = !locked && Boolean(orderPayload) && isResolved;

  const reportFailure = (problem: string, technicalDetail?: string) => {
    if (!orderPayload) return;
    if (isTransientNetworkError(technicalDetail || problem)) return;
    void reportPaymentErrorAuto({
      problem,
      fullName: orderPayload.fullName,
      email: orderPayload.email,
      phone: orderPayload.phone,
      orderId: orderPayload.orderId,
      cartTotal: orderPayload.total,
      technicalDetail,
    });
  };

  const createOrder = async () => {
    if (!orderPayload) {
      throw new Error("Complete shipping to continue.");
    }
    const res = await fetchWithRetry("/api/paypal/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: orderPayload.orderId,
        promoCode: orderPayload.promoCode,
        items: orderPayload.items.map((item) => ({
          productId: item.productId,
          slug: item.slug,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.paypalOrderId) {
      throw new Error(toUserErrorMessage(data.error, "payment"));
    }
    recordTrafficEvent({ type: "payment_started", path: "/checkout" });
    return data.paypalOrderId as string;
  };

  const onApprove = async (data: { orderID: string }) => {
    if (!orderPayload) return;
    const res = await fetchWithRetry("/api/paypal/capture-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paypalOrderId: data.orderID,
        order: orderPayload,
      }),
    });
    const result = await res.json();
    if (!res.ok || !result.ok) {
      const message = toUserErrorMessage(result.error, "payment");
      reportFailure(
        message,
        `capture ${res.status}: ${typeof result.error === "string" ? result.error : JSON.stringify(result)}`,
      );
      throw new Error(message);
    }
    onSuccess(result);
  };

  const handleError = (err?: unknown) => {
    const technical = formatPayPalSdkError(err);
    const message = toUserErrorMessage(technical, "payment");
    reportFailure(message, technical);
    onError(message);
  };

  const buttonProps = {
    disabled,
    createOrder,
    onApprove,
    onError: handleError,
    onCancel: () => {
      /* user closed popup — not an error */
    },
  };

  return (
    <div className="space-y-3">
      {isRejected ? (
        <p className="text-sm text-[#57534e]">
          Payment could not load. Refresh and try again.
        </p>
      ) : null}

      {fundingButtons.map((btn, index) => (
        <div key={btn.source}>
          {index > 0 && (
            <div className="mb-3 flex items-center gap-3 text-[10px] font-medium uppercase tracking-wide text-[#a8a29e]">
              <span className="h-px flex-1 bg-[#e7e5e4]" />
              or
              <span className="h-px flex-1 bg-[#e7e5e4]" />
            </div>
          )}

          {ready ? (
            <PayPalButtons
              fundingSource={btn.source}
              style={{
                layout: "vertical",
                shape: "rect",
                height: 48,
                ...(btn.source === FUNDING.CARD
                  ? { color: "black", label: "pay" }
                  : btn.source === FUNDING.PAYPAL
                    ? { color: "gold", label: "paypal" }
                    : { color: "white", label: "pay" }),
              }}
              {...buttonProps}
            />
          ) : (
            <PaymentButtonShell
              variant={btn.variant}
              disabled
              loading={!locked && Boolean(orderPayload) && !isResolved}
            />
          )}
        </div>
      ))}
    </div>
  );
}
