"use client";

import { useEffect, useRef, useState } from "react";
import { formatUsd } from "@/lib/format";
import {
  clearLandingPromo,
  readLandingPromo,
  saveLandingPromo,
} from "@/lib/landing/promo";
import { applyPromoToOrderTotals, resolvePromoCode } from "@/lib/promo/codes";

const PROMO_TTL_MS = 15 * 60 * 1000;

interface CheckoutPromoFieldProps {
  subtotal: number;
  shipping: number;
  promoCode: string;
  onPromoCodeChange: (code: string) => void;
}

export function CheckoutPromoField({
  subtotal,
  shipping,
  promoCode,
  onPromoCodeChange,
}: CheckoutPromoFieldProps) {
  const [input, setInput] = useState(promoCode);
  const [message, setMessage] = useState<string | null>(null);
  const autoApplied = useRef(false);

  useEffect(() => {
    if (autoApplied.current) return;
    autoApplied.current = true;

    const saved = readLandingPromo();
    if (!saved) return;
    if (Date.now() - saved.savedAt > PROMO_TTL_MS) {
      clearLandingPromo();
      return;
    }
    onPromoCodeChange(saved.code);
    setInput(saved.code);
    setMessage(`Code ${saved.code} applied automatically.`);
  }, [onPromoCodeChange]);

  useEffect(() => {
    setInput(promoCode);
  }, [promoCode]);

  const totals = applyPromoToOrderTotals(subtotal, shipping, promoCode);
  const applied = Boolean(totals.promoCode && totals.discount > 0);

  function handleApply(event: React.FormEvent) {
    event.preventDefault();
    const resolved = resolvePromoCode(input);
    if (!resolved) {
      setMessage("Invalid or expired promo code.");
      onPromoCodeChange("");
      return;
    }
    onPromoCodeChange(resolved.code);
    saveLandingPromo(resolved.code, "checkout");
    setMessage(`${resolved.code} applied — ${resolved.definition.label}.`);
  }

  function handleRemove() {
    onPromoCodeChange("");
    setInput("");
    clearLandingPromo();
    setMessage(null);
  }

  return (
    <div className="mt-4 rounded-xl border border-[#e7e5e4] bg-white p-4">
      <p className="text-sm font-semibold text-[#1c1917]">Promo code</p>

      {applied ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#eef4f1] px-3 py-2.5">
          <div>
            <p className="font-mono text-sm font-semibold text-[#4d7366]">
              {totals.promoCode}
            </p>
            <p className="text-xs text-[#78716c]">
              {totals.promoLabel} (−{formatUsd(totals.discount)})
            </p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs font-semibold text-[#78716c] hover:text-[#57534e]"
          >
            Remove
          </button>
        </div>
      ) : (
        <form onSubmit={handleApply} className="mt-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder="SAVE10NOW or TROVE10"
            className="min-w-0 flex-1 rounded-xl border border-[#e7e5e4] px-3 py-2.5 text-sm uppercase outline-none focus:border-[#5f8a7a]/50 focus:ring-2 focus:ring-[#eef4f1]"
            aria-label="Promo code"
          />
          <button
            type="submit"
            className="shrink-0 rounded-full border border-[#5f8a7a] px-4 py-2.5 text-sm font-semibold text-[#4d7366] hover:bg-[#eef4f1]"
          >
            Apply
          </button>
        </form>
      )}

      {message && (
        <p
          className={`mt-2 text-xs ${applied ? "text-[#4d7366]" : "text-[#b45309]"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}

export function clearCheckoutPromo() {
  clearLandingPromo();
}
