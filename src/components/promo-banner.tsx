"use client";

import Image from "next/image";
import Link from "next/link";
import { copy } from "@/data/brand";
import { getProductBySlug } from "@/data/products";
import { saveBrowseReturn } from "@/lib/browse-return";
import { formatUsd } from "@/lib/format";

export function PromoBanner() {
  const product = getProductBySlug("percussion-massage-gun");
  if (!product) return null;

  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-[#bbf7d0] bg-gradient-to-r from-[#f0fdf4] via-white to-[#eef4f1] sm:mt-10 sm:rounded-2xl">
      <div className="grid items-center gap-4 p-4 sm:grid-cols-[1fr_auto] sm:gap-6 sm:p-8">
        <div>
          <p className="text-label text-[10px] text-[#166534] sm:text-[11px]">{copy.promoBadge}</p>
          <h2 className="mt-1.5 text-base font-semibold text-[#1c1917] sm:mt-2 sm:text-2xl">
            {copy.promoTitle}
          </h2>
          <p className="mt-1.5 hidden max-w-lg text-sm leading-relaxed text-[#57534e] sm:block sm:mt-2">
            {copy.promoText}
          </p>
          <p className="mt-2 text-base font-semibold text-[#4d7366] sm:mt-3 sm:text-lg">
            {formatUsd(product.price)}{" "}
            <span className="text-xs font-normal text-[#78716c] sm:text-sm">
              delivered · free shipping
            </span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2 sm:mt-5 sm:gap-3">
            <Link
              href={`/products/${product.slug}`}
              onClick={() => saveBrowseReturn(product.slug)}
              className="btn-primary px-4 py-2 text-sm sm:px-5 sm:py-2.5"
            >
              Shop deal
            </Link>
            <Link
              href="#bundles"
              className="inline-flex items-center rounded-full border border-[#d6d3d1] bg-white px-4 py-2 text-xs font-semibold text-[#44403c] transition hover:border-[#5f8a7a] hover:text-[#4d7366] sm:px-5 sm:py-2.5 sm:text-sm"
            >
              View kits
            </Link>
          </div>
        </div>
        <div className="relative mx-auto h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-[#e7e5e4] bg-white sm:h-40 sm:w-40 sm:rounded-2xl">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
            sizes="160px"
          />
        </div>
      </div>
    </section>
  );
}
