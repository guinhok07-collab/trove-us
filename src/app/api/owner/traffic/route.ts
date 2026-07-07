import { NextResponse } from "next/server";
import { getTrafficReport } from "@/lib/traffic/store";
import { requireOwnerAuth } from "@/lib/require-owner-auth";

export async function GET(request: Request) {
  const auth = await requireOwnerAuth();
  if (auth) return auth;

  const { searchParams } = new URL(request.url);
  const days = Math.min(Number(searchParams.get("days") ?? 14), 30);

  const report = await getTrafficReport(days);
  return NextResponse.json(report);
}
