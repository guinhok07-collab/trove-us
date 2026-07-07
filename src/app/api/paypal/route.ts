import { NextResponse } from "next/server";
import { getPayPalConfig } from "@/lib/paypal";

/** Public — checkout reads clientId + mode (no secret). */
export async function GET() {
  const { configured, mode, clientId } = getPayPalConfig();

  return NextResponse.json({
    configured,
    mode,
    clientId: configured ? clientId : null,
  });
}
