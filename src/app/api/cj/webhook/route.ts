import { NextResponse } from "next/server";
import {
  handleCjWebhookPayload,
  verifyCjWebhookSignature,
  type CjWebhookPayload,
} from "@/lib/cj/webhook";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const sign = request.headers.get("sign");

  if (!verifyCjWebhookSignature(rawBody, sign)) {
    console.warn("[cj-webhook] invalid signature");
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  let payload: CjWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as CjWebhookPayload;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await handleCjWebhookPayload(payload);
  } catch (error) {
    console.error("[cj-webhook]", error);
  }

  return NextResponse.json({ ok: true });
}
