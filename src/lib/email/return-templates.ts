import { brand } from "@/data/brand";
import { siteUrl } from "@/lib/site";
import type { StoredOrder } from "@/lib/orders/types";
import { getReturnReason, type ReturnReasonId } from "@/lib/returns/policy";

function layout(title: string, body: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:Georgia,serif;color:#1c1917;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #e7e5e4;overflow:hidden;">
        <tr><td style="padding:28px 28px 8px;">
          <p style="margin:0;font-size:22px;font-weight:600;">${brand.name}</p>
        </td></tr>
        <tr><td style="padding:8px 28px 28px;">${body}</td></tr>
        <tr><td style="padding:20px 28px;background:#fafaf9;border-top:1px solid #f5f5f4;">
          <p style="margin:0;font-size:12px;color:#a8a29e;line-height:1.6;">
            Reply to this email or write to
            <a href="mailto:${brand.supportEmail}" style="color:#5f8a7a;">${brand.supportEmail}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export interface ReturnRequestPayload {
  rmaId: string;
  order: StoredOrder;
  reasonId: ReturnReasonId;
  itemNames: string[];
  details: string;
}

export function returnRequestCustomerEmail(payload: ReturnRequestPayload) {
  const reason = getReturnReason(payload.reasonId);
  const subject = `Return request received — ${payload.rmaId}`;
  const itemsList = payload.itemNames.map((n) => `• ${n}`).join("<br/>");
  const photoNote = reason?.needsPhotos
    ? `<p style="margin:16px 0 0;font-size:14px;color:#57534e;line-height:1.6;">
         <strong>Photo proof required:</strong> Reply to this email within 48 hours with clear photos of the product, packaging, and any damage or label mismatch.
       </p>`
    : "";

  const html = layout(
    subject,
    `<h1 style="margin:0 0 12px;font-size:20px;">We received your return request</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#57534e;line-height:1.6;">
      Hi ${payload.order.fullName.split(" ")[0] || "there"}, your request for order
      <strong>${payload.order.orderId}</strong> is being reviewed.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:#fafaf9;border-radius:12px;padding:16px;">
      <tr><td style="font-size:13px;color:#78716c;padding:4px 0;">RMA number</td></tr>
      <tr><td style="font-size:16px;font-weight:600;padding:0 0 12px;">${payload.rmaId}</td></tr>
      <tr><td style="font-size:13px;color:#78716c;padding:4px 0;">Reason</td></tr>
      <tr><td style="font-size:14px;padding:0 0 12px;">${reason?.label ?? payload.reasonId}</td></tr>
      <tr><td style="font-size:13px;color:#78716c;padding:4px 0;">Item(s)</td></tr>
      <tr><td style="font-size:14px;line-height:1.6;">${itemsList}</td></tr>
    </table>
    ${photoNote}
    <p style="margin:20px 0 0;font-size:14px;color:#57534e;line-height:1.6;">
      <strong>What happens next</strong><br/>
      1. We review within 1 business day.<br/>
      2. Do not ship anything until we email you approval and return instructions.<br/>
      3. Refunds go to your original payment method within 5–7 business days after approval.
    </p>`,
  );

  const text = `Return request received — ${payload.rmaId}

Order: ${payload.order.orderId}
Reason: ${reason?.label ?? payload.reasonId}
Items:
${payload.itemNames.map((n) => `- ${n}`).join("\n")}

Details you provided:
${payload.details}

Do not ship until we approve. ${reason?.needsPhotos ? "Reply with photos within 48 hours if requested." : ""}

${brand.supportEmail}`;

  return { subject, html, text };
}

export function returnRequestSupportEmail(payload: ReturnRequestPayload) {
  const reason = getReturnReason(payload.reasonId);
  const subject = `[Return] ${payload.rmaId} — ${payload.order.orderId}`;
  const itemsList = payload.itemNames.join(", ");

  const html = layout(
    subject,
    `<h1 style="margin:0 0 12px;font-size:20px;">New return request</h1>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.8;">
      <tr><td><strong>RMA</strong></td><td>${payload.rmaId}</td></tr>
      <tr><td><strong>Order</strong></td><td>${payload.order.orderId}</td></tr>
      <tr><td><strong>Customer</strong></td><td>${payload.order.fullName} &lt;${payload.order.email}&gt;</td></tr>
      <tr><td><strong>Total paid</strong></td><td>$${payload.order.total.toFixed(2)}</td></tr>
      <tr><td><strong>PayPal capture</strong></td><td>${payload.order.paypalCaptureId ?? "—"}</td></tr>
      <tr><td><strong>CJ order</strong></td><td>${payload.order.cjOrderId ?? "—"}</td></tr>
      <tr><td><strong>Status</strong></td><td>${payload.order.status}</td></tr>
      <tr><td><strong>Tracking</strong></td><td>${payload.order.trackingNumber ?? "—"}</td></tr>
      <tr><td><strong>Reason</strong></td><td>${reason?.label ?? payload.reasonId}</td></tr>
      <tr><td><strong>Items</strong></td><td>${itemsList}</td></tr>
    </table>
    <p style="margin:20px 0 8px;font-size:14px;font-weight:600;">Customer message</p>
    <p style="margin:0;font-size:14px;color:#57534e;white-space:pre-wrap;">${payload.details.replace(/</g, "&lt;")}</p>
    <p style="margin:20px 0 0;">
      <a href="${siteUrl}/track?order=${encodeURIComponent(payload.order.orderId)}&email=${encodeURIComponent(payload.order.email)}" style="color:#5f8a7a;">View order in tracker</a>
    </p>`,
  );

  const text = `New return request ${payload.rmaId}

Order: ${payload.order.orderId}
Customer: ${payload.order.fullName} <${payload.order.email}>
Total: $${payload.order.total.toFixed(2)}
PayPal: ${payload.order.paypalCaptureId ?? "—"}
CJ: ${payload.order.cjOrderId ?? "—"}
Reason: ${reason?.label ?? payload.reasonId}
Items: ${itemsList}

Details:
${payload.details}`;

  return { subject, html, text };
}
