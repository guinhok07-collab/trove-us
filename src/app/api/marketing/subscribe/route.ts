import { NextResponse } from "next/server";
import { isMailchimpConfigured } from "@/lib/marketing/mailchimp";
import { isMarketingStoreConfigured } from "@/lib/marketing/store";
import { subscribeToMarketing } from "@/lib/marketing/subscribe";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { toUserErrorMessage } from "@/lib/user-errors";

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = rateLimit(`marketing:subscribe:${ip}`, 8, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429 },
    );
  }

  try {
    const body = (await request.json()) as {
      email?: string;
      fullName?: string;
      source?: "footer" | "checkout";
    };

    if (!body.email?.trim()) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 },
      );
    }

    const subscriber = await subscribeToMarketing({
      email: body.email,
      fullName: body.fullName,
      source: body.source === "checkout" ? "checkout" : "footer",
    });

    return NextResponse.json({
      ok: true,
      email: subscriber.email,
      stored: isMarketingStoreConfigured(),
      mailchimp: isMailchimpConfigured(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: toUserErrorMessage(error, "checkout") },
      { status: 400 },
    );
  }
}
