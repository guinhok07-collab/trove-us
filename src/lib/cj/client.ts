import { getCjAccessToken } from "./token";
import type {
  CjApiResponse,
  CjCreateOrderPayload,
  CjCreateOrderResult,
  CjFreightOption,
} from "./types";
import { CJ_API_BASE } from "./types";

export interface CjClientConfig {
  apiKey: string;
  fromCountryCode: string;
  storeName: string;
  payType: number;
  logisticName?: string;
}

async function cjFetch<T>(
  apiKey: string,
  path: string,
  init?: RequestInit,
): Promise<CjApiResponse<T>> {
  const token = await getCjAccessToken(apiKey);
  const res = await fetch(`${CJ_API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "CJ-Access-Token": token,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const json = (await res.json()) as CjApiResponse<T>;
  if (!json.result) {
    throw new Error(json.message || `CJ API error on ${path}`);
  }
  return json;
}

export async function calculateFreight(
  config: CjClientConfig,
  input: {
    endCountryCode: string;
    zip?: string;
    products: { vid: string; quantity: number }[];
  },
): Promise<CjFreightOption[]> {
  const json = await cjFetch<CjFreightOption[]>(
    config.apiKey,
    "/logistic/freightCalculate",
    {
      method: "POST",
      body: JSON.stringify({
        startCountryCode: config.fromCountryCode,
        endCountryCode: input.endCountryCode,
        zip: input.zip,
        products: input.products,
      }),
    },
  );

  return json.data ?? [];
}

export function pickLogisticOption(
  options: CjFreightOption[],
  preferredName?: string,
): CjFreightOption | undefined {
  if (options.length === 0) return undefined;
  if (preferredName) {
    const match = options.find((o) => o.logisticName === preferredName);
    if (match) return match;
  }
  return [...options].sort((a, b) => a.logisticPrice - b.logisticPrice)[0];
}

export async function createCjOrder(
  config: CjClientConfig,
  payload: CjCreateOrderPayload,
): Promise<CjCreateOrderResult> {
  const json = await cjFetch<CjCreateOrderResult>(
    config.apiKey,
    "/shopping/order/createOrderV2",
    {
      method: "POST",
      body: JSON.stringify({
        platform: "Api",
        orderFlow: 1,
        payType: config.payType,
        storeName: config.storeName,
        ...payload,
      }),
    },
  );

  return json.data;
}

export function getCjClientConfig(): CjClientConfig | null {
  const apiKey = process.env.CJ_API_KEY?.trim();
  if (!apiKey) return null;

  const payType = Number(process.env.CJ_PAY_TYPE ?? "2");
  return {
    apiKey,
    fromCountryCode: process.env.CJ_FROM_COUNTRY?.trim() || "US",
    storeName: process.env.CJ_STORE_NAME?.trim() || "Trove",
    payType: Number.isFinite(payType) ? payType : 2,
    logisticName: process.env.CJ_LOGISTIC_NAME?.trim() || undefined,
  };
}

export function isCjConfigured(): boolean {
  return Boolean(process.env.CJ_API_KEY?.trim());
}
