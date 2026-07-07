"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CatalogImage } from "@/components/catalog-image";
import { brand } from "@/data/brand";

import { ORDER_STORAGE_KEY } from "@/lib/orders";
import { formatUsd } from "@/lib/format";
import { trackMetaPurchaseOnce } from "@/lib/meta-pixel";
import { readTrafficAttribution, recordTrafficEvent } from "@/lib/traffic/client";

interface SavedOrder {
  orderId: string;
  email: string;
  total: number;
  cjOrderId?: string;
  fulfillmentMode?: string;
  message?: string;
  items: {
    slug?: string;
    name: string;
    quantity: number;
    price: number;
    image: string;
  }[];
}

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderParam = searchParams.get("order");
  const [order, setOrder] = useState<SavedOrder | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(ORDER_STORAGE_KEY);
      if (!raw) return;
      const parsed: SavedOrder = JSON.parse(raw);
      if (!orderParam || parsed.orderId === orderParam) {
        setOrder(parsed);
        trackMetaPurchaseOnce(
          parsed.orderId,
          parsed.total,
          parsed.items.map((item, index) => ({
            id: item.slug ?? `item-${index}`,
            slug: item.slug ?? item.name.toLowerCase().replace(/\s+/g, "-"),
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        );
        recordTrafficEvent({
          type: "purchase",
          path: "/order/success",
          ...readTrafficAttribution(),
        });
      }
    } catch {
      /* ignore */
    }
  }, [orderParam]);

  if (!order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
        <h1 className="text-2xl font-semibold text-[#1c1917]">
          Order received
        </h1>
        <p className="mt-3 text-sm text-[#78716c]">
          Thank you for shopping with {brand.name}.
        </p>
        <Link href="/" className="btn-primary mt-8 inline-flex px-6 py-3">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="card p-6 text-center sm:p-8">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#eef4f1] text-[#4d7366]">
          ✓
        </span>
        <h1 className="mt-4 text-2xl font-semibold text-[#1c1917]">
          Thank you for your order
        </h1>
        <p className="mt-2 text-sm text-[#78716c]">
          Order <strong className="text-[#1c1917]">{order.orderId}</strong> has
          been placed. A confirmation email was sent to{" "}
          <strong className="text-[#1c1917]">{order.email}</strong>.
        </p>
        {order.cjOrderId && (
          <p className="mt-3 text-sm text-[#78716c]">
            Your order is being processed. Save your order number{" "}
            <strong className="text-[#1c1917]">{order.orderId}</strong> for
            tracking.
          </p>
        )}
        {order.message && (
          <p className="mt-2 text-sm text-[#4d7366]">{order.message}</p>
        )}
      </div>

      <section className="card mt-6 p-6">
        <h2 className="text-base font-semibold text-[#1c1917]">Order summary</h2>
        <ul className="mt-4 space-y-3">
          {order.items.map((item) => (
            <li key={item.name} className="flex items-center gap-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#f5f5f4]">
                <CatalogImage
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </div>
              <div className="flex-1 text-sm">
                <p className="font-medium text-[#1c1917]">{item.name}</p>
                <p className="text-[#78716c]">Qty {item.quantity}</p>
              </div>
              <p className="text-sm font-medium text-[#1c1917]">
                {formatUsd(item.price * item.quantity)}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-[#f5f5f4] pt-4 text-sm">
          <span className="font-semibold text-[#1c1917]">Total</span>
          <span className="font-semibold text-[#1c1917]">
            {formatUsd(order.total)}
          </span>
        </div>
      </section>

      <p className="mt-6 text-center text-xs text-[#a8a29e]">
        Most orders arrive in 3–5 business days. Questions?{" "}
        <a
          href={`mailto:${brand.supportEmail}`}
          className="text-[#5f8a7a] hover:underline"
        >
          {brand.supportEmail}
        </a>
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/products" className="btn-primary px-6 py-3">
          Continue shopping
        </Link>
        <Link
          href={`/track?order=${encodeURIComponent(order.orderId)}&email=${encodeURIComponent(order.email)}`}
          className="inline-flex items-center rounded-full border border-[#e7e5e4] px-6 py-3 text-sm font-semibold text-[#44403c] hover:border-[#5f8a7a]"
        >
          Track order
        </Link>
        <Link
          href={`/returns?order=${encodeURIComponent(order.orderId)}&email=${encodeURIComponent(order.email)}`}
          className="inline-flex items-center rounded-full border border-[#e7e5e4] px-6 py-3 text-sm font-semibold text-[#44403c] hover:border-[#5f8a7a]"
        >
          Start a return
        </Link>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-sm text-[#78716c]">
          Loading order...
        </div>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  );
}