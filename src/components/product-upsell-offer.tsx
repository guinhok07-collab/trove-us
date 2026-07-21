"use client";

import { useState } from "react";
import { CatalogImage } from "@/components/catalog-image";
import type { Product } from "@/types/product";
import type { ProductUpsellOffer } from "@/data/product-upsells";
import { useCart } from "@/context/cart-context";
import { formatUsd } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";
import { trackMetaAddToCart } from "@/lib/meta-pixel";

interface ProductUpsellOfferProps {
  product: Product;
  accessory: Product;
  offer: ProductUpsellOffer;
}

export function ProductUpsellOffer({
  product,
  accessory,
  offer,
}: ProductUpsellOfferProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const bundleTotal = product.price + accessory.price;

  function handleAddAccessory() {
    addItem(accessory);
    trackEvent(accessory.store, "add_to_cart", accessory.id);
    trackMetaAddToCart({
      id: accessory.id,
      slug: accessory.slug,
      name: accessory.name,
      price: accessory.price,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  return (
    <section className="mt-8 sm:mt-10">
      <article className="card overflow-hidden border-[#5f8a7a]/20 bg-gradient-to-br from-[#eef4f1]/50 via-white to-white p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[#e7e5e4] bg-white sm:h-20 sm:w-20">
              <CatalogImage
                src={accessory.image}
                candidates={accessory.images}
                alt={accessory.name}
                fill
                className="object-contain p-1.5"
                sizes="80px"
              />
            </div>
            <div>
              <p className="text-label text-[#4d7366]">Frequently bought together</p>
              <h2 className="mt-1 text-base font-semibold text-[#1c1917] sm:text-lg">
                {offer.title}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-[#78716c]">
                {offer.description}
              </p>
              <p className="mt-2 text-sm font-medium text-[#1c1917]">
                {accessory.name} · {formatUsd(accessory.price)}
              </p>
            </div>
          </div>
          <div className="shrink-0 sm:text-right">
            <p className="text-xs text-[#78716c]">
              With {product.name}: {formatUsd(bundleTotal)} total
            </p>
            <button
              type="button"
              onClick={handleAddAccessory}
              className="btn-primary mt-3 w-full px-5 py-2.5 text-sm sm:w-auto"
            >
              {added ? "Added ✓" : offer.ctaLabel ?? "Add to cart"}
            </button>
          </div>
        </div>
      </article>
    </section>
  );
}
