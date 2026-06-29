import { brand } from "@/data/brand";

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://trove-us.com";

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
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: `${brand.name} — ${brand.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image" as const,
    title: brand.name,
    description: brand.tagline,
    images: ["/og-image.png"],
  },
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", type: "image/png" }],
  },
};
