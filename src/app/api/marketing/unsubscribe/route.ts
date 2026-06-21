import { NextResponse } from "next/server";
import { subscribeToMarketing, unsubscribeFromMarketing } from "@/lib/marketing/subscribe";
import { verifyUnsubscribeToken } from "@/lib/marketing/tokens";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { toUserErrorMessage } from "@/lib/user-errors";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim();
  const token = searchParams.get("token")?.trim();

  if (!email || !token || !verifyUnsubscribeToken(email, token)) {
    return NextResponse.json({ error: "Invalid unsubscribe link." }, { status: 400 });
  }

  try {
    await unsubscribeFromMarketing(email);
    return NextResponse.json({ ok: true, email });
  } catch (error) {
    return NextResponse.json(
      { error: toUserErrorMessage(error, "checkout") },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = rateLimit(`marketing:unsubscribe:${ip}`, 8, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429 },
    );
  }

  try {
    const body = (await request.json()) as { email?: string; token?: string };
    const email = body.email?.trim();
    const token = body.token?.trim();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    if (token && !verifyUnsubscribeToken(email, token)) {
      return NextResponse.json({ error: "Invalid unsubscribe link." }, { status: 400 });
    }

    const result = await unsubscribeFromMarketing(email);
    if (!result) {
      return NextResponse.json(
        { error: "This email is not on our deals list." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, email: result.email });
  } catch (error) {
    return NextResponse.json(
      { error: toUserErrorMessage(error, "checkout") },
      { status: 400 },
    );
  }
}
