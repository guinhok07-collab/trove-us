import { NextResponse } from "next/server";
import {
  countOpenPaymentIssues,
  listPaymentIssues,
  updatePaymentIssue,
} from "@/lib/payment-issues/store";
import type { PaymentIssueStatus } from "@/lib/payment-issues/types";
import { requireOwnerAuth } from "@/lib/require-owner-auth";

const VALID: PaymentIssueStatus[] = ["open", "contacted", "resolved"];

export async function GET(request: Request) {
  const auth = await requireOwnerAuth();
  if (auth) return auth;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);
  const statusParam = searchParams.get("status")?.trim() as PaymentIssueStatus | undefined;
  const status = statusParam && VALID.includes(statusParam) ? statusParam : undefined;

  const issues = await listPaymentIssues({ limit, status });
  const openCount = status
    ? issues.filter((i) => i.status === "open").length
    : await countOpenPaymentIssues();

  return NextResponse.json({
    ok: true,
    openCount,
    issues,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireOwnerAuth();
  if (auth) return auth;

  const body = (await request.json()) as {
    issueId?: string;
    status?: PaymentIssueStatus;
    ownerNote?: string;
  };

  const issueId = body.issueId?.trim();
  if (!issueId) {
    return NextResponse.json({ ok: false, error: "issueId required." }, { status: 400 });
  }

  const patch: { status?: PaymentIssueStatus; ownerNote?: string } = {};
  if (body.status && VALID.includes(body.status)) patch.status = body.status;
  if (body.ownerNote !== undefined) patch.ownerNote = body.ownerNote.trim().slice(0, 2000);

  const updated = await updatePaymentIssue(issueId, patch);
  if (!updated) {
    return NextResponse.json({ ok: false, error: "Issue not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, issue: updated });
}
