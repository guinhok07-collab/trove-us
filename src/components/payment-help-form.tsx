"use client";

import { useEffect, useState } from "react";
import { brand } from "@/data/brand";

export interface PaymentHelpDefaults {
  fullName?: string;
  email?: string;
  phone?: string;
  orderId?: string;
  cartTotal?: number;
}

interface PaymentHelpFormProps {
  defaults?: PaymentHelpDefaults;
  lastError?: string | null;
  compact?: boolean;
}

export function PaymentHelpForm({
  defaults,
  lastError,
  compact = false,
}: PaymentHelpFormProps) {
  const [fullName, setFullName] = useState(defaults?.fullName ?? "");
  const [email, setEmail] = useState(defaults?.email ?? "");
  const [phone, setPhone] = useState(defaults?.phone ?? "");
  const [problem, setProblem] = useState(lastError ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaults?.fullName) setFullName(defaults.fullName);
    if (defaults?.email) setEmail(defaults.email);
    if (defaults?.phone) setPhone(defaults.phone);
  }, [defaults?.fullName, defaults?.email, defaults?.phone]);

  useEffect(() => {
    if (lastError) setProblem(lastError);
  }, [lastError]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout/payment-help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          problem,
          orderId: defaults?.orderId,
          cartTotal: defaults?.cartTotal,
          path: "/checkout",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Could not send your message.");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your message.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm text-[#166534]">
        <strong>Message sent.</strong> We received your report and will contact you at{" "}
        {email || "your email"} as soon as possible.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? "space-y-3" : "mt-4 space-y-3"}>
      <p className="text-sm text-[#57534e]">
        Couldn&apos;t pay? Tell us what happened — name, phone, and a short description. We&apos;ll
        reach out to help you finish your order.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full name"
          aria-label="Your name for payment help"
          className="rounded-xl border border-[#e7e5e4] px-4 py-2.5 text-sm outline-none focus:border-[#5f8a7a]/50 sm:col-span-2"
        />
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          aria-label="Your email for payment help"
          className="rounded-xl border border-[#e7e5e4] px-4 py-2.5 text-sm outline-none focus:border-[#5f8a7a]/50"
        />
        <input
          required
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          aria-label="Your phone for payment help"
          className="rounded-xl border border-[#e7e5e4] px-4 py-2.5 text-sm outline-none focus:border-[#5f8a7a]/50"
        />
      </div>

      <textarea
        required
        minLength={10}
        rows={4}
        value={problem}
        onChange={(e) => setProblem(e.target.value)}
        placeholder="What happened? e.g. PayPal showed an error, card declined, page froze..."
        aria-label="Describe the payment problem"
        className="w-full rounded-xl border border-[#e7e5e4] px-4 py-2.5 text-sm outline-none focus:border-[#5f8a7a]/50"
      />

      {error && (
        <p className="text-sm text-[#991b1b]">
          {error} You can also email{" "}
          <a href={`mailto:${brand.supportEmail}`} className="font-medium underline">
            {brand.supportEmail}
          </a>
          .
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-xl border border-[#5f8a7a] bg-white px-4 py-2.5 text-sm font-semibold text-[#3f5f52] hover:bg-[#eef4f1] disabled:opacity-60"
      >
        {submitting ? "Sending..." : "Send report — we'll contact you"}
      </button>
    </form>
  );
}

/** Fire-and-forget auto report when PayPal fails (best-effort). */
export function reportPaymentErrorAuto(payload: {
  problem: string;
  technicalDetail?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  orderId?: string;
  cartTotal?: number;
}) {
  try {
    void fetch("/api/checkout/payment-help", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        source: "auto_client",
        path: "/checkout",
      }),
      keepalive: true,
    });
  } catch {
    /* ignore */
  }
}
