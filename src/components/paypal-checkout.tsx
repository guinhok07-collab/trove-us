"use client";

import {
  PayPalButtons,
  PayPalMessages,
  PayPalScriptProvider,
} from "@paypal/react-paypal-js";
import type { CreateStoreOrderRequest } from "@/lib/cj/types";
import { toUserErrorMessage } from "@/lib/user-errors";

interface PayPalCheckoutProps {
  clientId: string;
  mode: string;
  total: number;
  orderPayload: CreateStoreOrderRequest;
  disabled?: boolean;
  onSuccess: (result: {
    orderId: string;
    paypalCaptureId?: string;
    cjOrderId?: string;
    message?: string;
  }) => void;
  onError: (message: string) => void;
}

export function PayPalCheckout({
  clientId,
  mode,
  total,
  orderPayload,
  disabled,
  onSuccess,
  onError,
}: PayPalCheckoutProps) {
  const live = mode === "live";

  const scriptOptions = {
    clientId,
    currency: "USD",
    intent: "capture" as const,
    components: live ? "buttons,messages" : "buttons",
    locale: "en_US",
    enableFunding: live ? "card,paylater" : "card,paylater",
    // buyerCountry is sandbox-only — breaks live SDK with HTTP 400
    ...(live ? {} : { buyerCountry: "US" }),
  };

  return (
    <PayPalScriptProvider options={scriptOptions}>
      <div className={disabled ? "pointer-events-none opacity-50" : ""}>
        {live && total >= 30 && (
          <div className="mb-4 min-h-[24px]">
            <PayPalMessages
              amount={Math.round(total * 100) / 100}
              placement="payment"
              style={{ layout: "text", logo: { type: "primary" } }}
            />
          </div>
        )}
        <PayPalButtons
          style={{ layout: "vertical", shape: "rect", label: "paypal" }}
          disabled={disabled}
          createOrder={async () => {
            const res = await fetch("/api/paypal/create-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: orderPayload.orderId,
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
              throw new Error(
                toUserErrorMessage(data.error, "payment"),
              );
            }
            return data.paypalOrderId;
          }}
          onApprove={async (data) => {
            const res = await fetch("/api/paypal/capture-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                paypalOrderId: data.orderID,
                order: orderPayload,
              }),
            });
            const result = await res.json();
            if (!res.ok || !result.ok) {
              throw new Error(
                toUserErrorMessage(result.error, "payment"),
              );
            }
            onSuccess(result);
          }}
          onError={() => {
            onError(
              "Payment was cancelled or could not be completed. Please try again.",
            );
          }}
        />
      </div>
    </PayPalScriptProvider>
  );
}
