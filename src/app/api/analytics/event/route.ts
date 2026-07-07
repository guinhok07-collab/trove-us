import { NextResponse } from "next/server";
import { recordTrafficEvent } from "@/lib/traffic/store";
import type { TrafficEventType } from "@/lib/traffic/types";

const ALLOWED: TrafficEventType[] = [
  "page_view",
  "view_product",
  "add_to_cart",
  "view_cart",
  "initiate_checkout",
  "payment_started",
  "purchase",
];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      type?: TrafficEventType;
      path?: string;
      productSlug?: string;
      store?: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      referrer?: string;
    };

    if (!body.type || !ALLOWED.includes(body.type)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const result = await recordTrafficEvent({
      type: body.type,
      path: body.path?.slice(0, 200),
      productSlug: body.productSlug?.slice(0, 80),
      store: body.store?.slice(0, 20),
      utmSource: body.utmSource?.slice(0, 40),
      utmMedium: body.utmMedium?.slice(0, 40),
      utmCampaign: body.utmCampaign?.slice(0, 60),
      referrer: body.referrer?.slice(0, 300),
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
