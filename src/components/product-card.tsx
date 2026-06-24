"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { storeLabels } from "@/data/products";
import { saveBrowseReturn } from "@/lib/browse-return";
import { Product } from "@/types/product";
import { calcDiscount, formatUsd } from "@/lib/format";

const FALLBACK_IMAGE =
  "https://cf.cjdropshipping.com/8c2a47b2-cff5-43ef-9950-1b0e517b85d7.png";

interface ProductCardProps {
  product: Product;
  variant?: "default" | "compact";
}

export function ProductCard({ product, variant = "default" }: ProductCardProps) {
  const discount = calcDiscount(product.price, product.compareAtPrice);
  const [imageSrc, setImageSrc] = useState(product.image);
  const compact = variant === "compact";

  return (
    <Link
      id={`browse-${product.slug}`}
      href={`/products/${product.slug}`}
      onClick={() => saveBrowseReturn(product.slug)}
      className={`group flex flex-col overflow-hidden border border-[#e7e5e4] bg-white transition duration-200 hover:border-[#d6d3d1] hover:shadow-[0_4px_20px_rgb(28_25_23_/6%)] scroll-mt-20 sm:scroll-mt-28 ${
        compact ? "rounded-xl" : "rounded-xl sm:rounded-2xl hover:shadow-[0_8px_30px_rgb(28_25_23_/6%)]"
      }`}
    >
      <div
        className={`relative overflow-hidden bg-[#f5f5f4] ${
          compact ? "aspect-square" : "aspect-square sm:aspect-[4/5]"
        }`}
      >
        <Image
          src={imageSrc}
          alt={product.name}
          fill
          className="object-contain p-2 transition duration-500 group-hover:scale-[1.02]"
          sizes={
            compact
              ? "(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
              : "(max-width: 768px) 50vw, 25vw"
          }
          onError={() => setImageSrc(FALLBACK_IMAGE)}
        />
        {discount > 0 && (
          <span
            className={`absolute left-2 top-2 rounded-full bg-[#fef2f2] font-semibold text-[#b45309] ${
              compact ? "px-2 py-0.5 text-[10px]" : "left-3 top-3 px-2.5 py-1 text-[11px]"
            }`}
          >
            {compact ? `-${discount}%` : `Save ${discount}%`}
          </span>
        )}
        {product.tags.includes("free-shipping") && (
          <span
            className={`absolute rounded-full bg-white/90 font-medium text-[#4d7366] backdrop-blur-sm ${
              compact
                ? "bottom-2 left-2 px-1.5 py-0.5 text-[9px]"
                : "bottom-3 left-3 px-2.5 py-1 text-[10px]"
            }`}
          >
            {compact ? "Free ship" : "Free shipping"}
          </span>
        )}
      </div>
      <div className={compact ? "flex flex-1 flex-col p-2 sm:p-3" : "flex flex-1 flex-col p-2.5 sm:p-4"}>
        {!compact && (
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#a8a29e]">
            {storeLabels[product.store]}
          </p>
        )}
        <h3
          className={`line-clamp-2 font-medium leading-snug text-[#1c1917] group-hover:text-[#4d7366] ${
            compact ? "mt-0 text-xs sm:text-[13px]" : "mt-1 text-xs sm:mt-1.5 sm:text-sm"
          }`}
        >
          {product.name}
        </h3>
        <div className={`flex items-baseline gap-1.5 ${compact ? "mt-1.5" : "mt-3"}`}>
          <span className={compact ? "text-sm font-semibold text-[#1c1917]" : "price-current"}>
            {formatUsd(product.price)}
          </span>
          {product.compareAtPrice && (
            <span className={compact ? "text-[11px] text-[#a8a29e] line-through" : "price-compare"}>
              {formatUsd(product.compareAtPrice)}
            </span>
          )}
        </div>
        {!compact && (
          <div className="mt-auto flex items-center gap-3 pt-3 text-xs text-[#a8a29e]">
            <span className="flex items-center gap-0.5">
              <span className="text-[#b8956a]">★</span> {product.rating}
            </span>
            <span>{product.sold.toLocaleString()} sold</span>
          </div>
        )}
      </div>
    </Link>
  );
}
