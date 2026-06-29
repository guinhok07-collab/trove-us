import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackToBrowseButton } from "@/components/back-to-browse-button";
import { ProductDetailClient } from "@/components/product-detail-client";
import { TrackProductView } from "@/components/track-analytics";
import { brand } from "@/data/brand";
import { storeLabels } from "@/data/products";
import { getVisibleProductBySlug } from "@/lib/catalog/visible-products";

export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getVisibleProductBySlug(slug);
  if (!product) return { title: "Product not found" };

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [{ url: product.image, alt: product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: product.description,
      images: [product.image],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getVisibleProductBySlug(slug);

  if (!product) notFound();

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 pb-20 sm:px-6 sm:py-8 sm:pb-10 lg:pb-10">
      <TrackProductView
        store={product.store}
        productId={product.id}
        slug={product.slug}
        name={product.name}
        price={product.price}
      />

      <BackToBrowseButton
        fallbackHref={`/stores/${product.store}`}
        fallbackLabel={`Back to ${storeLabels[product.store]}`}
      />

      <nav className="mb-3 hidden text-sm text-[#a8a29e] sm:mb-6 sm:block">
        <Link href="/" className="hover:text-[#4d7366]">
          {brand.name}
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/stores/${product.store}`}
          className="hover:text-[#4d7366]"
        >
          {storeLabels[product.store]}
        </Link>
        <span className="mx-2">/</span>
        <span className="line-clamp-1 text-[#57534e]">{product.name}</span>
      </nav>

      <ProductDetailClient product={product} />
    </div>
  );
}
