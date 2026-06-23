import { NextResponse } from "next/server";
import { orderNeedsSellerAction, pendingActionLabel } from "@/lib/orders/action";
import { countPendingActionOrders, listRecentOrders } from "@/lib/orders/store";
import { toTrackView } from "@/lib/orders/service";
import { requireOwnerAuth } from "@/lib/require-owner-auth";

export async function GET(request: Request) {
  const auth = await requireOwnerAuth();
  if (auth) return auth;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 40), 100);
  const pendingOnly = searchParams.get("pending") === "1";

  const orders = pendingOnly
    ? (await listRecentOrders(limit)).filter(orderNeedsSellerAction)
    : await listRecentOrders(limit);

  const pendingActionCount = await countPendingActionOrders();

  return NextResponse.json({
    ok: true,
    pendingActionCount,
    orders: orders.map((o) => ({
      ...toTrackView(o),
      paypalCaptureId: o.paypalCaptureId,
      cjOrderId: o.cjOrderId,
      phone: o.phone,
      city: o.city,
      state: o.state,
      zip: o.zip,
      address: o.address,
      fulfillmentError: o.fulfillmentError,
      needsAction: orderNeedsSellerAction(o),
      pendingLabel: pendingActionLabel(o),
      ownerResolvedAt: o.ownerResolvedAt,
    })),
  });
}
