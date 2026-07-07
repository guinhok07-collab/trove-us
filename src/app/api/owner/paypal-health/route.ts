import { NextResponse } from "next/server";
import { getPayPalConfig } from "@/lib/paypal";
import { verifyPayPalServer } from "@/lib/paypal-health";
import { requireOwnerAuth } from "@/lib/require-owner-auth";

export async function GET() {
  const auth = await requireOwnerAuth();
  if (auth) return auth;

  const { configured, mode, clientId } = getPayPalConfig();
  const server = configured ? await verifyPayPalServer() : { ok: false, error: "not configured" };

  return NextResponse.json({
    ok: configured && server.ok,
    configured,
    mode,
    clientIdPreview: clientId ? `${clientId.slice(0, 8)}…` : null,
    server,
    checklist: [
      "PayPal Business verificada em business.paypal.com",
      "Developer → App LIVE → Advanced Credit and Debit Card Payments ON",
      "Domínio trove-us.com adicionado no app Live",
      "Testar compra com IP dos EUA (comprador BR costuma falhar)",
    ],
  });
}
