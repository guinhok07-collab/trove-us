import Link from "next/link";
import { brand, copy } from "@/data/brand";
import { AboutSection, GuaranteeBanner } from "@/components/about-section";
import { BundleCard } from "@/components/bundle-card";
import { MobileCategoryGrid } from "@/components/category-nav";
import { HeroBanner, StoreQuickNav, TrustBadges } from "@/components/hero-banner";
import { PromoBanner } from "@/components/promo-banner";
import { ProductGrid } from "@/components/product-grid";
import { bundles } from "@/data/bundles";
import { StorePortalGrid } from "@/components/store-portal";
import {
  getVisibleBestsellersByStore,
  getVisibleProducts,
  sortProductsByPriceAsc,
} from "@/lib/catalog/visible-products";
import { storeList } from "@/data/stores";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const visibleProducts = await getVisibleProducts();
  const visibleSlugs = new Set(visibleProducts.map((product) => product.slug));

  const storeCounts = Object.fromEntries(
    storeList.map((store) => [
      store.id,
      visibleProducts.filter((product) => product.store === store.id).length,
    ]),
  );

  const visibleBundles = bundles.filter((bundle) =>
    bundle.productSlugs.every((slug) => visibleSlugs.has(slug)),
  );

  const globalBestsellers = [...visibleProducts]
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 12);

  const shopMorePicks = sortProductsByPriceAsc(visibleProducts).slice(0, 12);

  const heroTiles = storeList.map((store) => ({
    store,
    image: visibleProducts.find((product) => product.store === store.id)?.image,
  }));

  const storeBestsellers = await Promise.all(
    storeList.map(async (store) => ({
      store,
      products: await getVisibleBestsellersByStore(store.id, 4),
    })),
  );

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-3 sm:px-6 sm:py-10">
      <HeroBanner heroTiles={heroTiles} />

      <MobileCategoryGrid className="mt-4 md:hidden" />

      <section id="bestsellers" className="mt-4 scroll-mt-36 sm:mt-8 sm:scroll-mt-32">
        <div className="mb-3 flex items-end justify-between gap-3 sm:mb-5">
          <div>
            <h2 className="section-title">{copy.bestSellers}</h2>
            <p className="section-subtitle mt-0.5 text-xs sm:mt-1 sm:text-[15px]">
              {copy.bestSellersSub}
            </p>
          </div>
          <Link
            href="/products"
            className="shrink-0 text-xs font-semibold text-[#5f8a7a] hover:text-[#4d7366] sm:text-sm"
          >
            View all →
          </Link>
        </div>
        <ProductGrid products={globalBestsellers} variant="compact" />
      </section>

      <StoreQuickNav className="hidden md:block" />

      <section className="mt-5 sm:mt-10">
        <div className="mb-3 flex items-end justify-between gap-3 sm:mb-5">
          <div>
            <h2 className="section-title">{copy.shopMoreTitle}</h2>
            <p className="section-subtitle mt-0.5 hidden text-xs sm:mt-1 sm:block sm:text-[15px]">
              {copy.shopMoreSub}
            </p>
          </div>
          <Link
            href="/products"
            className="shrink-0 text-xs font-semibold text-[#5f8a7a] hover:text-[#4d7366] sm:text-sm"
          >
            {visibleProducts.length} items →
          </Link>
        </div>
        <ProductGrid products={shopMorePicks} variant="compact" />
      </section>

      <PromoBanner />

      <div id="departments" className="mt-6 sm:mt-12">
        <StorePortalGrid stores={storeList} counts={storeCounts} />
      </div>

      <section id="bundles" className="mt-6 scroll-mt-28 sm:mt-12 sm:scroll-mt-32">
        <div className="mb-4 sm:mb-6">
          <h2 className="section-title">{copy.bundlesTitle}</h2>
          <p className="section-subtitle mt-0.5 text-xs sm:mt-1 sm:text-[15px]">
            {copy.bundlesSub}
          </p>
        </div>
        <div className="grid gap-3 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visibleBundles.map((bundle) => (
            <BundleCard key={bundle.id} bundle={bundle} />
          ))}
        </div>
      </section>

      {storeBestsellers.map(({ store, products: bestsellers }) => (
        <section key={store.id} className="mt-6 sm:mt-12">
          <div className="mb-3 flex items-end justify-between gap-3 sm:mb-5">
            <div>
              <h2 className="section-title">{store.name}</h2>
              <p className="section-subtitle mt-0.5 hidden text-xs sm:mt-1 sm:block sm:text-[15px]">
                {store.tagline}
              </p>
            </div>
            <Link
              href={`/stores/${store.id}`}
              className="shrink-0 text-xs font-semibold text-[#5f8a7a] hover:text-[#4d7366] sm:text-sm"
            >
              View all →
            </Link>
          </div>
          <ProductGrid products={bestsellers} variant="compact" />
        </section>
      ))}

      <TrustBadges />
      <AboutSection />

      <GuaranteeBanner />

      <section className="mt-6 mb-2 rounded-xl border border-[#e7e5e4] bg-white px-4 py-5 text-center sm:mt-10 sm:mb-4 sm:rounded-3xl sm:px-8 sm:py-10">
        <h2 className="section-title">{copy.promiseTitle}</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#57534e] sm:mt-4 sm:text-base">
          {copy.promiseText}
        </p>
        <p className="mt-4 text-xs text-[#a8a29e] sm:mt-5 sm:text-sm">{brand.trustLine}</p>
      </section>
    </div>
  );
}
