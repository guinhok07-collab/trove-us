import { NextResponse } from "next/server";
import { getOrder, updateOrder } from "@/lib/orders/store";
import { requireOwnerAuth } from "@/lib/require-owner-auth";

export async function PATCH(request: Request) {
  const auth = await requireOwnerAuth();
  if (auth) return auth;

  let body: { orderId?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const orderId = body.orderId?.trim();
  if (!orderId || body.action !== "resolve") {
    return NextResponse.json(
      { ok: false, error: "orderId and action=resolve are required." },
      { status: 400 },
    );
  }

  const order = await getOrder(orderId);
  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  }

  const updated = await updateOrder(orderId, {
    ownerResolvedAt: new Date().toISOString(),
    fulfillmentError: undefined,
  });

  return NextResponse.json({ ok: true, order: updated });
}
