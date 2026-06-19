import { NextResponse } from "next/server";

/**
 * CJ webhook receiver — configure in CJ dashboard when ready.
 * https://developers.cjdropshipping.com/en/api/api2/api/webhook.html
 */
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.info("[cj-webhook]", JSON.stringify(payload));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
