import { NextResponse } from "next/server";
import { fulfillOrderWithCj } from "@/lib/cj/fulfill";
import { getCjPayType, isCjConfigured } from "@/lib/cj/client";
import { isEmailConfigured } from "@/lib/email/client";
import { persistPaidOrder } from "@/lib/orders/service";
import { isOrderStoreConfigured } from "@/lib/orders/store";
import type { CreateStoreOrderRequest } from "@/lib/cj/types";
import { OrderPricingError, validateStoreOrder } from "@/lib/pricing";
import { allowsDirectOrders } from "@/lib/security";
import { toUserErrorMessage, toUserOrderNote } from "@/lib/user-errors";

export async function GET() {
  const publicConfig = {
    cjConfigured: isCjConfigured(),
    directOrdersAllowed: allowsDirectOrders(),
  };

  if (!allowsDirectOrders()) {
    return NextResponse.json(publicConfig);
  }

  const payType = getCjPayType();
  return NextResponse.json({
    ...publicConfig,
    payType,
    autoPay: payType === 2,
    fromCountry: process.env.CJ_FROM_COUNTRY ?? "US",
    orderStoreConfigured: isOrderStoreConfigured(),
    emailConfigured: isEmailConfigured(),
  });
}

export async function POST(request: Request) {
  if (!allowsDirectOrders()) {
    return NextResponse.json(
      {
        ok: false,
        error: toUserErrorMessage(
          "Direct orders are disabled. Use PayPal checkout.",
          "order",
        ),
      },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as CreateStoreOrderRequest;

    if (!body.orderId || !body.email || !body.fullName || !body.items?.length) {
      return NextResponse.json(
        { ok: false, error: toUserErrorMessage("Invalid order payload.", "order") },
        { status: 400 },
      );
    }

    if (!body.phone?.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: toUserErrorMessage("Phone number is required for CJ shipping.", "order"),
        },
        { status: 400 },
      );
    }

    const validatedOrder = await validateStoreOrder(body);
    const result = await fulfillOrderWithCj(validatedOrder);
    const message = toUserOrderNote(result.message);
    await persistPaidOrder(validatedOrder, {
      cjOrderId: result.cjOrderId,
      cjStatus: result.cjStatus,
      fulfillmentMode: result.fulfillmentMode,
    }).catch((err) => {
      console.error("[orders] persist/email failed:", err);
    });
    return NextResponse.json({ ...result, message });
  } catch (error) {
    console.error("[orders]", error);
    const status = error instanceof OrderPricingError ? 400 : 502;
    return NextResponse.json(
      { ok: false, error: toUserErrorMessage(error, "order") },
      { status },
    );
  }
}
