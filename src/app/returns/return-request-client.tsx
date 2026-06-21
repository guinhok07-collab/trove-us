"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { brand } from "@/data/brand";
import {
  RETURN_FRAUD_RULES,
  RETURN_REASONS,
  RETURN_STEPS,
  type ReturnReasonId,
} from "@/lib/returns/policy";
import type { OrderTrackView } from "@/lib/orders/types";
import { toUserErrorMessage } from "@/lib/user-errors";

interface SubmitSuccess {
  rmaId: string;
  needsPhotos: boolean;
  daysRemaining?: number;
}

function ReturnRequestContent() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<"lookup" | "form" | "done">("lookup");
  const [orderId, setOrderId] = useState(searchParams.get("order") ?? "");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [order, setOrder] = useState<OrderTrackView | null>(null);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [reason, setReason] = useState<ReturnReasonId | "">("");
  const [details, setDetails] = useState("");
  const [unusedConfirmed, setUnusedConfirmed] = useState(false);
  const [noChargebackConfirmed, setNoChargebackConfirmed] = useState(false);
  const [returnShippingConfirmed, setReturnShippingConfirmed] = useState(false);
  const [photoProofConfirmed, setPhotoProofConfirmed] = useState(false);
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SubmitSuccess | null>(null);

  const selectedReason = RETURN_REASONS.find((r) => r.id === reason);

  async function lookupOrder(e: React.FormEvent) {
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
      const found = data.order as OrderTrackView;
      if (found.status === "cancelled") {
        throw new Error("This order was cancelled and cannot be returned.");
      }
      if (found.status === "paid" || found.status === "processing") {
        throw new Error(
          "This order has not shipped yet. Email us if you need to cancel before shipping.",
        );
      }
      setOrder(found);
      setSelectedItems(found.items.map((_, i) => i));
      setStep("form");
    } catch (err) {
      setError(toUserErrorMessage(err, "track"));
    } finally {
      setLoading(false);
    }
  }

  function toggleItem(index: number) {
    setSelectedItems((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  }

  async function submitReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!order || !reason) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/orders/return-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.orderId,
          email: order.email,
          reason,
          itemIndexes: selectedItems,
          details,
          unusedConfirmed,
          noChargebackConfirmed,
          returnShippingConfirmed,
          photoProofConfirmed: selectedReason?.needsPhotos ? photoProofConfirmed : true,
          company,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Could not submit return request.");
      }
      setSuccess({
        rmaId: data.rmaId,
        needsPhotos: data.needsPhotos,
        daysRemaining: data.daysRemaining,
      });
      setStep("done");
    } catch (err) {
      setError(toUserErrorMessage(err, "order"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="section-title text-3xl">Start a return</h1>
      <p className="section-subtitle mt-2">
        Easy for honest returns — verified by order number and email to protect
        against fraud.
      </p>

      {step === "lookup" && (
        <>
          <form onSubmit={lookupOrder} className="card mt-8 space-y-4 p-6">
            <p className="text-sm text-[#57534e]">
              Step 1 — Find your order (must match the email used at checkout).
            </p>
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
              {loading ? "Looking up..." : "Find my order"}
            </button>
          </form>

          <ReturnPolicySummary />
        </>
      )}

      {step === "form" && order && (
        <form onSubmit={submitReturn} className="card mt-8 space-y-5 p-6">
          <div className="rounded-xl border border-[#e7e5e4] bg-[#fafaf9] p-4 text-sm">
            <p className="font-medium text-[#1c1917]">Order {order.orderId}</p>
            <p className="mt-1 text-[#78716c]">{order.statusLabel}</p>
            <button
              type="button"
              onClick={() => {
                setStep("lookup");
                setOrder(null);
                setError(null);
              }}
              className="mt-2 text-xs font-semibold text-[#5f8a7a] hover:underline"
            >
              Use a different order
            </button>
          </div>

          <div>
            <p className="text-sm font-medium text-[#1c1917]">
              Step 2 — Which item(s) are you returning?
            </p>
            <ul className="mt-3 space-y-2">
              {order.items.map((item, index) => (
                <li key={item.name}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#e7e5e4] px-3 py-2.5 text-sm hover:border-[#5f8a7a]/40">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(index)}
                      onChange={() => toggleItem(index)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium text-[#1c1917]">{item.name}</span>
                      <span className="text-[#78716c]"> × {item.quantity}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label htmlFor="reason" className="text-sm font-medium text-[#1c1917]">
              Step 3 — Reason for return
            </label>
            <select
              id="reason"
              required
              value={reason}
              onChange={(e) => {
                setReason(e.target.value as ReturnReasonId);
                setPhotoProofConfirmed(false);
              }}
              className="mt-2 w-full rounded-xl border border-[#e7e5e4] px-4 py-2.5 text-sm outline-none focus:border-[#5f8a7a]/50 focus:ring-2 focus:ring-[#eef4f1]"
            >
              <option value="">Select a reason</option>
              {RETURN_REASONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
            {selectedReason && !selectedReason.sellerPaysReturn && (
              <p className="mt-2 text-xs text-[#78716c]">
                Change-of-mind returns: you pay return shipping if we ask you to
                send the item back.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="details" className="text-sm font-medium text-[#1c1917]">
              Step 4 — Describe the issue (required)
            </label>
            <textarea
              id="details"
              required
              minLength={20}
              maxLength={2000}
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Tell us what happened — include damage details, wrong item received, etc."
              className="mt-2 w-full rounded-xl border border-[#e7e5e4] px-4 py-2.5 text-sm outline-none focus:border-[#5f8a7a]/50 focus:ring-2 focus:ring-[#eef4f1]"
            />
            <p className="mt-1 text-xs text-[#a8a29e]">Minimum 20 characters.</p>
          </div>

          <div className="space-y-3 rounded-xl border border-[#e7e5e4] bg-[#fafaf9] p-4">
            <p className="text-sm font-medium text-[#1c1917]">
              Step 5 — Confirm (required)
            </p>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-[#57534e]">
              <input
                type="checkbox"
                required
                checked={unusedConfirmed}
                onChange={(e) => setUnusedConfirmed(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Item(s) are unused, unworn, and in original packaging with all
                accessories.
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-[#57534e]">
              <input
                type="checkbox"
                required
                checked={noChargebackConfirmed}
                onChange={(e) => setNoChargebackConfirmed(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                I have not filed a PayPal or credit-card chargeback for this order
                and will contact {brand.supportEmail} first.
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-[#57534e]">
              <input
                type="checkbox"
                required
                checked={returnShippingConfirmed}
                onChange={(e) => setReturnShippingConfirmed(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                I understand I must wait for approval before shipping anything back,
                and return shipping may be my cost for change-of-mind returns.
              </span>
            </label>
            {selectedReason?.needsPhotos && (
              <label className="flex cursor-pointer items-start gap-3 text-sm text-[#57534e]">
                <input
                  type="checkbox"
                  required
                  checked={photoProofConfirmed}
                  onChange={(e) => setPhotoProofConfirmed(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  I will reply to the confirmation email with clear photos within 48
                  hours if requested (product, packaging, label, or damage).
                </span>
              </label>
            )}
          </div>

          <input
            type="text"
            name="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden
          />

          {error && (
            <p className="rounded-lg bg-[#fef2f2] px-3 py-2 text-sm text-[#991b1b]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || selectedItems.length === 0}
            className="btn-primary w-full py-3 disabled:opacity-60"
          >
            {loading ? "Submitting..." : "Submit return request"}
          </button>
        </form>
      )}

      {step === "done" && success && (
        <section className="card mt-8 p-6 text-center sm:p-8">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#eef4f1] text-[#4d7366]">
            ✓
          </span>
          <h2 className="mt-4 text-xl font-semibold text-[#1c1917]">
            Return request submitted
          </h2>
          <p className="mt-2 text-sm text-[#78716c]">
            Your RMA number:{" "}
            <strong className="font-mono text-[#1c1917]">{success.rmaId}</strong>
          </p>
          <p className="mt-4 text-sm leading-relaxed text-[#57534e]">
            We sent confirmation to <strong>{email}</strong>. We review requests
            within 1 business day.{" "}
            <strong>Do not ship anything until we email you approval.</strong>
          </p>
          {success.needsPhotos && (
            <p className="mt-3 rounded-lg bg-[#eef4f1] px-4 py-3 text-sm text-[#4d7366]">
              Reply to our email with clear photos within 48 hours so we can
              process your claim faster.
            </p>
          )}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/track" className="btn-primary px-6 py-3">
              Track order
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center rounded-full border border-[#e7e5e4] px-6 py-3 text-sm font-semibold text-[#44403c]"
            >
              Continue shopping
            </Link>
          </div>
        </section>
      )}

      {step !== "lookup" && step !== "done" && <ReturnPolicySummary compact />}
    </div>
  );
}

function ReturnPolicySummary({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`${compact ? "mt-6" : "mt-10"} space-y-6`}>
      {!compact && (
        <div className="rounded-xl border border-[#e7e5e4] bg-white p-6">
          <h2 className="text-base font-semibold text-[#1c1917]">How returns work</h2>
          <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-[#57534e]">
            {RETURN_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="rounded-xl border border-[#fde68a] bg-[#fffbeb] p-6">
        <h2 className="text-base font-semibold text-[#92400e]">
          Fraud prevention (protects you and us)
        </h2>
        <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-[#78716c]">
          {RETURN_FRAUD_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>

      <p className="text-center text-sm text-[#78716c]">
        Questions?{" "}
        <a
          href={`mailto:${brand.supportEmail}`}
          className="font-medium text-[#5f8a7a] hover:underline"
        >
          {brand.supportEmail}
        </a>
        {" · "}
        <Link href="/shipping-returns" className="font-medium text-[#5f8a7a] hover:underline">
          Full return policy
        </Link>
      </p>
    </section>
  );
}

export default function ReturnRequestClient() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-sm text-[#78716c]">Loading...</div>
      }
    >
      <ReturnRequestContent />
    </Suspense>
  );
}
