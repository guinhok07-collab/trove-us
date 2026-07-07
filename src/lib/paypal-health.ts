import { getPayPalConfig } from "./paypal";

export interface PayPalApiError {
  message: string;
  name?: string;
  details?: Array<{ issue?: string; description?: string }>;
  debug_id?: string;
}

export function parsePayPalError(json: unknown, fallback: string): PayPalApiError {
  const body = json as {
    message?: string;
    name?: string;
    details?: Array<{ issue?: string; description?: string }>;
    debug_id?: string;
    error_description?: string;
  };
  const detailText = (body.details ?? [])
    .map((d) => d.description || d.issue)
    .filter(Boolean)
    .join(" · ");
  return {
    message: detailText || body.message || body.error_description || fallback,
    name: body.name,
    details: body.details,
    debug_id: body.debug_id,
  };
}

export async function verifyPayPalServer(): Promise<{
  ok: boolean;
  mode?: string;
  merchantEmail?: string;
  detail?: string;
  error?: string;
  issues?: string[];
}> {
  const { configured, mode, apiBase, clientId, clientSecret } = getPayPalConfig();
  const issues: string[] = [];

  if (!configured || !clientId || !clientSecret) {
    return { ok: false, error: "PAYPAL_CLIENT_SECRET or CLIENT_ID missing" };
  }

  if (mode !== "live") {
    issues.push("PAYPAL_MODE não é live — checkout real precisa live");
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const tokenRes = await fetch(`${apiBase}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    error_description?: string;
  };
  if (!tokenRes.ok || !tokenJson.access_token) {
    return {
      ok: false,
      mode,
      error: tokenJson.error_description || "OAuth failed — secret errado ou app errado",
      issues,
    };
  }

  let merchantEmail: string | undefined;
  try {
    const userRes = await fetch(
      `${apiBase}/v1/identity/oauth2/userinfo?schema=paypalv1.1`,
      {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
        cache: "no-store",
      },
    );
    const userJson = (await userRes.json()) as {
      emails?: Array<{ value?: string }>;
      name?: string;
    };
    if (userRes.ok) {
      merchantEmail = userJson.emails?.[0]?.value;
      if (!merchantEmail) issues.push("Conta PayPal sem e-mail visível na API");
    }
  } catch {
    issues.push("Não consegui ler userinfo do merchant");
  }

  // Smoke create-order
  try {
    const orderRes = await fetch(`${apiBase}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `health-${Date.now()}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: "10.99",
            },
          },
        ],
      }),
      cache: "no-store",
    });
    const orderJson = await orderRes.json();
    if (!orderRes.ok) {
      const err = parsePayPalError(orderJson, "create order failed");
      issues.push(`Create order API: ${err.message}`);
      if (err.name === "UNPROCESSABLE_ENTITY" && /payee/i.test(err.message)) {
        issues.push("Conta PayPal RESTRICTED — verifique business.paypal.com");
      }
    }
  } catch (e) {
    issues.push(`Create order: ${e instanceof Error ? e.message : "failed"}`);
  }

  return {
    ok: issues.length === 0,
    mode,
    merchantEmail,
    detail: issues.length ? issues.join("; ") : "OAuth + create-order OK",
    issues,
  };
}
