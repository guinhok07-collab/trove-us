import Link from "next/link";
import { brand, copy } from "@/data/brand";
import { AboutSection, GuaranteeBanner } from "@/components/about-section";
import { BundleCard } from "@/components/bundle-card";
import { HeroBanner, StoreQuickNav, TrustBadges } from "@/components/hero-banner";
import { PromoBanner } from "@/components/promo-banner";
import { ProductCard } from "@/components/product-card";
import { bundles } from "@/data/bundles";
import { StorePortalGrid } from "@/components/store-portal";
import { getVisibleBestsellersByStore, getVisibleProducts } from "@/lib/catalog/visible-products";
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
    .slice(0, 8);

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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <HeroBanner heroTiles={heroTiles} />
      <PromoBanner />
      <TrustBadges />

      <section id="bundles" className="mt-14 scroll-mt-24">
        <div className="mb-6">
          <h2 className="section-title">{copy.bundlesTitle}</h2>
          <p className="section-subtitle mt-1">{copy.bundlesSub}</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visibleBundles.map((bundle) => (
            <BundleCard key={bundle.id} bundle={bundle} />
          ))}
        </div>
      </section>

      <div id="departments" className="mt-14">
        <StorePortalGrid stores={storeList} counts={storeCounts} />
      </div>

      <StoreQuickNav />
      <AboutSection />

      {storeBestsellers.map(({ store, products: bestsellers }) => (
        <section key={store.id} className="mt-14">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="section-title">{store.name}</h2>
              <p className="section-subtitle mt-1">{store.tagline}</p>
            </div>
            <Link
              href={`/stores/${store.id}`}
              className="shrink-0 text-sm font-semibold text-[#5f8a7a] hover:text-[#4d7366]"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-5">
            {bestsellers.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ))}

      <section className="card mt-14 p-8">
        <h2 className="section-title">{copy.bestSellers}</h2>
        <p className="section-subtitle mt-2">{copy.bestSellersSub}</p>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-5">
          {globalBestsellers.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <GuaranteeBanner />

      <section className="mt-10 mb-4 rounded-3xl border border-[#e7e5e4] bg-white px-8 py-10 text-center">
        <h2 className="section-title">{copy.promiseTitle}</h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#57534e]">
          {copy.promiseText}
        </p>
        <p className="mt-5 text-sm text-[#a8a29e]">{brand.trustLine}</p>
      </section>
    </div>
  );
}
