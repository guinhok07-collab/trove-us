import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/client";
import {
  returnRequestCustomerEmail,
  returnRequestSupportEmail,
} from "@/lib/email/return-templates";
import { getOrder } from "@/lib/orders/store";
import { isOrderStoreConfigured } from "@/lib/orders/store";
import {
  checkReturnEligibility,
  generateRmaId,
} from "@/lib/returns/eligibility";
import {
  RETURN_REASONS,
  type ReturnReasonId,
  getReturnReason,
} from "@/lib/returns/policy";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { notifyReturnRequest } from "@/lib/notifications/return-alert";
import {
  isReturnStoreConfigured,
  saveReturnRequest,
} from "@/lib/returns/store";
import { brand } from "@/data/brand";
import type { StoredReturnRequest } from "@/lib/returns/types";

const MIN_DETAILS_LENGTH = 20;
const MAX_DETAILS_LENGTH = 2000;

interface ReturnRequestBody {
  orderId?: string;
  email?: string;
  reason?: string;
  itemIndexes?: number[];
  details?: string;
  unusedConfirmed?: boolean;
  noChargebackConfirmed?: boolean;
  returnShippingConfirmed?: boolean;
  photoProofConfirmed?: boolean;
  company?: string;
}

function sanitizeDetails(raw: string): string {
  return raw.trim().slice(0, MAX_DETAILS_LENGTH);
}

export async function POST(request: Request) {
  if (!isOrderStoreConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Return requests are not available yet." },
      { status: 503 },
    );
  }

  const ip = clientIp(request);
  const limited = rateLimit(`return:${ip}`, 5, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Too many return requests. Please try again later or email us directly.",
      },
      { status: 429 },
    );
  }

  let body: ReturnRequestBody;
  try {
    body = (await request.json()) as ReturnRequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  if (body.company?.trim()) {
    return NextResponse.json({ ok: true, rmaId: "RMA-RECEIVED" });
  }

  const orderId = body.orderId?.trim();
  const email = body.email?.trim().toLowerCase();
  const reasonId = body.reason?.trim() as ReturnReasonId | undefined;
  const details = sanitizeDetails(body.details ?? "");
  const itemIndexes = body.itemIndexes;

  if (!orderId || !email || !reasonId || !itemIndexes?.length) {
    return NextResponse.json(
      { ok: false, error: "Order number, email, reason, and at least one item are required." },
      { status: 400 },
    );
  }

  if (!getReturnReason(reasonId)) {
    return NextResponse.json({ ok: false, error: "Invalid return reason." }, { status: 400 });
  }

  if (details.length < MIN_DETAILS_LENGTH) {
    return NextResponse.json(
      {
        ok: false,
        error: `Please describe the issue in at least ${MIN_DETAILS_LENGTH} characters so we can review your request.`,
      },
      { status: 400 },
    );
  }

  if (!body.unusedConfirmed || !body.noChargebackConfirmed || !body.returnShippingConfirmed) {
    return NextResponse.json(
      { ok: false, error: "Please confirm all required checkboxes to submit." },
      { status: 400 },
    );
  }

  const reason = getReturnReason(reasonId)!;
  if (reason.needsPhotos && !body.photoProofConfirmed) {
    return NextResponse.json(
      {
        ok: false,
        error: "Photo proof confirmation is required for this return reason.",
      },
      { status: 400 },
    );
  }

  const order = await getOrder(orderId);
  if (!order || order.email.toLowerCase() !== email) {
    return NextResponse.json(
      { ok: false, error: "Order not found. Check your order number and email." },
      { status: 404 },
    );
  }

  const eligibility = checkReturnEligibility(order);
  if (!eligibility.eligible) {
    return NextResponse.json({ ok: false, error: eligibility.message }, { status: 400 });
  }

  const validIndexes = itemIndexes.filter(
    (i) => Number.isInteger(i) && i >= 0 && i < order.items.length,
  );
  if (validIndexes.length === 0) {
    return NextResponse.json({ ok: false, error: "Select at least one valid item." }, { status: 400 });
  }

  const itemNames = validIndexes.map((i) => order.items[i]!.name);
  const rmaId = generateRmaId(order.orderId);
  const now = new Date().toISOString();

  const storedReturn: StoredReturnRequest = {
    rmaId,
    orderId: order.orderId,
    email: order.email,
    customerName: order.fullName,
    reasonId,
    reasonLabel: reason.label,
    itemNames,
    details,
    orderTotal: order.total,
    paypalCaptureId: order.paypalCaptureId,
    cjOrderId: order.cjOrderId,
    orderStatus: order.status,
    trackingNumber: order.trackingNumber,
    needsPhotos: reason.needsPhotos,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  const payload = {
    rmaId,
    order,
    reasonId,
    itemNames,
    details,
  };

  const customerMail = returnRequestCustomerEmail(payload);
  const supportMail = returnRequestSupportEmail(payload);

  const [customerResult, supportResult] = await Promise.all([
    sendEmail({ to: order.email, ...customerMail }),
    sendEmail({ to: brand.supportEmail, ...supportMail }),
  ]);

  if (isReturnStoreConfigured()) {
    await saveReturnRequest(storedReturn);
  }

  void notifyReturnRequest(storedReturn).catch((err) => {
    console.error("[returns] telegram notify failed:", err);
  });

  if (!customerResult.ok && !supportResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: `We could not send your request. Email ${brand.supportEmail} with order ${orderId}.`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    rmaId,
    daysRemaining: eligibility.daysRemaining,
    needsPhotos: reason.needsPhotos,
    message:
      "Return request submitted. Check your email for your RMA number and next steps.",
  });
}

export function GET() {
  return NextResponse.json({
    ok: true,
    reasons: RETURN_REASONS.map((r) => ({
      id: r.id,
      label: r.label,
      needsPhotos: r.needsPhotos,
      sellerPaysReturn: r.sellerPaysReturn,
    })),
  });
}
