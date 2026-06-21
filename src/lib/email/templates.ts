import { brand } from "@/data/brand";
import { siteUrl } from "@/lib/site";
import { formatUsd } from "@/lib/format";
import type { StoredOrder } from "@/lib/orders/types";
import { orderStatusLabel } from "@/lib/orders/tracking";

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
          <p style="margin:8px 0 0;font-size:13px;color:#78716c;">${brand.tagline}</p>
        </td></tr>
        <tr><td style="padding:8px 28px 28px;">${body}</td></tr>
        <tr><td style="padding:20px 28px;background:#fafaf9;border-top:1px solid #f5f5f4;">
          <p style="margin:0;font-size:12px;color:#a8a29e;line-height:1.6;">
            Questions? Reply to this email or write to
            <a href="mailto:${brand.supportEmail}" style="color:#5f8a7a;">${brand.supportEmail}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function itemRows(order: StoredOrder) {
  return order.items
    .map(
      (item) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #f5f5f4;font-size:14px;">
          ${item.name} × ${item.quantity}
        </td>
        <td align="right" style="padding:8px 0;border-bottom:1px solid #f5f5f4;font-size:14px;">
          ${formatUsd(item.price * item.quantity)}
        </td>
      </tr>`,
    )
    .join("");
}

export function confirmationEmail(order: StoredOrder) {
  const trackUrl = `${siteUrl}/track?order=${encodeURIComponent(order.orderId)}&email=${encodeURIComponent(order.email)}`;
  const returnUrl = `${siteUrl}/returns?order=${encodeURIComponent(order.orderId)}&email=${encodeURIComponent(order.email)}`;
  const subject = `Order confirmed — ${order.orderId}`;

  const html = layout(
    subject,
    `<h1 style="margin:0 0 12px;font-size:20px;">Thank you for your order</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#57534e;line-height:1.6;">
      Hi ${order.fullName.split(" ")[0] || "there"}, we received your order
      <strong>${order.orderId}</strong>. Most orders arrive in 3–5 business days.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      ${itemRows(order)}
      <tr>
        <td style="padding:12px 0 4px;font-size:14px;color:#78716c;">Shipping</td>
        <td align="right" style="padding:12px 0 4px;font-size:14px;color:#78716c;">
          ${order.shipping === 0 ? "Free" : formatUsd(order.shipping)}
        </td>
      </tr>
      <tr>
        <td style="padding:4px 0;font-size:15px;font-weight:600;">Total</td>
        <td align="right" style="padding:4px 0;font-size:15px;font-weight:600;">${formatUsd(order.total)}</td>
      </tr>
    </table>
    <p style="margin:20px 0 8px;font-size:13px;color:#78716c;">
      Ship to: ${order.fullName}, ${order.address}${order.address2 ? `, ${order.address2}` : ""}, ${order.city}, ${order.state} ${order.zip}
    </p>
    <p style="margin:24px 0 0;">
      <a href="${trackUrl}" style="display:inline-block;background:#5f8a7a;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:600;">
        Track your order
      </a>
    </p>
    <p style="margin:16px 0 0;font-size:13px;color:#78716c;">
      Not satisfied? You have 30 days after delivery to
      <a href="${returnUrl}" style="color:#5f8a7a;">start a return</a>.
    </p>`,
  );

  const text = `Thank you for your order at ${brand.name}!

Order: ${order.orderId}
Total: ${formatUsd(order.total)}

Track your order: ${trackUrl}

Start a return (within 30 days of delivery): ${returnUrl}

Ship to:
${order.fullName}
${order.address}${order.address2 ? `\n${order.address2}` : ""}
${order.city}, ${order.state} ${order.zip}

Questions? ${brand.supportEmail}`;

  return { subject, html, text };
}

export function shippedEmail(order: StoredOrder) {
  const trackUrl =
    order.trackingUrl ??
    `${siteUrl}/track?order=${encodeURIComponent(order.orderId)}&email=${encodeURIComponent(order.email)}`;
  const subject = `Your order has shipped — ${order.orderId}`;

  const html = layout(
    subject,
    `<h1 style="margin:0 0 12px;font-size:20px;">Your order is on the way</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#57534e;line-height:1.6;">
      Hi ${order.fullName.split(" ")[0] || "there"}, good news — order
      <strong>${order.orderId}</strong> has shipped.
    </p>
    ${
      order.trackingNumber
        ? `<p style="margin:0 0 8px;font-size:14px;"><strong>Tracking number:</strong> ${order.trackingNumber}</p>
           ${order.carrier ? `<p style="margin:0 0 16px;font-size:14px;color:#78716c;">Carrier: ${order.carrier}</p>` : ""}`
        : ""
    }
    <p style="margin:24px 0 0;">
      <a href="${trackUrl}" style="display:inline-block;background:#5f8a7a;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:600;">
        Track shipment
      </a>
    </p>
    <p style="margin:20px 0 0;font-size:13px;color:#78716c;">
      Estimated delivery: 3–5 business days from ship date.
    </p>`,
  );

  const text = `Your ${brand.name} order ${order.orderId} has shipped.

${order.trackingNumber ? `Tracking: ${order.trackingNumber}\n` : ""}${order.carrier ? `Carrier: ${order.carrier}\n` : ""}
Track: ${trackUrl}

Questions? ${brand.supportEmail}`;

  return { subject, html, text };
}

export function deliveredEmail(order: StoredOrder) {
  const returnUrl = `${siteUrl}/returns?order=${encodeURIComponent(order.orderId)}&email=${encodeURIComponent(order.email)}`;
  const subject = `Delivered — ${order.orderId}`;
  const html = layout(
    subject,
    `<h1 style="margin:0 0 12px;font-size:20px;">Your order was delivered</h1>
    <p style="margin:0;font-size:14px;color:#57534e;line-height:1.6;">
      Order <strong>${order.orderId}</strong> shows as delivered. We hope you love it.
      Not satisfied? You have 30 days to
      <a href="${returnUrl}" style="color:#5f8a7a;">start a return request</a>.
    </p>`,
  );
  const text = `Your ${brand.name} order ${order.orderId} was delivered. Start a return: ${returnUrl}`;
  return { subject, html, text };
}
