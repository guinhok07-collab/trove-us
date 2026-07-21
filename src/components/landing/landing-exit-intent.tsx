"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/types/product";
import type { LandingExitIntent } from "@/data/landing/types";
import { useCart } from "@/context/cart-context";
import { saveLandingPromo } from "@/lib/landing/promo";

interface LandingExitIntentModalProps {
  config: LandingExitIntent;
  product: Product;
  landingSlug: string;
}

export function LandingExitIntentModal({
  config,
  product,
  landingSlug,
}: LandingExitIntentModalProps) {
  const [open, setOpen] = useState(false);
  const { addItem } = useCart();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `trove-exit-intent-${landingSlug}`;
    if (sessionStorage.getItem(key)) return;

    function onMouseOut(event: MouseEvent) {
      if (event.clientY > 0 || open) return;
      sessionStorage.setItem(key, "1");
      setOpen(true);
    }

    document.addEventListener("mouseout", onMouseOut);
    return () => document.removeEventListener("mouseout", onMouseOut);
  }, [landingSlug, open]);

  function handleApply() {
    saveLandingPromo(config.couponCode, landingSlug);
    if (product.inStock) {
      addItem(product);
    }
    setOpen(false);
    router.push("/checkout");
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1c1917]/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-intent-title"
      onClick={() => setOpen(false)}
    >
      <div
        className="card relative w-full max-w-md p-6 text-center sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-[#a8a29e] transition hover:bg-[#f5f5f4] hover:text-[#57534e]"
          aria-label="Close"
        >
          ✕
        </button>

        <p className="text-label text-[#4d7366]">Wait — before you go</p>
        <h2 id="exit-intent-title" className="mt-2 text-xl font-semibold text-[#1c1917] sm:text-2xl">
          {config.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#78716c]">{config.description}</p>

        <p className="mt-5 inline-block rounded-lg border border-dashed border-[#5f8a7a] bg-[#eef4f1] px-4 py-2 font-mono text-sm font-semibold tracking-wide text-[#4d7366]">
          {config.couponCode}
        </p>

        <button
          type="button"
          onClick={handleApply}
          className="btn-primary mt-5 w-full py-3.5"
        >
          {config.ctaLabel ?? "Apply code & checkout"}
        </button>
      </div>
    </div>
  );
}
