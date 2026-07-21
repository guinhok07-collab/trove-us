import { LandingAwareFooter } from "@/components/landing-aware-footer";
import { LandingAwareTrustStrip } from "@/components/landing-aware-trust-strip";
import { SiteExitIntentModal } from "@/components/site-exit-intent";
import { SiteHeader } from "@/components/site-header";
import { MetaPixel } from "@/components/meta-pixel";
import { TrackSiteTraffic } from "@/components/track-site-traffic";
import { BrowseScrollRestore } from "@/components/browse-scroll-restore";
import { CartProvider } from "@/context/cart-context";
import "./globals.css";

import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { brand } from "@/data/brand";

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const display = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

import { siteMetadata, siteUrl } from "@/lib/site";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteMetadata.title,
    template: `%s — ${brand.name}`,
  },
  description: siteMetadata.description,
  openGraph: {
    ...siteMetadata.openGraph,
    url: siteUrl,
  },
  twitter: siteMetadata.twitter,
  icons: siteMetadata.icons,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">
        <CartProvider>
          <Suspense fallback={null}>
            <MetaPixel />
          </Suspense>
          <Suspense fallback={null}>
            <TrackSiteTraffic />
          </Suspense>
          <Suspense fallback={null}>
            <BrowseScrollRestore />
          </Suspense>
          <Suspense fallback={null}>
            <SiteExitIntentModal />
          </Suspense>
          <SiteHeader />
          <LandingAwareTrustStrip className="hidden sm:block" />
          <main className="relative z-0 flex-1 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</main>
          <LandingAwareFooter />
        </CartProvider>
      </body>
    </html>
  );
}
