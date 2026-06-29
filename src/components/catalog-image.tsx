"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { isCatalogCdnUrl, PRODUCT_IMAGE_FALLBACK } from "@/lib/catalog-image";

type CatalogImageProps = Omit<ImageProps, "src" | "alt"> & {
  src: string;
  alt: string;
  fallbackToBrand?: boolean;
};

/** CJ CDN images load directly — avoids Vercel optimizer timeouts on mobile. */
export function CatalogImage({
  src,
  alt,
  fallbackToBrand = true,
  onError,
  ...props
}: CatalogImageProps) {
  const [broken, setBroken] = useState(false);
  const resolved = broken && fallbackToBrand ? PRODUCT_IMAGE_FALLBACK : src;

  return (
    <Image
      {...props}
      src={resolved}
      alt={alt}
      unoptimized={isCatalogCdnUrl(resolved)}
      onError={(e) => {
        if (!broken && fallbackToBrand) setBroken(true);
        onError?.(e);
      }}
    />
  );
}
