import { NextResponse } from "next/server";
import { listRecentOrders } from "@/lib/orders/store";
import { toTrackView } from "@/lib/orders/service";
import { requireOwnerAuth } from "@/lib/require-owner-auth";

export async function GET(request: Request) {
  const auth = await requireOwnerAuth();
  if (auth) return auth;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 40), 100);

  const orders = await listRecentOrders(limit);

  return NextResponse.json({
    ok: true,
    orders: orders.map((o) => ({
      ...toTrackView(o),
      paypalCaptureId: o.paypalCaptureId,
      cjOrderId: o.cjOrderId,
      phone: o.phone,
      city: o.city,
      state: o.state,
      zip: o.zip,
    })),
  });
}
