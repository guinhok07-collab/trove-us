"use client";

import {
  PayPalButtons,
  PayPalScriptProvider,
} from "@paypal/react-paypal-js";
import type { CreateStoreOrderRequest } from "@/lib/cj/types";
import { toUserErrorMessage } from "@/lib/user-errors";

interface PayPalCheckoutProps {
  clientId: string;
  mode: string;
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
  orderPayload,
  disabled,
  onSuccess,
  onError,
}: PayPalCheckoutProps) {
  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: "USD",
        intent: "capture",
        components: "buttons",
        locale: "en_US",
        enableFunding: mode === "live" ? "card,venmo" : "card",
      }}
    >
      <div className={disabled ? "pointer-events-none opacity-50" : ""}>
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
