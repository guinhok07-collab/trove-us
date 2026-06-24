import Image from "next/image";
import Link from "next/link";
import { brand, copy } from "@/data/brand";
import { storeList, storeShortNames } from "@/data/stores";
import type { Store } from "@/types/product";
import { Icon, IconBox } from "@/components/icons";

interface HeroTile {
  store: Store;
  image?: string;
}

interface HeroBannerProps {
  heroTiles: HeroTile[];
}

export function HeroBanner({ heroTiles }: HeroBannerProps) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-[#e7e5e4] bg-gradient-to-br from-[#f5f3ef] via-white to-[#eef4f1] px-3 py-4 sm:rounded-3xl sm:px-10 sm:py-14 lg:px-12">
      <div className="relative z-10 grid items-center gap-4 sm:gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
        <div className="max-w-xl">
          <p className="text-label mb-2 inline-block rounded-full bg-[#eef4f1] px-2.5 py-0.5 text-[10px] text-[#4d7366] sm:mb-4 sm:px-4 sm:py-1.5 sm:text-[11px]">
            {copy.heroBadge}
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-[#1c1917] sm:text-[2.75rem] sm:leading-tight">
            {brand.name}
          </h1>
          <p className="mt-1 text-sm text-[#78716c] sm:mt-3 sm:text-base">{brand.tagline}</p>
          <p className="mt-1 hidden text-xs font-medium text-[#5f8a7a] sm:block sm:mt-3 sm:text-sm">
            {brand.shippingLine}
          </p>
          <p className="mt-0.5 hidden text-xs text-[#78716c] sm:mt-1 sm:text-sm">
            {brand.deliveryLine} · {brand.supportLine}
          </p>
          <div className="mt-3 flex gap-2 sm:mt-8 sm:flex-wrap sm:gap-3">
            <Link
              href="#bestsellers"
              className="btn-primary flex-1 px-4 py-2 text-sm shadow-sm sm:flex-none sm:px-6 sm:py-3"
            >
              {copy.heroCta}
            </Link>
            <Link
              href="/products"
              className="inline-flex flex-1 items-center justify-center rounded-full border border-[#d6d3d1] bg-white px-4 py-2 text-sm font-semibold text-[#44403c] transition hover:border-[#5f8a7a] hover:text-[#4d7366] sm:flex-none sm:px-6 sm:py-3"
            >
              View all
            </Link>
          </div>
        </div>

        <div className="hidden grid-cols-2 gap-2 sm:grid sm:gap-4">
          {heroTiles.map(({ store, image }) => (
            <Link
              key={store.id}
              href={`/stores/${store.id}`}
              className="group relative aspect-square overflow-hidden rounded-xl border border-[#e7e5e4]/80 bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md sm:aspect-[4/5] sm:rounded-2xl"
            >
              {image ? (
                <Image
                  src={image}
                  alt={store.name}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                  sizes="(max-width: 1024px) 40vw, 220px"
                />
              ) : (
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${store.bgGradient}`}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#1c1917]/70 via-[#1c1917]/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                <span className="mb-2 inline-flex rounded-lg bg-white/90 p-1.5 backdrop-blur-sm">
                  <Icon name={store.id} size={16} className="text-[#4d7366]" />
                </span>
                <p className="text-sm font-semibold text-white">{store.name}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute -right-16 -top-16 hidden h-64 w-64 rounded-full bg-[#eef4f1]/80 blur-3xl sm:block" />
      <div className="pointer-events-none absolute -bottom-20 right-10 hidden h-48 w-48 rounded-full bg-[#f5ebe0]/60 blur-2xl sm:block" />
    </section>
  );
}

export function StoreQuickNav() {
  return (
    <section className="mt-4 sm:mt-8">
      <div>
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-0.5 pr-3 scrollbar-none sm:pr-0">
          <Link
            href="/products"
            className="shrink-0 snap-start rounded-full bg-[#1c1917] px-3 py-1.5 text-xs font-semibold text-white sm:px-4 sm:py-2 sm:text-sm"
          >
            Shop All
          </Link>
          {storeList.map((store) => (
            <Link
              key={store.id}
              href={`/stores/${store.id}`}
              className="inline-flex shrink-0 snap-start items-center gap-1.5 rounded-full border border-[#e7e5e4] bg-white px-3 py-1.5 text-xs font-medium text-[#57534e] transition hover:border-[#5f8a7a]/40 hover:text-[#4d7366] sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
            >
              <Icon name={store.id} size={14} className="text-[#78716c]" />
              <span className="sm:hidden">{storeShortNames[store.id]}</span>
              <span className="hidden sm:inline">{store.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TrustBadges() {
  return (
    <section className="mt-8 hidden sm:mt-14 md:block">
      <div className="mb-4 text-center sm:mb-8">
        <h2 className="section-title">{copy.whyShopTitle}</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {copy.whyShop.map((item) => (
          <div key={item.title} className="card p-4 sm:p-6">
            <IconBox name={item.icon} size="md" />
            <p className="mt-4 text-sm font-semibold text-[#1c1917]">{item.title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-[#78716c]">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
