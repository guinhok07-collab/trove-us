import { NextResponse } from "next/server";
import { createPayPalOrder } from "@/lib/paypal";
import {
  calculateOrderTotals,
  OrderPricingError,
  resolveOrderItems,
} from "@/lib/pricing";
import { toUserErrorMessage } from "@/lib/user-errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, items } = body as {
      orderId?: string;
      items?: Array<{ productId?: string; slug?: string; quantity: number }>;
    };

    if (!orderId || !items?.length) {
      return NextResponse.json(
        { error: toUserErrorMessage("Invalid payload.", "payment") },
        { status: 400 },
      );
    }

    const resolvedItems = await resolveOrderItems(items);
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
    return NextResponse.json(
      { error: toUserErrorMessage(error, "payment") },
      { status },
    );
  }
}
