"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Product } from "@/types/product";
import { useCart } from "@/context/cart-context";
import { trackEvent } from "@/lib/analytics";
import { trackMetaAddToCart } from "@/lib/meta-pixel";
import { readTrafficAttribution, recordTrafficEvent } from "@/lib/traffic/client";

interface LandingBuyButtonProps {
  product: Product;
  landingSlug: string;
  label?: string;
  className?: string;
  redirectToCheckout?: boolean;
  onAdded?: () => void;
}

export function LandingBuyButton({
  product,
  landingSlug,
  label,
  className = "",
  redirectToCheckout = false,
  onAdded,
}: LandingBuyButtonProps) {
  const { addItem } = useCart();
  const router = useRouter();
  const [added, setAdded] = useState(false);

  const defaultLabel = product.inStock
    ? `Add to cart — ${formatButtonPrice(product.price)}`
    : "Out of stock";

  function handleClick() {
    if (!product.inStock) return;

    addItem(product);
    trackEvent(product.store, "add_to_cart", product.id);
    trackMetaAddToCart({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
    });
    recordTrafficEvent({
      type: "add_to_cart",
      path: `/lp/${landingSlug}`,
      productSlug: product.slug,
      store: product.store,
      ...readTrafficAttribution(),
    });

    setAdded(true);
    onAdded?.();

    if (redirectToCheckout) {
      router.push("/checkout");
      return;
    }

    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!product.inStock}
      className={`btn-primary w-full px-6 py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-sm ${className}`}
    >
      {added ? "Added to cart ✓" : label ?? defaultLabel}
    </button>
  );
}

interface LandingBundleBuyButtonProps {
  products: Product[];
  landingSlug: string;
  label?: string;
  className?: string;
}

export function LandingBundleBuyButton({
  products,
  landingSlug,
  label = "Add bundle to cart",
  className = "",
}: LandingBundleBuyButtonProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleClick() {
    for (const product of products) {
      if (!product.inStock) return;
      addItem(product);
      trackEvent(product.store, "add_to_cart", product.id);
      trackMetaAddToCart({
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
      });
      recordTrafficEvent({
        type: "add_to_cart",
        path: `/lp/${landingSlug}`,
        productSlug: product.slug,
        store: product.store,
        ...readTrafficAttribution(),
      });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  const inStock = products.every((p) => p.inStock);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!inStock}
      className={`inline-flex items-center justify-center rounded-full border border-[#5f8a7a] bg-white px-6 py-3 text-sm font-semibold text-[#4d7366] transition hover:bg-[#eef4f1] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {added ? "Added to cart ✓" : label}
    </button>
  );
}

function formatButtonPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}
