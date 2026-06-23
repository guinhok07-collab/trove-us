import Link from "next/link";
import { ProductGrid } from "@/components/product-grid";
import {
  ProductPagination,
  buildProductsHrefBase,
  paginate,
} from "@/components/product-pagination";
import { storeLabels } from "@/data/products";
import { getVisibleProducts, sortProductsByPriceAsc } from "@/lib/catalog/visible-products";
import { storeList } from "@/data/stores";
import { StoreCategory } from "@/types/product";

export const dynamic = "force-dynamic";

interface ProductsPageProps {
  searchParams: Promise<{ store?: string; q?: string; page?: string }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const store = params.store as StoreCategory | undefined;
  const query = params.q?.toLowerCase().trim();
  const pageNum = Math.max(1, Number(params.page) || 1);

  let filtered = await getVisibleProducts();

  if (store && store in storeLabels) {
    filtered = filtered.filter((p) => p.store === store);
  }

  if (query) {
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        storeLabels[p.store].toLowerCase().includes(query) ||
        p.tags.some((t) => t.includes(query)),
    );
  }

  filtered = sortProductsByPriceAsc(filtered);

  const { items, currentPage, totalPages, perPage, totalItems } = paginate(
    filtered,
    pageNum,
  );

  const hrefBase = buildProductsHrefBase({ store, q: params.q });

  const title = store
    ? storeLabels[store]
    : query
      ? `Results for "${params.q}"`
      : "All Products";

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8">
        <h1 className="section-title text-2xl sm:text-3xl">{title}</h1>
        <p className="section-subtitle mt-2">
          {totalItems} product{totalItems !== 1 ? "s" : ""} · Prices in USD
        </p>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        <Link
          href="/products"
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            !store
              ? "bg-[#1c1917] text-white"
              : "border border-[#e7e5e4] bg-white text-[#57534e] hover:border-[#5f8a7a]/40"
          }`}
        >
          All
        </Link>
        {storeList.map((s) => (
          <Link
            key={s.id}
            href={`/products?store=${s.id}`}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              store === s.id
                ? "bg-[#5f8a7a] text-white"
                : "border border-[#e7e5e4] bg-white text-[#57534e] hover:border-[#5f8a7a]/40"
            }`}
          >
            {s.name}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <p className="text-[#57534e]">No products found.</p>
          <Link
            href="/products"
            className="mt-4 inline-block text-sm font-semibold text-[#5f8a7a]"
          >
            Browse all products
          </Link>
        </div>
      ) : (
        <>
          <ProductGrid products={items} variant="compact" />
          <ProductPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            perPage={perPage}
            hrefBase={hrefBase}
          />
        </>
      )}
    </div>
  );
}
