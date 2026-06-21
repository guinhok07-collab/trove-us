/** Block unpaid CJ orders on deployed environments unless explicitly enabled. */
export function allowsDirectOrders(): boolean {
  if (process.env.ALLOW_DEMO_ORDERS === "true") return true;
  if (process.env.VERCEL_ENV === "production") return false;
  if (process.env.VERCEL_ENV === "preview") return false;
  return process.env.NODE_ENV !== "production";
}

export function isProductionRuntime(): boolean {
  return (
    process.env.VERCEL_ENV === "production" ||
    (process.env.NODE_ENV === "production" && !process.env.VERCEL_ENV)
  );
}
