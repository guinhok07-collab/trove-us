"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductGallery } from "@/components/product-gallery";
import { ProductVariantPicker } from "@/components/product-variant-picker";
import { copy } from "@/data/brand";
import { stores } from "@/data/stores";
import {
  applyVariant,
  findVariant,
  getDefaultVariantId,
  getProductVariants,
} from "@/lib/catalog/variants";
import { calcDiscount, formatUsd } from "@/lib/format";
import type { Product } from "@/types/product";

interface ProductDetailClientProps {
  product: Product;
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const variants = getProductVariants(product);
  const defaultId = getDefaultVariantId(product) ?? variants[0]?.id ?? "";
  const [selectedVariantId, setSelectedVariantId] = useState(defaultId);

  const selected = useMemo(
    () => findVariant(product, selectedVariantId),
    [product, selectedVariantId],
  );

  const display = useMemo(
    () => applyVariant(product, selected?.id),
    [product, selected?.id],
  );

  const discount = calcDiscount(display.price, display.compareAtPrice);
  const store = stores[product.store];

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
      <ProductGallery
        name={product.name}
        image={display.image}
        images={display.images}
        video={product.video}
      />

      <div className="flex flex-col">
        <Link
          href={`/stores/${product.store}`}
          className="inline-flex w-fit rounded-full bg-[#eef4f1] px-3.5 py-1.5 text-xs font-semibold text-[#4d7366]"
        >
          {store.name}
        </Link>

        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#1c1917] sm:text-3xl">
          {product.name}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[#78716c]">
          <span className="flex items-center gap-1">
            <span className="text-[#b8956a]">★</span>
            <span className="font-medium text-[#1c1917]">{product.rating}</span>
          </span>
          <span>{product.reviews.toLocaleString()} reviews</span>
          <span>{product.sold.toLocaleString()} sold</span>
        </div>

        <div className="mt-8 flex flex-wrap items-baseline gap-3 border-b border-[#f5f5f4] pb-8">
          <span className="text-3xl font-semibold tracking-tight text-[#1c1917]">
            {formatUsd(display.price)}
          </span>
          {display.compareAtPrice && (
            <>
              <span className="price-compare text-base">
                {formatUsd(display.compareAtPrice)}
              </span>
              {discount > 0 && (
                <span className="rounded-full bg-[#fef3e7] px-2.5 py-1 text-xs font-semibold text-[#b45309]">
                  Save {discount}%
                </span>
              )}
            </>
          )}
        </div>

        {variants.length > 1 && (
          <ProductVariantPicker
            variants={variants}
            selectedId={selected?.id ?? defaultId}
            onSelect={setSelectedVariantId}
          />
        )}

        <p className="mt-6 text-base leading-relaxed text-[#57534e]">
          {product.longDescription}
        </p>

        <ul className="mt-6 space-y-3">
          {product.features.map((f) => (
            <li
              key={f}
              className="flex items-start gap-3 text-sm text-[#57534e]"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#eef4f1] text-[10px] text-[#4d7366]">
                ✓
              </span>
              {f}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap gap-2">
          <span className="rounded-full bg-[#eef4f1] px-3 py-1.5 text-xs font-medium text-[#4d7366]">
            {copy.productDelivery}
          </span>
          <span className="rounded-full bg-[#f5f5f4] px-3 py-1.5 text-xs font-medium text-[#78716c]">
            {copy.productShipsUs}
          </span>
          {product.tags.includes("free-shipping") && (
            <span className="rounded-full bg-[#fef3e7] px-3 py-1.5 text-xs font-medium text-[#b45309]">
              Free shipping eligible
            </span>
          )}
        </div>

        <div className="mt-auto flex flex-wrap gap-3 pt-10">
          <AddToCartButton
            product={display}
            variantId={selected?.id}
            variantLabel={selected?.label}
          />
          <Link
            href="/cart"
            className="inline-flex items-center rounded-full border border-[#d6d3d1] px-8 py-3.5 text-sm font-semibold text-[#44403c] transition hover:border-[#5f8a7a]/40 hover:text-[#4d7366]"
          >
            View Cart
          </Link>
        </div>
      </div>
    </div>
  );
}
