import { ProductCard } from "@/components/product-card";
import type { Product } from "@/types/product";

interface ProductGridProps {
  products: Product[];
  variant?: "default" | "compact";
  className?: string;
}

export function ProductGrid({
  products,
  variant = "default",
  className = "",
}: ProductGridProps) {
  const compact = variant === "compact";

  return (
    <div
      className={
        compact
          ? `grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 ${className}`
          : `grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5 ${className}`
      }
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} variant={variant} />
      ))}
    </div>
  );
}
