import { NextResponse } from "next/server";
import { lookupOrder } from "@/lib/orders/service";
import { isOrderStoreConfigured } from "@/lib/orders/store";

export async function GET(request: Request) {
  if (!isOrderStoreConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Order tracking is not configured yet." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("order")?.trim();
  const email = searchParams.get("email")?.trim();

  if (!orderId || !email) {
    return NextResponse.json(
      { ok: false, error: "Order number and email are required." },
      { status: 400 },
    );
  }

  const order = await lookupOrder(orderId, email);
  if (!order) {
    return NextResponse.json(
      { ok: false, error: "Order not found. Check your order number and email." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, order });
}
