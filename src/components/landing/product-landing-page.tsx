"use client";

import type { ResolvedLandingPage } from "@/data/landing/registry";
import { calcDiscount, formatUsd } from "@/lib/format";
import { CatalogImage } from "@/components/catalog-image";
import { FaqList } from "@/components/faq-list";
import { LandingBundleBuyButton, LandingBuyButton } from "@/components/landing/landing-buy-button";
import { LandingExitIntentModal } from "@/components/landing/landing-exit-intent";
import { LandingTrustBadges } from "@/components/landing/landing-trust-badges";
import { TrackProductView } from "@/components/track-analytics";
import { brand } from "@/data/brand";

interface ProductLandingPageProps {
  page: ResolvedLandingPage;
}

function StarRating({ rating }: { rating: number }) {
  const stars = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span className="text-sm tracking-wide text-[#b8956a]" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(stars)}
      <span className="text-[#e7e5e4]">{"★".repeat(5 - stars)}</span>
    </span>
  );
}

export function ProductLandingPage({ page }: ProductLandingPageProps) {
  const { config, product, accessory } = page;
  const discount = calcDiscount(product.price, product.compareAtPrice);
  const trustBadges = config.trustBadges ?? [
    { icon: "lock" as const, label: "Secure checkout" },
    { icon: "return" as const, label: "30-day easy returns" },
    { icon: "support" as const, label: "Real human support" },
  ];

  const bundleProducts = accessory ? [product, accessory] : [];
  const bundleTotal = bundleProducts.reduce((sum, p) => sum + p.price, 0);
  const bundleCompare =
    (product.compareAtPrice ?? product.price) +
    (accessory?.compareAtPrice ?? accessory?.price ?? 0);
  const bundleSavings = Math.max(0, bundleCompare - bundleTotal);

  const socialStats = [
    {
      value: `${product.rating} / 5`,
      label: `Average rating · ${product.reviews.toLocaleString()} reviews`,
    },
    {
      value: product.sold.toLocaleString(),
      label: "Sold in the last 30 days",
    },
    ...(config.socialProofExtras ?? []),
    {
      value: product.shippingDays,
      label: "Delivery across the US",
    },
  ];

  return (
    <>
      <TrackProductView
        store={product.store}
        productId={product.id}
        slug={product.slug}
        name={config.displayName}
        price={product.price}
      />

      <LandingExitIntentModal
        config={config.exitIntent}
        product={product}
        landingSlug={config.slug}
      />

      <div className="mx-auto max-w-5xl px-3 pb-28 pt-4 sm:px-6 sm:pb-10 sm:pt-8">
        {/* Hero */}
        <section className="grid items-center gap-6 lg:grid-cols-2 lg:gap-12">
          <div className="order-2 lg:order-1">
            <p className="text-label text-[#4d7366]">{config.hero.eyebrow}</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#1c1917] sm:text-4xl sm:leading-tight">
              {config.hero.headline}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#78716c] sm:text-base">
              {config.hero.subheadline}
            </p>

            <div className="mt-5 flex flex-wrap items-baseline gap-2 sm:mt-6 sm:gap-3">
              <span className="text-2xl font-semibold tracking-tight text-[#1c1917] sm:text-3xl">
                {formatUsd(product.price)}
              </span>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <>
                  <span className="price-compare text-sm sm:text-base">
                    {formatUsd(product.compareAtPrice)}
                  </span>
                  {discount > 0 && (
                    <span className="rounded-full bg-[#fef3e7] px-2.5 py-1 text-xs font-semibold text-[#b45309]">
                      Save {discount}%
                    </span>
                  )}
                </>
              )}
            </div>

            {config.hero.stockUrgency && (
              <p className="mt-2 text-xs font-medium text-[#78716c] sm:text-sm">
                {config.hero.stockUrgency}
              </p>
            )}

            <div className="mt-5 sm:mt-6">
              <LandingBuyButton
                product={product}
                landingSlug={config.slug}
              />
            </div>

            <LandingTrustBadges badges={trustBadges} className="mt-4 sm:mt-5" />
          </div>

          <div className="order-1 lg:order-2">
            <div className="card relative aspect-square overflow-hidden bg-[#fafaf9]">
              <CatalogImage
                src={product.image}
                candidates={product.images}
                alt={config.displayName}
                fill
                priority
                className="object-contain p-6 sm:p-10"
                sizes="(max-width: 1024px) 90vw, 480px"
              />
            </div>
          </div>
        </section>

        {/* Social proof strip */}
        <section className="mt-8 border-y border-[#e7e5e4] bg-white py-5 sm:mt-10 sm:py-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
            {socialStats.map((stat) => (
              <div key={stat.label} className="text-center sm:text-left">
                <p className="text-lg font-semibold tracking-tight text-[#1c1917] sm:text-xl">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-[#78716c] sm:text-xs">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mt-10 sm:mt-14">
          <div className="mb-6 text-center sm:mb-8">
            <h2 className="section-title">
              {config.featureSection?.title ?? "Why customers choose this"}
            </h2>
            {config.featureSection?.subtitle && (
              <p className="section-subtitle mx-auto mt-2 max-w-lg text-sm">
                {config.featureSection.subtitle}
              </p>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {config.features.map((feature, index) => (
              <article key={feature.title} className="card p-4 sm:p-5">
                <p className="text-label text-[#b8956a]">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-2 text-sm font-semibold text-[#1c1917] sm:text-base">
                  {feature.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[#78716c] sm:text-sm">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Reviews */}
        <section className="mt-10 sm:mt-14">
          <div className="mb-6 text-center sm:mb-8">
            <h2 className="section-title">
              {config.reviewsSection?.title ?? "Customer reviews"}
            </h2>
            {config.reviewsSection?.subtitle && (
              <p className="section-subtitle mt-2 text-sm">
                {config.reviewsSection.subtitle}
              </p>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            {config.reviews.map((review) => (
              <article key={review.name} className="card flex flex-col p-4 sm:p-5">
                <StarRating rating={review.rating} />
                <p className="mt-3 flex-1 text-sm leading-relaxed text-[#57534e]">
                  &ldquo;{review.quote}&rdquo;
                </p>
                <div className="mt-4 flex items-center gap-3 border-t border-[#f5f5f4] pt-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef4f1] text-xs font-semibold text-[#4d7366]">
                    {review.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-[#1c1917]">{review.name}</p>
                    <p className="text-xs text-[#a8a29e]">
                      Verified buyer · {review.location}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Bundle */}
        {config.bundle && accessory && (
          <section className="mt-10 sm:mt-14">
            <article className="card overflow-hidden border-[#5f8a7a]/25 bg-gradient-to-br from-[#eef4f1]/60 via-white to-white p-5 sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-[#1c1917] sm:text-xl">
                    {config.bundle.title}
                  </h2>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-[#78716c]">
                    {config.bundle.description}
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="relative h-14 w-14 overflow-hidden rounded-lg border border-[#e7e5e4] bg-white">
                      <CatalogImage
                        src={product.image}
                        alt={config.displayName}
                        fill
                        className="object-contain p-1"
                        sizes="56px"
                      />
                    </div>
                    <span className="text-[#a8a29e]">+</span>
                    <div className="relative h-14 w-14 overflow-hidden rounded-lg border border-[#e7e5e4] bg-white">
                      <CatalogImage
                        src={accessory.image}
                        alt={accessory.name}
                        fill
                        className="object-contain p-1"
                        sizes="56px"
                      />
                    </div>
                  </div>
                  <LandingBundleBuyButton
                    products={bundleProducts}
                    landingSlug={config.slug}
                    label={config.bundle.ctaLabel}
                    className="mt-5"
                  />
                </div>
                <div className="shrink-0 text-left sm:text-right">
                  <p className="text-xs text-[#78716c]">
                    Buying separately: {formatUsd(bundleCompare)}
                  </p>
                  <p className="mt-1 text-xl font-semibold text-[#4d7366] sm:text-2xl">
                    Bundle: {formatUsd(bundleTotal)}
                  </p>
                  {bundleSavings > 0 && (
                    <p className="mt-1 text-sm font-medium text-[#b45309]">
                      You save {formatUsd(bundleSavings)}
                    </p>
                  )}
                </div>
              </div>
            </article>
          </section>
        )}

        {/* FAQ */}
        <section className="mt-10 sm:mt-14">
          <h2 className="section-title mb-5 text-center sm:mb-6">
            {config.faqSectionTitle ?? "FAQ"}
          </h2>
          <FaqList items={config.faq} />
        </section>

        {/* Minimal footer note */}
        <p className="mt-10 text-center text-xs text-[#a8a29e]">
          {brand.name} · {brand.trustLine}
        </p>
      </div>

      {/* Sticky mobile buy bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e7e5e4] bg-[#faf9f7]/95 backdrop-blur-md pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-3 py-2.5">
          <div className="min-w-0 shrink-0">
            <p className="text-lg font-semibold leading-none text-[#1c1917]">
              {formatUsd(product.price)}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-[#78716c]">
              {config.displayName}
            </p>
          </div>
          <LandingBuyButton
            product={product}
            landingSlug={config.slug}
            label="Add to cart"
            className="min-w-0 flex-1 px-4 py-3 sm:max-w-none"
          />
        </div>
      </div>
    </>
  );
}
