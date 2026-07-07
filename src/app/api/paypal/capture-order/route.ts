import { NextResponse } from "next/server";
import { fulfillOrderWithCj } from "@/lib/cj/fulfill";
import type { CreateStoreOrderRequest } from "@/lib/cj/types";
import { persistPaidOrder } from "@/lib/orders/service";
import { recordPaymentIssue } from "@/lib/payment-issues/record";
import { capturePayPalOrder, getPayPalOrder } from "@/lib/paypal";
import {
  amountsMatch,
  OrderPricingError,
  validateStoreOrder,
} from "@/lib/pricing";
import { toUserErrorMessage, toUserOrderNote } from "@/lib/user-errors";

export async function POST(request: Request) {
  let order: CreateStoreOrderRequest | undefined;
  try {
    const body = await request.json();
    const { paypalOrderId } = body as {
      paypalOrderId: string;
      order: CreateStoreOrderRequest;
    };
    order = body.order;

    if (!paypalOrderId || !order?.orderId) {
      return NextResponse.json(
        { error: toUserErrorMessage("Invalid payload.", "payment") },
        { status: 400 },
      );
    }

    const validatedOrder = await validateStoreOrder(order);

    const paypalOrder = await getPayPalOrder(paypalOrderId);
    const purchaseUnit = paypalOrder.purchase_units?.[0];
    const paypalTotal = Number(purchaseUnit?.amount?.value);

    if (!Number.isFinite(paypalTotal)) {
      throw new Error("PayPal order amount is missing.");
    }

    if (!amountsMatch(paypalTotal, validatedOrder.total)) {
      throw new OrderPricingError("Payment amount does not match order total.");
    }

    const paypalOrderIdMatch =
      purchaseUnit?.custom_id === validatedOrder.orderId ||
      purchaseUnit?.reference_id === validatedOrder.orderId;

    if (!paypalOrderIdMatch) {
      throw new OrderPricingError("Payment does not match this order.");
    }

    const payment = await capturePayPalOrder(paypalOrderId);

    let cjResult;
    let cjError: string | undefined;

    try {
      cjResult = await fulfillOrderWithCj(validatedOrder);
    } catch (error) {
      cjError =
        error instanceof Error
          ? error.message
          : "Payment captured but CJ fulfillment failed.";
      console.error("[capture-order] CJ failed:", cjError);
      cjResult = {
        ok: true,
        orderId: validatedOrder.orderId,
        fulfillmentMode: "local-only" as const,
        message: cjError,
      };
    }

    await persistPaidOrder(validatedOrder, {
      paypalCaptureId: payment.captureId,
      cjOrderId: cjResult.cjOrderId,
      cjStatus: cjResult.cjStatus,
      fulfillmentMode: cjResult.fulfillmentMode,
      fulfillmentError: cjError,
    }).catch((err) => {
      console.error("[capture-order] persist/email failed:", err);
    });

    const userMessage =
      toUserOrderNote(cjError ?? cjResult.message) ??
      "Your order is confirmed. We'll email you shipping updates soon.";

    return NextResponse.json({
      ok: true,
      orderId: validatedOrder.orderId,
      paypalCaptureId: payment.captureId,
      paymentStatus: payment.status,
      cjOrderId: cjResult.cjOrderId,
      fulfillmentMode: cjResult.fulfillmentMode,
      message: userMessage,
    });
  } catch (error) {
    console.error("[capture-order]", error);
    const status = error instanceof OrderPricingError ? 400 : 502;
    const userMessage = toUserErrorMessage(error, "payment");
    void recordPaymentIssue({
      source: "auto_capture",
      fullName: order?.fullName,
      email: order?.email,
      phone: order?.phone,
      orderId: order?.orderId,
      cartTotal: order?.total,
      problem: userMessage,
      technicalDetail: [
        error instanceof Error ? error.message : String(error),
        (error as Error & { paypal?: { name?: string; debug_id?: string } }).paypal?.name,
        (error as Error & { paypal?: { debug_id?: string } }).paypal?.debug_id,
      ]
        .filter(Boolean)
        .join(" | "),
      path: "/checkout",
    }).catch((err) => console.error("[capture-order] issue log failed:", err));
    return NextResponse.json({ error: userMessage }, { status });
  }
}
