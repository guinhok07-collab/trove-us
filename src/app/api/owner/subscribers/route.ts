import { NextResponse } from "next/server";
import { isMailchimpConfigured } from "@/lib/marketing/mailchimp";
import { isMarketingStoreConfigured, listSubscribers } from "@/lib/marketing/store";
import { buildUnsubscribeUrl } from "@/lib/marketing/tokens";
import { requireOwnerAuth } from "@/lib/require-owner-auth";

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: Request) {
  const auth = await requireOwnerAuth();
  if (auth) return auth;

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");
  const limit = Math.min(Number(searchParams.get("limit") ?? 500), 2000);

  const subscribers = await listSubscribers(limit);
  const active = subscribers.filter((s) => s.status === "subscribed");

  if (format === "csv") {
    const header = "email,full_name,source,subscribed_at,unsubscribe_url";
    const rows = active.map((s) =>
      [
        escapeCsv(s.email),
        escapeCsv(s.fullName ?? ""),
        escapeCsv(s.source),
        escapeCsv(s.subscribedAt),
        escapeCsv(buildUnsubscribeUrl(s.email)),
      ].join(","),
    );
    const csv = [header, ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="trove-deals-subscribers.csv"',
      },
    });
  }

  return NextResponse.json({
    ok: true,
    configured: isMarketingStoreConfigured(),
    mailchimp: isMailchimpConfigured(),
    total: subscribers.length,
    subscribed: active.length,
    subscribers: active.map((s) => ({
      email: s.email,
      fullName: s.fullName ?? "",
      source: s.source,
      subscribedAt: s.subscribedAt,
      unsubscribeUrl: buildUnsubscribeUrl(s.email),
    })),
  });
}
