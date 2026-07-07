import { NextResponse } from "next/server";
import { brand } from "@/data/brand";
import { recordPaymentIssue } from "@/lib/payment-issues/record";
import { isPaymentIssueStoreConfigured } from "@/lib/payment-issues/store";
import type { PaymentIssueSource } from "@/lib/payment-issues/types";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const MIN_PROBLEM_LENGTH = 10;
const AUTO_SOURCES: PaymentIssueSource[] = [
  "auto_create",
  "auto_capture",
  "auto_client",
];

interface PaymentHelpBody {
  fullName?: string;
  email?: string;
  phone?: string;
  problem?: string;
  orderId?: string;
  cartTotal?: number;
  path?: string;
  technicalDetail?: string;
  source?: PaymentIssueSource;
  company?: string;
}

export async function POST(request: Request) {
  let body: PaymentHelpBody;
  try {
    body = (await request.json()) as PaymentHelpBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  if (body.company?.trim()) {
    return NextResponse.json({ ok: true, issueId: "PAY-RECEIVED" });
  }

  const source = body.source ?? "customer";
  const isAuto = AUTO_SOURCES.includes(source);
  const ip = clientIp(request);

  const limited = rateLimit(
    `payment-help:${isAuto ? "auto" : "user"}:${ip}`,
    isAuto ? 20 : 5,
    60 * 60 * 1000,
  );
  if (!limited.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Too many requests. Please email us directly.",
      },
      { status: 429 },
    );
  }

  const problem = body.problem?.trim() ?? "";
  const fullName = body.fullName?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const phone = body.phone?.trim() ?? "";

  if (isAuto) {
    if (!problem && !body.technicalDetail?.trim()) {
      return NextResponse.json({ ok: false, error: "Missing error detail." }, { status: 400 });
    }
  } else {
    if (!fullName || !email || !phone) {
      return NextResponse.json(
        { ok: false, error: "Name, email, and phone are required." },
        { status: 400 },
      );
    }
    if (problem.length < MIN_PROBLEM_LENGTH) {
      return NextResponse.json(
        {
          ok: false,
          error: `Please describe what happened (at least ${MIN_PROBLEM_LENGTH} characters).`,
        },
        { status: 400 },
      );
    }
  }

  if (!isPaymentIssueStoreConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: `We couldn't save your report. Email ${brand.supportEmail} and we'll help you.`,
      },
      { status: 503 },
    );
  }

  const issue = await recordPaymentIssue({
    source,
    fullName: fullName || "Visitante",
    email,
    phone,
    problem: problem || body.technicalDetail?.trim() || "Payment error",
    technicalDetail: body.technicalDetail?.trim(),
    orderId: body.orderId?.trim(),
    cartTotal:
      typeof body.cartTotal === "number" && Number.isFinite(body.cartTotal)
        ? body.cartTotal
        : undefined,
    path: body.path?.trim() || "/checkout",
    notify: true,
  });

  return NextResponse.json({
    ok: true,
    issueId: issue.issueId,
    message: isAuto
      ? "Error logged."
      : "Thanks — we got your message and will contact you shortly.",
  });
}
