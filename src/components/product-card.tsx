import Image from "next/image";
import Link from "next/link";
import { storeLabels } from "@/data/products";
import { Product } from "@/types/product";
import { calcDiscount, formatUsd } from "@/lib/format";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const discount = calcDiscount(product.price, product.compareAtPrice);

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[#e7e5e4] bg-white transition duration-300 hover:border-[#d6d3d1] hover:shadow-[0_8px_30px_rgb(28_25_23_/6%)]"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-[#f5f5f4]">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
        {discount > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-[#fef2f2] px-2.5 py-1 text-[11px] font-semibold text-[#b45309]">
            Save {discount}%
          </span>
        )}
        {product.tags.includes("free-shipping") && (
          <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-medium text-[#4d7366] backdrop-blur-sm">
            Free shipping
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[#a8a29e]">
          {storeLabels[product.store]}
        </p>
        <h3 className="mt-1.5 line-clamp-2 text-sm font-medium leading-snug text-[#1c1917] group-hover:text-[#4d7366]">
          {product.name}
        </h3>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="price-current">{formatUsd(product.price)}</span>
          {product.compareAtPrice && (
            <span className="price-compare">
              {formatUsd(product.compareAtPrice)}
            </span>
          )}
        </div>
        <div className="mt-auto flex items-center gap-3 pt-3 text-xs text-[#a8a29e]">
          <span className="flex items-center gap-0.5">
            <span className="text-[#b8956a]">★</span> {product.rating}
          </span>
          <span>{product.sold.toLocaleString()} sold</span>
        </div>
      </div>
    </Link>
  );
}
