import { NextResponse } from "next/server";
import { sendOrderConfirmation } from "@/lib/orders/service";
import { getOrder, updateOrder } from "@/lib/orders/store";
import { requireOwnerAuth } from "@/lib/require-owner-auth";

/** Resend order confirmation (owner only — e.g. after fixing Resend config). */
export async function POST(request: Request) {
  const denied = await requireOwnerAuth();
  if (denied) return denied;

  const body = (await request.json()) as { orderId?: string; email?: string };
  const orderId = body.orderId?.trim();
  const email = body.email?.trim();

  if (!orderId || !email) {
    return NextResponse.json({ ok: false, error: "orderId and email required." }, { status: 400 });
  }

  const order = await getOrder(orderId);
  if (!order || order.email.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  }

  await updateOrder(orderId, { confirmationEmailSent: false });
  await sendOrderConfirmation(orderId);
  const updated = await getOrder(orderId);

  return NextResponse.json({
    ok: updated?.confirmationEmailSent ?? false,
    confirmationEmailSent: updated?.confirmationEmailSent ?? false,
  });
}
