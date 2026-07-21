import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductLandingPage } from "@/components/landing/product-landing-page";
import {
  getAllLandingSlugs,
  resolveLandingPage,
} from "@/data/landing/registry";

export const dynamic = "force-dynamic";

interface LandingPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllLandingSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: LandingPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = resolveLandingPage(slug);
  if (!page) return { title: "Offer not found" };

  const { config, product } = page;

  return {
    title: config.meta.title,
    description: config.meta.description,
    robots: { index: false, follow: false },
    openGraph: {
      title: config.meta.title,
      description: config.meta.description,
      images: [{ url: product.image, alt: config.displayName }],
    },
  };
}

export default async function LandingPage({ params }: LandingPageProps) {
  const { slug } = await params;
  const page = resolveLandingPage(slug);

  if (!page) notFound();

  return <ProductLandingPage page={page} />;
}
