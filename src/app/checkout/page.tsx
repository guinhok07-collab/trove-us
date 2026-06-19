"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { copy } from "@/data/brand";
import { useCart } from "@/context/cart-context";
import { createOrderId, ORDER_STORAGE_KEY } from "@/lib/orders";
import { formatUsd } from "@/lib/format";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<"paypal" | "card">(
    "paypal",
  );
  const shipping = subtotal >= 35 ? 0 : 4.99;
  const total = subtotal + shipping;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-[#78716c]">Nothing to checkout.</p>
        <Link
          href="/products"
          className="mt-4 inline-block text-sm font-semibold text-[#5f8a7a]"
        >
          Go shopping
        </Link>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const orderId = createOrderId();

    sessionStorage.setItem(
      ORDER_STORAGE_KEY,
      JSON.stringify({
        orderId,
        email,
        total,
        items: items.map(({ product, quantity }) => ({
          name: product.name,
          quantity,
          price: product.price,
          image: product.image,
        })),
      }),
    );

    clearCart();
    router.push(`/order/success?order=${orderId}`);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="section-title text-2xl">Secure Checkout</h1>
      <p className="section-subtitle mt-2">{copy.checkoutSecure}</p>

      <div className="mt-6 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm text-[#92400e]">
        <strong>Demo checkout:</strong> Payment gateway (PayPal/Stripe) connects
        at launch. Orders are saved locally for testing the full flow.
      </div>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-8 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <section className="card p-6">
            <h2 className="text-base font-semibold text-[#1c1917]">
              Shipping Address
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="sr-only" htmlFor="fullName">
                Full name
              </label>
              <input
                id="fullName"
                name="fullName"
                required
                placeholder="Full name"
                className="rounded-xl border border-[#e7e5e4] px-4 py-2.5 text-sm outline-none focus:border-[#5f8a7a]/50 focus:ring-2 focus:ring-[#eef4f1] sm:col-span-2"
              />
              <label className="sr-only" htmlFor="address">
                Street address
              </label>
              <input
                id="address"
                name="address"
                required
                placeholder="Street address"
                className="rounded-xl border border-[#e7e5e4] px-4 py-2.5 text-sm outline-none focus:border-[#5f8a7a]/50 focus:ring-2 focus:ring-[#eef4f1] sm:col-span-2"
              />
              <input
                name="city"
                required
                placeholder="City"
                aria-label="City"
                className="rounded-xl border border-[#e7e5e4] px-4 py-2.5 text-sm outline-none focus:border-[#5f8a7a]/50 focus:ring-2 focus:ring-[#eef4f1]"
              />
              <input
                name="state"
                required
                placeholder="State"
                aria-label="State"
                className="rounded-xl border border-[#e7e5e4] px-4 py-2.5 text-sm outline-none focus:border-[#5f8a7a]/50 focus:ring-2 focus:ring-[#eef4f1]"
              />
              <input
                name="zip"
                required
                placeholder="ZIP code"
                aria-label="ZIP code"
                className="rounded-xl border border-[#e7e5e4] px-4 py-2.5 text-sm outline-none focus:border-[#5f8a7a]/50 focus:ring-2 focus:ring-[#eef4f1]"
              />
              <input
                name="email"
                required
                type="email"
                placeholder="Email"
                aria-label="Email"
                className="rounded-xl border border-[#e7e5e4] px-4 py-2.5 text-sm outline-none focus:border-[#5f8a7a]/50 focus:ring-2 focus:ring-[#eef4f1]"
              />
            </div>
          </section>

          <section className="card p-6">
            <h2 className="text-base font-semibold text-[#1c1917]">Payment</h2>
            <p className="mt-2 text-sm text-[#78716c]">{copy.checkoutPayment}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("paypal")}
                className={`rounded-xl border py-4 text-sm font-medium transition ${
                  paymentMethod === "paypal"
                    ? "border-[#5f8a7a] bg-[#eef4f1] text-[#4d7366]"
                    : "border-[#e7e5e4] bg-[#faf9f7] text-[#57534e]"
                }`}
              >
                PayPal
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={`rounded-xl border py-4 text-sm font-medium transition ${
                  paymentMethod === "card"
                    ? "border-[#5f8a7a] bg-[#eef4f1] text-[#4d7366]"
                    : "border-[#e7e5e4] bg-[#faf9f7] text-[#57534e]"
                }`}
              >
                Credit Card
              </button>
            </div>
          </section>
        </div>

        <aside className="card h-fit p-6 lg:col-span-2">
          <h2 className="text-base font-semibold text-[#1c1917]">
            Order Summary
          </h2>
          <ul className="mt-4 space-y-3">
            {items.map(({ product, quantity }) => (
              <li key={product.id} className="flex gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#f5f5f4]">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                </div>
                <div className="flex-1 text-sm">
                  <p className="line-clamp-2 font-medium text-[#1c1917]">
                    {product.name}
                  </p>
                  <p className="text-[#78716c]">Qty {quantity}</p>
                </div>
                <p className="text-sm font-medium text-[#1c1917]">
                  {formatUsd(product.price * quantity)}
                </p>
              </li>
            ))}
          </ul>
          <dl className="mt-5 space-y-2 border-t border-[#f5f5f4] pt-4 text-sm">
            <div className="flex justify-between text-[#78716c]">
              <dt>Subtotal</dt>
              <dd>{formatUsd(subtotal)}</dd>
            </div>
            <div className="flex justify-between text-[#78716c]">
              <dt>Shipping</dt>
              <dd>{shipping === 0 ? "Free" : formatUsd(shipping)}</dd>
            </div>
            <div className="flex justify-between pt-2 font-semibold text-[#1c1917]">
              <dt>Total</dt>
              <dd>{formatUsd(total)}</dd>
            </div>
          </dl>
          <button type="submit" className="btn-primary mt-6 w-full py-3.5">
            Place Order — {formatUsd(total)}
          </button>
          <Link
            href="/cart"
            className="mt-4 block text-center text-sm font-medium text-[#5f8a7a] hover:text-[#4d7366]"
          >
            ← Back to cart
          </Link>
        </aside>
      </form>
    </div>
  );
}
