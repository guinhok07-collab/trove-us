export function createOrderId(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TRV-${stamp}-${rand}`;
}

export const ORDER_STORAGE_KEY = "trove-last-order";
