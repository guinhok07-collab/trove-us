import { brand } from "@/data/brand";

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://trovegoods.com";

export const policyLastUpdated = "June 15, 2026";

export const siteMetadata = {
  title: `${brand.name} — Pet, Home, Wellness & Everyday Essentials`,
  description: brand.description,
  openGraph: {
    title: brand.name,
    description: brand.tagline,
    siteName: brand.name,
    locale: "en_US",
    type: "website" as const,
  },
};
