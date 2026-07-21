export type PayPalMode = "sandbox" | "live";

import { parsePayPalError } from "./paypal-health";

export function getPayPalConfig() {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  const mode = (process.env.PAYPAL_MODE?.trim() || "sandbox") as PayPalMode;

  return {
    clientId,
    clientSecret,
    mode,
    configured: Boolean(clientId && clientSecret),
    apiBase:
      mode === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com",
  };
}

export function isPayPalConfigured() {
  return getPayPalConfig().configured;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const { clientId, clientSecret, apiBase, configured } = getPayPalConfig();
  if (!configured || !clientId || !clientSecret) {
    throw new Error("PayPal is not configured.");
  }

  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${apiBase}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
  };

  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || "PayPal authentication failed.");
  }

  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };

  return cachedToken.value;
}

export interface PayPalOrderItem {
  name: string;
  quantity: number;
  unitAmount: number;
}

function roundUsd(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}

export async function createPayPalOrder(input: {
  orderId: string;
  total: number;
  shipping: number;
  discount?: number;
  items: PayPalOrderItem[];
}) {
  const { apiBase } = getPayPalConfig();
  const token = await getAccessToken();

  const itemTotal = input.items.reduce(
    (sum, item) => sum + item.unitAmount * item.quantity,
    0,
  );
  const itemTotalStr = roundUsd(itemTotal);
  const shippingStr = roundUsd(input.shipping);
  const discount = Math.max(0, input.discount ?? 0);
  const discountStr = roundUsd(discount);
  const totalStr = roundUsd(input.total);

  const breakdown: Record<string, { currency_code: string; value: string }> = {
    item_total: {
      currency_code: "USD",
      value: itemTotalStr,
    },
    shipping: {
      currency_code: "USD",
      value: shippingStr,
    },
  };

  if (discount > 0) {
    breakdown.discount = {
      currency_code: "USD",
      value: discountStr,
    };
  }

  const res = await fetch(`${apiBase}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": input.orderId,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      application_context: {
        brand_name: "Trove",
        landing_page: "NO_PREFERENCE",
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
      },
      purchase_units: [
        {
          reference_id: input.orderId,
          custom_id: input.orderId,
          amount: {
            currency_code: "USD",
            value: totalStr,
            breakdown,
          },
          items: input.items.map((item) => ({
            name: item.name.slice(0, 127),
            quantity: String(item.quantity),
            unit_amount: {
              currency_code: "USD",
              value: roundUsd(item.unitAmount),
            },
            category: "PHYSICAL_GOODS",
          })),
        },
      ],
    }),
    cache: "no-store",
  });

  const json = (await res.json()) as {
    id?: string;
    message?: string;
    name?: string;
    details?: Array<{ issue?: string; description?: string }>;
    debug_id?: string;
  };
  if (!res.ok || !json.id) {
    const err = parsePayPalError(json, "Failed to create PayPal order.");
    const e = new Error(err.message);
    (e as Error & { paypal?: typeof err }).paypal = err;
    throw e;
  }

  return json.id;
}

export async function getPayPalOrder(paypalOrderId: string) {
  const { apiBase } = getPayPalConfig();
  const token = await getAccessToken();

  const res = await fetch(`${apiBase}/v2/checkout/orders/${paypalOrderId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const json = (await res.json()) as {
    status?: string;
    message?: string;
    purchase_units?: Array<{
      reference_id?: string;
      custom_id?: string;
      amount?: { value?: string; currency_code?: string };
    }>;
  };

  if (!res.ok) {
    throw new Error(json.message || "Failed to load PayPal order.");
  }

  return json;
}

export async function capturePayPalOrder(paypalOrderId: string) {
  const { apiBase } = getPayPalConfig();
  const token = await getAccessToken();

  const res = await fetch(
    `${apiBase}/v2/checkout/orders/${paypalOrderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
  );

  const json = (await res.json()) as {
    status?: string;
    message?: string;
    name?: string;
    details?: Array<{ issue?: string; description?: string }>;
    debug_id?: string;
    purchase_units?: Array<{
      payments?: { captures?: Array<{ id?: string; status?: string }> };
    }>;
  };

  if (!res.ok || json.status !== "COMPLETED") {
    const err = parsePayPalError(json, "PayPal capture failed.");
    const e = new Error(err.message);
    (e as Error & { paypal?: typeof err }).paypal = err;
    throw e;
  }

  const captureId =
    json.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? paypalOrderId;

  return { status: json.status, captureId };
}
