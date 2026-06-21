import Link from "next/link";
import { brand, copy } from "@/data/brand";
import { ProductCard } from "@/components/product-card";
import { StoreIcon } from "@/components/icons";
import { TrackStoreView } from "@/components/track-analytics";
import { getVisibleProductsByStore } from "@/lib/catalog/visible-products";
import { getStore, storeList } from "@/data/stores";
import { StoreCategory } from "@/types/product";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface StorePageProps {
  params: Promise<{ store: string }>;
}

export function generateStaticParams() {
  return storeList.map((s) => ({ store: s.id }));
}

export default async function StorePage({ params }: StorePageProps) {
  const { store: storeId } = await params;

  if (!storeList.some((s) => s.id === storeId)) notFound();

  const store = getStore(storeId as StoreCategory);
  const storeProducts = await getVisibleProductsByStore(store.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <TrackStoreView store={store.id} />

      <nav className="mb-6 text-sm text-[#a8a29e]">
        <Link href="/" className="hover:text-[#4d7366]">
          {brand.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[#57534e]">{store.name}</span>
      </nav>

      <section
        className={`rounded-3xl border border-[#e7e5e4] bg-gradient-to-br ${store.bgGradient} px-6 py-10 sm:px-10`}
      >
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/70 shadow-sm">
          <StoreIcon store={store.id} size="lg" variant="white" />
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-[#1c1917] sm:text-4xl">
          {store.name}
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-[#57534e]">
          {store.description}
        </p>
        <p className="mt-4 text-sm font-medium text-[#78716c]">
          {storeProducts.length} products · {copy.productDelivery}
        </p>
      </section>

      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
        {storeProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <div className="mt-12 text-center">
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
