"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CatalogImage } from "@/components/catalog-image";
import { copy } from "@/data/brand";
import { useCart } from "@/context/cart-context";
import { cartLineKey } from "@/lib/catalog/variants";
import { formatUsd } from "@/lib/format";
import { calculateShipping } from "@/lib/pricing";
import { readTrafficAttribution, recordTrafficEvent } from "@/lib/traffic/client";


export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem, clearCart } = useCart();

  const shipping = subtotal === 0 ? 0 : calculateShipping(subtotal);
  const total = subtotal + shipping;

  useEffect(() => {
    if (items.length === 0) return;
    recordTrafficEvent({
      type: "view_cart",
      path: "/cart",
      ...readTrafficAttribution(),
    });
  }, [items.length]);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <h1 className="text-2xl font-semibold text-[#1c1917]">
          Your cart is empty
        </h1>
        <p className="mt-3 text-base text-[#78716c]">{copy.emptyCart}</p>
        <Link href="/products" className="btn-primary mt-8 px-8 py-3">
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-3 py-4 sm:px-6 sm:py-10">
      <div className="mb-4 flex items-center justify-between sm:mb-8">
        <h1 className="section-title text-xl sm:text-2xl">Shopping Cart</h1>
        <button
          type="button"
          onClick={clearCart}
          className="text-sm text-[#a8a29e] hover:text-[#57534e]"
        >
          Clear cart
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {items.map(({ product, quantity, variantId, variantLabel }) => {
            const lineKey = cartLineKey(product.id, variantId ?? product.cjVid);
            return (
            <div key={lineKey} className="card flex gap-3 p-3 sm:gap-4 sm:p-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#f5f5f4] sm:h-24 sm:w-24 sm:rounded-xl">
                <CatalogImage
                  src={product.image}
                  candidates={product.images}
                  alt={product.name}
                  fill
                  className="object-contain p-1"
                  sizes="96px"
                />
              </div>
              <div className="flex flex-1 flex-col">
                <Link
                  href={`/products/${product.slug}`}
                  className="line-clamp-2 text-sm font-medium text-[#1c1917] hover:text-[#4d7366]"
                >
                  {product.name}
                </Link>
                {variantLabel && (
                  <p className="mt-1 text-xs text-[#78716c]">{variantLabel}</p>
                )}
                <p className="price-current mt-2">{formatUsd(product.price)}</p>
                <div className="mt-auto flex items-center gap-4 pt-3">
                  <div className="flex items-center rounded-full border border-[#e7e5e4]">
                    <button
                      type="button"
                      onClick={() => updateQuantity(lineKey, quantity - 1)}
                      className="px-3 py-1.5 text-[#78716c] hover:text-[#1c1917]"
                    >
                      −
                    </button>
                    <span className="px-3 py-1.5 text-sm font-medium">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(lineKey, quantity + 1)}
                      className="px-3 py-1.5 text-[#78716c] hover:text-[#1c1917]"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(lineKey)}
                    className="text-sm text-[#a8a29e] hover:text-[#57534e]"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          );
          })}
        </div>

        <div className="card h-fit p-4 sm:p-6">
          <h2 className="text-base font-semibold text-[#1c1917]">
            Order Summary
          </h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between text-[#78716c]">
              <dt>Subtotal</dt>
              <dd className="font-medium text-[#1c1917]">
                {formatUsd(subtotal)}
              </dd>
            </div>
            <div className="flex justify-between text-[#78716c]">
              <dt>Shipping</dt>
              <dd className="font-medium text-[#1c1917]">
                {shipping === 0 ? "Free" : formatUsd(shipping)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-[#f5f5f4] pt-4">
              <dt className="font-semibold text-[#1c1917]">Total</dt>
              <dd className="text-lg font-semibold text-[#1c1917]">
                {formatUsd(total)}
              </dd>
            </div>
          </dl>
          <Link href="/checkout" className="btn-primary mt-6 w-full py-3">
            Proceed to Checkout
          </Link>
          <p className="mt-3 text-center text-xs leading-relaxed text-[#78716c]">
            {copy.cartTrust}
          </p>
          <p className="mt-2 text-center text-xs text-[#a8a29e]">
            Payment trouble?{" "}
            <Link href="/checkout" className="font-medium text-[#5f8a7a] hover:underline">
              Report on checkout
            </Link>
          </p>
          <Link
            href="/products"
            className="mt-4 block text-center text-sm font-medium text-[#5f8a7a] hover:text-[#4d7366]"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
