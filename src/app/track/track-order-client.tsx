"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { brand } from "@/data/brand";
import { formatUsd } from "@/lib/format";
import type { OrderTrackView } from "@/lib/orders/types";
import { toUserErrorMessage } from "@/lib/user-errors";

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get("order") ?? "");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderTrackView | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const params = new URLSearchParams({
        order: orderId.trim(),
        email: email.trim(),
      });
      const res = await fetch(`/api/orders/track?${params}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Could not find order.");
      }
      setOrder(data.order as OrderTrackView);
    } catch (err) {
      setError(toUserErrorMessage(err, "track"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="section-title text-3xl">Track your order</h1>
      <p className="section-subtitle mt-2">
        Enter your order number and email to see shipping updates.
      </p>

      <form onSubmit={handleSubmit} className="card mt-8 space-y-4 p-6">
        <div>
          <label htmlFor="orderId" className="text-sm font-medium text-[#1c1917]">
            Order number
          </label>
          <input
            id="orderId"
            required
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="TRV-..."
            className="mt-2 w-full rounded-xl border border-[#e7e5e4] px-4 py-2.5 text-sm outline-none focus:border-[#5f8a7a]/50 focus:ring-2 focus:ring-[#eef4f1]"
          />
        </div>
        <div>
          <label htmlFor="email" className="text-sm font-medium text-[#1c1917]">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="mt-2 w-full rounded-xl border border-[#e7e5e4] px-4 py-2.5 text-sm outline-none focus:border-[#5f8a7a]/50 focus:ring-2 focus:ring-[#eef4f1]"
          />
        </div>
        {error && (
          <p className="rounded-lg bg-[#fef2f2] px-3 py-2 text-sm text-[#991b1b]">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 disabled:opacity-60"
        >
          {loading ? "Looking up..." : "Track order"}
        </button>
      </form>

      {order && (
        <section className="card mt-6 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#a8a29e]">
                Order {order.orderId}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-[#1c1917]">
                {order.statusLabel}
              </h2>
              {order.trackingStatusLabel && order.status === "shipped" && (
                <p className="mt-1 text-sm text-[#78716c]">
                  {order.trackingStatusLabel}
                </p>
              )}
            </div>
            <p className="text-sm font-semibold text-[#1c1917]">
              {formatUsd(order.total)}
            </p>
          </div>

          {order.trackingNumber ? (
            <div className="mt-6 rounded-xl border border-[#e7e5e4] bg-[#fafaf9] p-4">
              <p className="text-sm font-medium text-[#1c1917]">Tracking</p>
              <p className="mt-1 font-mono text-sm text-[#57534e]">
                {order.trackingNumber}
              </p>
              {order.carrier && (
                <p className="mt-1 text-xs text-[#78716c]">Carrier: {order.carrier}</p>
              )}
              {order.trackingUrl && (
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex text-sm font-semibold text-[#5f8a7a] hover:text-[#4d7366]"
                >
                  Open carrier tracking →
                </a>
              )}
            </div>
          ) : (
            <p className="mt-6 text-sm text-[#78716c]">
              Tracking will appear here once your order ships. You&apos;ll also get
              an email at {order.email}.
            </p>
          )}

          <ul className="mt-6 space-y-3 border-t border-[#f5f5f4] pt-4">
            {order.items.map((item) => (
              <li key={item.name} className="flex justify-between text-sm">
                <span className="text-[#57534e]">
                  {item.name} × {item.quantity}
                </span>
                <span className="font-medium text-[#1c1917]">
                  {formatUsd(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-8 text-center text-sm text-[#78716c]">
        Need a return?{" "}
        <Link href="/returns" className="font-medium text-[#5f8a7a] hover:underline">
          Start a return
        </Link>
        {" · "}
        Need help?{" "}
        <a
          href={`mailto:${brand.supportEmail}`}
          className="font-medium text-[#5f8a7a] hover:underline"
        >
          {brand.supportEmail}
        </a>
      </p>

      <p className="mt-4 text-center">
        <Link href="/products" className="text-sm font-semibold text-[#5f8a7a]">
          ← Continue shopping
        </Link>
      </p>
    </div>
  );
}

export default function TrackOrderClient() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-sm text-[#78716c]">Loading...</div>
      }
    >
      <TrackOrderContent />
    </Suspense>
  );
}
