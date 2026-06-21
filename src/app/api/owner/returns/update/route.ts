import { NextResponse } from "next/server";
import { updateReturnRequest } from "@/lib/returns/store";
import type { ReturnRequestStatus } from "@/lib/returns/types";
import { requireOwnerAuth } from "@/lib/require-owner-auth";

const VALID: ReturnRequestStatus[] = ["pending", "approved", "denied", "refunded"];

export async function PATCH(request: Request) {
  const auth = await requireOwnerAuth();
  if (auth) return auth;

  let body: { rmaId?: string; status?: ReturnRequestStatus; ownerNote?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const rmaId = body.rmaId?.trim();
  const status = body.status;
  const ownerNote = body.ownerNote?.trim();

  if (!rmaId || !status || !VALID.includes(status)) {
    return NextResponse.json(
      { ok: false, error: "rmaId and valid status are required." },
      { status: 400 },
    );
  }

  const updated = await updateReturnRequest(rmaId, {
    status,
    ...(ownerNote !== undefined ? { ownerNote: ownerNote.slice(0, 2000) } : {}),
  });

  if (!updated) {
    return NextResponse.json({ ok: false, error: "Return request not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, return: updated });
}
