"use client";

import Image from "next/image";
import Link from "next/link";
import { copy } from "@/data/brand";
import { getProductBySlug } from "@/data/products";
import { saveBrowseReturn } from "@/lib/browse-return";
import { formatUsd } from "@/lib/format";
import { calculateShipping } from "@/lib/pricing";

export function PromoBanner() {
  const product = getProductBySlug("percussion-massage-gun");
  if (!product) return null;

  const total = product.price + calculateShipping(product.price);

  return (
    <section className="mt-10 overflow-hidden rounded-2xl border border-[#bbf7d0] bg-gradient-to-r from-[#f0fdf4] via-white to-[#eef4f1]">
      <div className="grid items-center gap-6 p-6 sm:grid-cols-[1fr_auto] sm:p-8">
        <div>
          <p className="text-label text-[#166534]">{copy.promoBadge}</p>
          <h2 className="mt-2 text-xl font-semibold text-[#1c1917] sm:text-2xl">
            {copy.promoTitle}
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#57534e]">
            {copy.promoText}
          </p>
          <p className="mt-3 text-lg font-semibold text-[#4d7366]">
            {formatUsd(product.price)}{" "}
            <span className="text-sm font-normal text-[#78716c]">
              + {calculateShipping(product.price) === 0 ? "free shipping" : `${formatUsd(calculateShipping(product.price))} shipping`} · from {formatUsd(total)} delivered
            </span>
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`/products/${product.slug}`}
              onClick={() => saveBrowseReturn(product.slug)}
              className="btn-primary px-5 py-2.5"
            >
              Shop deal
            </Link>
            <Link
              href="#bundles"
              className="inline-flex items-center rounded-full border border-[#d6d3d1] bg-white px-5 py-2.5 text-sm font-semibold text-[#44403c] transition hover:border-[#5f8a7a] hover:text-[#4d7366]"
            >
              View kits
            </Link>
          </div>
        </div>
        <div className="relative mx-auto h-36 w-36 shrink-0 overflow-hidden rounded-2xl border border-[#e7e5e4] bg-white sm:h-40 sm:w-40">
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
