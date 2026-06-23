"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { ProductBundle } from "@/data/bundles";
import { getBundleProducts, getBundleSubtotal } from "@/data/bundles";
import { useCart } from "@/context/cart-context";
import { saveBrowseReturn } from "@/lib/browse-return";
import { calculateShipping, FREE_SHIPPING_MIN } from "@/lib/pricing";
import { formatUsd } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";
import { trackMetaAddToCart } from "@/lib/meta-pixel";

interface BundleCardProps {
  bundle: ProductBundle;
}

export function BundleCard({ bundle }: BundleCardProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const products = getBundleProducts(bundle);
  const subtotal = getBundleSubtotal(bundle);
  const shipping = calculateShipping(subtotal);
  const total = subtotal + shipping;
  const freeShipping = subtotal >= FREE_SHIPPING_MIN;

  if (products.length === 0) return null;

  function handleAddAll() {
    for (const product of products) {
      addItem(product);
      trackEvent(product.store, "add_to_cart", product.id);
      trackMetaAddToCart({
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
      });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  return (
    <article className="card flex h-full flex-col overflow-hidden">
      <div className="grid grid-cols-3 gap-1 border-b border-[#f5f5f4] bg-[#fafaf9] p-2">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.slug}`}
            onClick={() => saveBrowseReturn(product.slug)}
            className="relative aspect-square overflow-hidden rounded-lg bg-white"
          >
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover"
              sizes="120px"
            />
          </Link>
        ))}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-base font-semibold text-[#1c1917]">{bundle.name}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-[#78716c]">
          {bundle.tagline}
        </p>

        <ul className="mt-3 space-y-1 text-xs text-[#57534e]">
          {products.map((p) => (
            <li key={p.id} className="flex justify-between gap-2">
              <span className="line-clamp-1">{p.name}</span>
              <span className="shrink-0 font-medium">{formatUsd(p.price)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto w-full pt-4">
          <div className="border-t border-[#f5f5f4] pt-4 text-sm">
            <div className="flex justify-between text-[#78716c]">
              <span>Kit subtotal</span>
              <span>{formatUsd(subtotal)}</span>
            </div>
            <div className="mt-1 flex justify-between text-[#78716c]">
              <span>Shipping</span>
              <span>{shipping === 0 ? "Free" : formatUsd(shipping)}</span>
            </div>
            <div className="mt-2 flex justify-between font-semibold text-[#1c1917]">
              <span>Total</span>
              <span>{formatUsd(total)}</span>
            </div>
          </div>

          {bundle.highlight && (
            <p
              className={`mt-3 min-h-[2.5rem] text-xs font-medium ${freeShipping ? "text-[#4d7366]" : "text-[#78716c]"}`}
            >
              {freeShipping ? "✓ Free shipping on this kit" : bundle.highlight}
            </p>
          )}

          <button
            type="button"
            onClick={handleAddAll}
            className="btn-primary mt-5 w-full py-3"
          >
            {added ? "Added to cart ✓" : "Add kit to cart"}
          </button>
        </div>
      </div>
    </article>
  );
}
