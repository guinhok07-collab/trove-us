import { NextResponse } from "next/server";
import { fulfillOrderWithCj } from "@/lib/cj/fulfill";
import { isCjConfigured } from "@/lib/cj/client";
import type { CreateStoreOrderRequest } from "@/lib/cj/types";

export async function GET() {
  const payType = Number(process.env.CJ_PAY_TYPE ?? "2");
  return NextResponse.json({
    cjConfigured: isCjConfigured(),
    payType,
    autoPay: payType === 2,
    fromCountry: process.env.CJ_FROM_COUNTRY ?? "US",
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateStoreOrderRequest;

    if (!body.orderId || !body.email || !body.fullName || !body.items?.length) {
      return NextResponse.json(
        { ok: false, error: "Invalid order payload." },
        { status: 400 },
      );
    }

    if (!body.phone?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Phone number is required for CJ shipping." },
        { status: 400 },
      );
    }

    const result = await fulfillOrderWithCj(body);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create CJ order.";
    console.error("[orders]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
