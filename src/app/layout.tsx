import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TrustStrip } from "@/components/trust-strip";
import { MetaPixel } from "@/components/meta-pixel";
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
            <BrowseScrollRestore />
          </Suspense>
          <SiteHeader />
          <TrustStrip className="hidden sm:block" />
          <main className="relative z-0 flex-1 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</main>
          <SiteFooter />
        </CartProvider>
      </body>
    </html>
  );
}
