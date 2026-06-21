import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { allowsDirectOrders } from "@/lib/security";

export function middleware(request: NextRequest) {
  if (
    request.nextUrl.pathname === "/api/orders" &&
    request.method === "POST" &&
    !allowsDirectOrders()
  ) {
    return NextResponse.json(
      { ok: false, error: "Direct orders are disabled. Use PayPal checkout." },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/orders"],
};
