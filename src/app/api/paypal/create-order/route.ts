import { NextResponse } from "next/server";
import { recordPaymentIssue } from "@/lib/payment-issues/record";
import { createPayPalOrder } from "@/lib/paypal";
import {
  calculateOrderTotals,
  OrderPricingError,
  resolveOrderItems,
} from "@/lib/pricing";
import { toUserErrorMessage } from "@/lib/user-errors";

export async function POST(request: Request) {
  let orderId: string | undefined;
  try {
    const body = await request.json();
    ({ orderId } = body as {
      orderId?: string;
      items?: Array<{
        productId?: string;
        slug?: string;
        variantId?: string;
        quantity: number;
      }>;
    });
    const { items } = body as {
      orderId?: string;
      items?: Array<{
        productId?: string;
        slug?: string;
        variantId?: string;
        quantity: number;
      }>;
    };

    if (!orderId || !items?.length) {
      return NextResponse.json(
        { error: toUserErrorMessage("Invalid payload.", "payment") },
        { status: 400 },
      );
    }

    const resolvedItems = await resolveOrderItems(
      items.map((item) => ({
        productId: item.productId,
        slug: item.slug,
        variantId: item.variantId,
        quantity: item.quantity,
      })),
    );
    const { shipping, total } = calculateOrderTotals(resolvedItems);

    const paypalOrderId = await createPayPalOrder({
      orderId,
      total,
      shipping,
      items: resolvedItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitAmount: item.price,
      })),
    });

    return NextResponse.json({ paypalOrderId });
  } catch (error) {
    console.error("[paypal/create-order]", error);
    const status = error instanceof OrderPricingError ? 400 : 502;
    const userMessage = toUserErrorMessage(error, "payment");
    void recordPaymentIssue({
      source: "auto_create",
      problem: userMessage,
      technicalDetail: [
        error instanceof Error ? error.message : String(error),
        (error as Error & { paypal?: { name?: string; debug_id?: string } }).paypal?.name,
        (error as Error & { paypal?: { debug_id?: string } }).paypal?.debug_id,
      ]
        .filter(Boolean)
        .join(" | "),
      orderId,
      path: "/checkout",
    }).catch((err) => console.error("[paypal/create-order] issue log failed:", err));
    return NextResponse.json({ error: userMessage }, { status });
  }
}
