"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { copy } from "@/data/brand";
import { PayPalCheckout } from "@/components/paypal-checkout";
import { useCart } from "@/context/cart-context";
import { createOrderId, ORDER_STORAGE_KEY } from "@/lib/orders";
import type { CreateStoreOrderRequest } from "@/lib/cj/types";
import { formatUsd } from "@/lib/format";
import { calculateShipping } from "@/lib/pricing";
import { toUserErrorMessage } from "@/lib/user-errors";
import { trackMetaInitiateCheckout } from "@/lib/meta-pixel";

interface CjConfig {
  cjConfigured: boolean;
  autoPay?: boolean;
  payType?: number;
  directOrdersAllowed?: boolean;
}

interface PayPalConfig {
  configured: boolean;
  mode: string;
  clientId: string | null;
}

interface ShippingForm {
  fullName: string;
  address: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
}

const emptyForm: ShippingForm = {
  fullName: "",
  address: "",
  address2: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
};

function isFormValid(form: ShippingForm) {
  return (
    form.fullName.trim() &&
    form.address.trim() &&
    form.city.trim() &&
    form.state.trim() &&
    form.zip.trim() &&
    form.phone.trim() &&
    form.email.trim()
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const [form, setForm] = useState<ShippingForm>(emptyForm);
  const [orderId] = useState(() => createOrderId());
  const [cjConfig, setCjConfig] = useState<CjConfig | null>(null);
  const [paypalConfig, setPaypalConfig] = useState<PayPalConfig | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shipping = calculateShipping(subtotal);
  const total = subtotal + shipping;

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then(setCjConfig)
      .catch(() => setCjConfig({ cjConfigured: false, autoPay: false }));
    fetch("/api/paypal")
      .then((r) => r.json())
      .then(setPaypalConfig)
      .catch(() =>
        setPaypalConfig({ configured: false, mode: "sandbox", clientId: null }),
      );
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    try {
      if (sessionStorage.getItem("trove-meta-initiate-checkout")) return;
      trackMetaInitiateCheckout(
        items.map(({ product, quantity }) => ({
          id: product.id,
          slug: product.slug,
          name: product.name,
          price: product.price,
          quantity,
        })),
        subtotal + calculateShipping(subtotal),
      );
      sessionStorage.setItem("trove-meta-initiate-checkout", "1");
    } catch {
      trackMetaInitiateCheckout(
        items.map(({ product, quantity }) => ({
          id: product.id,
          slug: product.slug,
          name: product.name,
          price: product.price,
          quantity,
        })),
        subtotal + calculateShipping(subtotal),
      );
    }
  }, [items, subtotal]);

  const orderPayload = useMemo<CreateStoreOrderRequest | null>(() => {
    if (!isFormValid(form) || items.length === 0) return null;
    return {
      orderId,
      email: form.email.trim(),
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      address2: form.address2.trim() || undefined,
      city: form.city.trim(),
      state: form.state.trim(),
      zip: form.zip.trim(),
      subtotal,
      shipping,
      total,
      items: items.map(({ product, quantity }) => ({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        quantity,
        price: product.price,
        image: product.image,
        cjVid: product.cjVid,
        cjSku: product.cjSku,
      })),
    };
  }, [form, items, orderId, subtotal, shipping, total]);

  function updateField(field: keyof ShippingForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function completeOrder(result: {
    orderId: string;
    paypalCaptureId?: string;
    cjOrderId?: string;
    message?: string;
    cjError?: string;
  }) {
    sessionStorage.setItem(
      ORDER_STORAGE_KEY,
      JSON.stringify({
        orderId: result.orderId,
        email: form.email,
        total,
        paypalCaptureId: result.paypalCaptureId,
        cjOrderId: result.cjOrderId,
        message: result.cjError ?? result.message,
        items: items.map(({ product, quantity }) => ({
          slug: product.slug,
          name: product.name,
          quantity,
          price: product.price,
          image: product.image,
        })),
      }),
    );
    clearCart();
    try {
      sessionStorage.removeItem("trove-meta-initiate-checkout");
    } catch {
      /* ignore */
    }
    router.push(`/order/success?order=${result.orderId}`);
  }

  async function handleDemoSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderPayload) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Could not place order.");
      }
      completeOrder(data);
    } catch (err) {
      setError(toUserErrorMessage(err, "checkout"));
    } finally {
      setSubmitting(false);
    }
  }

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

  const cjReady = cjConfig?.cjConfigured;
  const missingCj = items.filter(({ product }) => !product.cjVid?.trim());
  const paypalReady = paypalConfig?.configured && paypalConfig.clientId;
  const sandboxMode = paypalConfig?.mode === "sandbox";
  const directOrdersAllowed = cjConfig?.directOrdersAllowed ?? false;
  const demoCheckoutEnabled = sandboxMode && directOrdersAllowed;
  const formReady = Boolean(orderPayload);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="section-title text-2xl">Secure Checkout</h1>
      <p className="section-subtitle mt-2">{copy.checkoutSecure}</p>

      {!paypalReady && paypalConfig !== null && (
        <div className="mt-6 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm text-[#92400e]">
          <strong>Checkout unavailable.</strong> Payment is temporarily unavailable
          — please try again later or email us for help.
        </div>
      )}

      {cjReady && missingCj.length > 0 && (
        <div className="mt-4 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]">
          Some items in your cart are temporarily unavailable:{" "}
          {missingCj.map((i) => i.product.name).join(", ")}. Please remove them
          or contact support before checkout.
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]">
          {error}
        </div>
      )}

      <form
        onSubmit={handleDemoSubmit}
        className="mt-8 grid gap-8 lg:grid-cols-5"
      >
        <div className="space-y-6 lg:col-span-3">
          <section className="card p-6">
            <h2 className="text-base font-semibold text-[#1c1917]">
              Shipping Address
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["fullName", "Full name", true, 2],
                  ["address", "Street address", true, 2],
                  ["address2", "Apt, suite (optional)", false, 2],
                  ["city", "City", true, 1],
                  ["state", "State", true, 1],
                  ["zip", "ZIP code", true, 1],
                  ["phone", "Phone", true, 1],
                  ["email", "Email", true, 2],
                ] as const
              ).map(([field, placeholder, required, span]) => (
                <input
                  key={field}
                  required={required}
                  type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
                  value={form[field]}
                  onChange={(e) => updateField(field, e.target.value)}
                  placeholder={placeholder}
                  aria-label={placeholder}
                  className={`rounded-xl border border-[#e7e5e4] px-4 py-2.5 text-sm outline-none focus:border-[#5f8a7a]/50 focus:ring-2 focus:ring-[#eef4f1] ${span === 2 ? "sm:col-span-2" : ""}`}
                />
              ))}
            </div>
          </section>

          <section className="card p-6">
            <h2 className="text-base font-semibold text-[#1c1917]">Payment</h2>

            {demoCheckoutEnabled && formReady ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm text-[#166534]">
                  <strong>Modo teste (sandbox)</strong> — PayPal sandbox often
                  fails outside the US. Use the button below to test email, CJ,
                  and tracking. Real PayPal works in Live mode.
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full max-w-md py-3.5 disabled:opacity-60"
                >
                  {submitting
                    ? "Processing..."
                    : `Complete test order — ${formatUsd(total)}`}
                </button>
                <details className="max-w-md text-sm text-[#78716c]">
                  <summary className="cursor-pointer font-medium text-[#57534e]">
                    Try PayPal sandbox anyway (optional)
                  </summary>
                  <div className="mt-4">
                    {paypalReady && orderPayload ? (
                      <PayPalCheckout
                        clientId={paypalConfig!.clientId!}
                        mode={paypalConfig!.mode}
                        orderPayload={orderPayload}
                        disabled={submitting}
                        onSuccess={completeOrder}
                        onError={(message) =>
                          setError(toUserErrorMessage(message, "payment"))
                        }
                      />
                    ) : null}
                  </div>
                </details>
              </div>
            ) : paypalReady && orderPayload ? (
              <div className="mt-5 max-w-md">
                <p className="text-sm text-[#78716c]">{copy.checkoutPayment}</p>
                <PayPalCheckout
                  clientId={paypalConfig!.clientId!}
                  mode={paypalConfig!.mode}
                  orderPayload={orderPayload}
                  disabled={!formReady || submitting}
                  onSuccess={completeOrder}
                  onError={(message) =>
                    setError(toUserErrorMessage(message, "payment"))
                  }
                />
                {!formReady && (
                  <p className="mt-3 text-xs text-[#78716c]">
                    Fill in all shipping fields to enable PayPal.
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-5 text-sm text-[#78716c]">
                PayPal buttons appear here once credentials are configured.
              </p>
            )}
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

          {!paypalReady && directOrdersAllowed && (
            <button
              type="submit"
              disabled={submitting || !formReady}
              className="btn-primary mt-6 w-full py-3.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Processing..." : `Place Order — ${formatUsd(total)}`}
            </button>
          )}

          {demoCheckoutEnabled && formReady && (
            <p className="mt-4 text-center text-xs text-[#a8a29e]">
              Or use the green test button in Payment ↑
            </p>
          )}

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
