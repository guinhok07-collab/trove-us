"use client";

import { useState } from "react";
import { Product } from "@/types/product";
import { useCart } from "@/context/cart-context";
import { trackEvent } from "@/lib/analytics";
import { trackMetaAddToCart } from "@/lib/meta-pixel";

interface AddToCartButtonProps {
  product: Product;
  className?: string;
}

export function AddToCartButton({ product, className = "" }: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleClick() {
    addItem(product);
    trackEvent(product.store, "add_to_cart", product.id);
    trackMetaAddToCart({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!product.inStock}
      className={`btn-primary px-8 py-3.5 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {added ? "Added to cart ✓" : product.inStock ? "Add to Cart" : "Out of Stock"}
    </button>
  );
}
