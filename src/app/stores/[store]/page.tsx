import Link from "next/link";
import { brand, copy } from "@/data/brand";
import { ProductGrid } from "@/components/product-grid";
import { ProductPagination, paginate } from "@/components/product-pagination";
import { StoreIcon } from "@/components/icons";
import { TrackStoreView } from "@/components/track-analytics";
import { getVisibleProductsByStore } from "@/lib/catalog/visible-products";
import { getStore, storeList } from "@/data/stores";
import { StoreCategory } from "@/types/product";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface StorePageProps {
  params: Promise<{ store: string }>;
  searchParams: Promise<{ page?: string }>;
}

export function generateStaticParams() {
  return storeList.map((s) => ({ store: s.id }));
}

export default async function StorePage({ params, searchParams }: StorePageProps) {
  const { store: storeId } = await params;
  const sp = await searchParams;
  const pageNum = Math.max(1, Number(sp.page) || 1);

  if (!storeList.some((s) => s.id === storeId)) notFound();

  const store = getStore(storeId as StoreCategory);
  const storeProducts = await getVisibleProductsByStore(store.id);
  const { items, currentPage, totalPages, perPage, totalItems } = paginate(
    storeProducts,
    pageNum,
  );

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-10">
      <TrackStoreView store={store.id} />

      <nav className="mb-3 text-xs text-[#a8a29e] sm:mb-6 sm:text-sm">
        <Link href="/" className="hover:text-[#4d7366]">
          {brand.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[#57534e]">{store.name}</span>
      </nav>

      <section
        className={`rounded-xl border border-[#e7e5e4] bg-gradient-to-br ${store.bgGradient} px-4 py-4 sm:rounded-3xl sm:px-10 sm:py-8`}
      >
        <div className="flex items-start gap-3 sm:block">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/70 shadow-sm sm:mt-0 sm:h-14 sm:w-14 sm:rounded-2xl">
            <StoreIcon store={store.id} size="lg" variant="white" />
          </span>
          <div className="min-w-0 flex-1 sm:mt-5">
            <h1 className="text-xl font-semibold tracking-tight text-[#1c1917] sm:text-4xl">
              {store.name}
            </h1>
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[#57534e] sm:mt-3 sm:line-clamp-none sm:text-base">
              {store.description}
            </p>
            <p className="mt-2 text-xs font-medium text-[#78716c] sm:mt-4 sm:text-sm">
              {totalItems} products · {copy.productDelivery}
            </p>
          </div>
        </div>
      </section>

      <ProductGrid products={items} variant="compact" className="mt-4 sm:mt-8" />
      <ProductPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        perPage={perPage}
        hrefBase={`/stores/${store.id}`}
      />

      <div className="mt-8 text-center sm:mt-12">
        <Link
          href="/"
          className="text-sm font-semibold text-[#5f8a7a] hover:text-[#4d7366]"
        >
          ← Back to {brand.name}
        </Link>
      </div>
    </div>
  );
}
