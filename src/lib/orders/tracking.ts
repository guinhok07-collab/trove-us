const TRACKING_STATUS_LABELS: Record<number, string> = {
  0: "Awaiting carrier scan",
  1: "Shipped from warehouse",
  2: "Received by carrier",
  3: "Return initiated",
  4: "In transit",
  5: "International transit",
  6: "Arrived in destination country",
  7: "Customs clearance",
  8: "Customs cleared",
  9: "Out for local delivery",
  10: "Out for delivery",
  11: "Ready for pickup",
  12: "Delivered",
  13: "Delivery exception",
  14: "Returned",
};

export function trackingStatusLabel(status?: number): string | undefined {
  if (status === undefined || status === null) return undefined;
  return TRACKING_STATUS_LABELS[status] ?? "In transit";
}

export function buildTrackingUrl(
  trackingNumber: string,
  carrier?: string,
  cjUrl?: string,
): string {
  if (cjUrl?.startsWith("http")) return cjUrl;

  const num = encodeURIComponent(trackingNumber.trim());
  const c = (carrier ?? "").toLowerCase();

  if (c.includes("usps") || /^9[0-9]{21,25}$/.test(trackingNumber)) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${num}`;
  }
  if (c.includes("ups") || /^1Z/i.test(trackingNumber)) {
    return `https://www.ups.com/track?tracknum=${num}`;
  }
  if (c.includes("fedex")) {
    return `https://www.fedex.com/fedextrack/?trknbr=${num}`;
  }

  return `https://t.17track.net/en#nums=${num}`;
}

export function orderStatusLabel(status: string): string {
  switch (status) {
    case "paid":
      return "Order confirmed";
    case "processing":
      return "Processing at warehouse";
    case "shipped":
      return "Shipped";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
    default:
      return "Processing";
  }
}

export function mapCjOrderStatus(cjStatus?: string): "processing" | "shipped" | "delivered" {
  const s = (cjStatus ?? "").toUpperCase();
  if (s.includes("DELIVER") || s.includes("COMPLETE")) return "delivered";
  if (s.includes("SHIP") || s.includes("DISPATCH") || s.includes("TRANSIT")) {
    return "shipped";
  }
  return "processing";
}
