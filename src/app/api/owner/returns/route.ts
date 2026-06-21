import { NextResponse } from "next/server";
import { listReturnRequests } from "@/lib/returns/store";
import type { ReturnRequestStatus } from "@/lib/returns/types";
import { requireOwnerAuth } from "@/lib/require-owner-auth";

const VALID: ReturnRequestStatus[] = ["pending", "approved", "denied", "refunded"];

export async function GET(request: Request) {
  const auth = await requireOwnerAuth();
  if (auth) return auth;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);
  const statusParam = searchParams.get("status")?.trim() as ReturnRequestStatus | undefined;
  const status = statusParam && VALID.includes(statusParam) ? statusParam : undefined;

  const returns = await listReturnRequests({ limit, status });

  const pendingCount = status
    ? returns.length
    : (await listReturnRequests({ limit: 200, status: "pending" })).length;

  return NextResponse.json({
    ok: true,
    pendingCount,
    returns,
  });
}
