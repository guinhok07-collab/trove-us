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

    <>

      <div className="grid gap-5 lg:grid-cols-2 lg:gap-14">

        <ProductGallery

          name={product.name}

          image={display.image}

          images={display.images}

          video={product.video}

        />



        <div className="flex flex-col">

          <Link

            href={`/stores/${product.store}`}

            className="inline-flex w-fit rounded-full bg-[#eef4f1] px-3 py-1 text-xs font-semibold text-[#4d7366]"

          >

            {store.name}

          </Link>



          <h1 className="mt-3 text-xl font-semibold tracking-tight text-[#1c1917] sm:mt-4 sm:text-2xl lg:text-3xl">

            {product.name}

          </h1>



          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#78716c] sm:mt-4 sm:gap-4 sm:text-sm">

            <span className="flex items-center gap-1">

              <span className="text-[#b8956a]">★</span>

              <span className="font-medium text-[#1c1917]">{product.rating}</span>

            </span>

            <span>{product.reviews.toLocaleString()} reviews</span>

            <span>{product.sold.toLocaleString()} sold</span>

          </div>



          <div className="mt-4 flex flex-wrap items-baseline gap-2 border-b border-[#f5f5f4] pb-4 sm:mt-6 sm:gap-3 sm:pb-6 lg:pb-8">

            <span className="text-2xl font-semibold tracking-tight text-[#1c1917] sm:text-3xl">

              {formatUsd(display.price)}

            </span>

            {display.compareAtPrice && (

              <>

                <span className="price-compare text-sm sm:text-base">

                  {formatUsd(display.compareAtPrice)}

                </span>

                {discount > 0 && (

                  <span className="rounded-full bg-[#fef3e7] px-2 py-0.5 text-[11px] font-semibold text-[#b45309] sm:px-2.5 sm:py-1 sm:text-xs">

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



          <p className="mt-4 text-sm leading-relaxed text-[#57534e] sm:mt-6 sm:text-base">

            {product.longDescription}

          </p>



          <ul className="mt-4 space-y-2 sm:mt-6 sm:space-y-3">

            {product.features.map((f) => (

              <li

                key={f}

                className="flex items-start gap-2.5 text-xs text-[#57534e] sm:gap-3 sm:text-sm"

              >

                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#eef4f1] text-[9px] text-[#4d7366] sm:h-5 sm:w-5 sm:text-[10px]">

                  ✓

                </span>

                {f}

              </li>

            ))}

          </ul>



          <div className="mt-4 flex flex-wrap gap-1.5 sm:mt-6 sm:gap-2">

            <span className="rounded-full bg-[#eef4f1] px-2.5 py-1 text-[11px] font-medium text-[#4d7366] sm:px-3 sm:py-1.5 sm:text-xs">

              {copy.productDelivery}

            </span>

            <span className="rounded-full bg-[#f5f5f4] px-2.5 py-1 text-[11px] font-medium text-[#78716c] sm:px-3 sm:py-1.5 sm:text-xs">

              {copy.productShipsUs}

            </span>

            {product.tags.includes("free-shipping") && (

              <span className="rounded-full bg-[#fef3e7] px-2.5 py-1 text-[11px] font-medium text-[#b45309] sm:px-3 sm:py-1.5 sm:text-xs">

                Free shipping eligible

              </span>

            )}

          </div>



          <div className="mt-6 hidden gap-3 pt-2 sm:flex sm:flex-wrap lg:pt-6">

            <AddToCartButton

              product={display}

              variantId={selected?.id}

              variantLabel={selected?.label}

            />

            <Link

              href="/cart"

              className="inline-flex items-center rounded-full border border-[#d6d3d1] px-6 py-3 text-sm font-semibold text-[#44403c] transition hover:border-[#5f8a7a]/40 hover:text-[#4d7366] sm:px-8 sm:py-3.5"

            >

              View Cart

            </Link>

          </div>

        </div>

      </div>



      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e7e5e4] bg-[#faf9f7]/95 px-3 py-2.5 backdrop-blur-md pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:hidden">

        <div className="mx-auto flex max-w-lg items-center gap-3">

          <div className="min-w-0 shrink-0">

            <p className="text-lg font-semibold leading-none text-[#1c1917]">

              {formatUsd(display.price)}

            </p>

            {selected?.label && (

              <p className="mt-0.5 truncate text-[10px] text-[#78716c]">{selected.label}</p>

            )}

          </div>

          <AddToCartButton

            product={display}

            variantId={selected?.id}

            variantLabel={selected?.label}

            className="min-w-0 flex-1 px-4 py-3"

          />

        </div>

      </div>

    </>

  );

}

