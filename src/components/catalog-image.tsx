"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  PRODUCT_IMAGE_FALLBACK,
  productImageCandidates,
  shouldSkipImageOptimization,
} from "@/lib/catalog-image";


type CatalogImageProps = Omit<ImageProps, "src" | "alt"> & {
  src: string;
  alt: string;
  /** Extra gallery URLs tried if primary fails (CJ CDN flakiness). */
  candidates?: string[];
  fallbackToBrand?: boolean;
};

/**
 * Product photos with resilient loading:
 * - CJ CDN loads unoptimized (avoids Vercel optimizer timeouts)
 * - Tries alternate gallery images before brand placeholder
 * - Never shows a broken image icon
 */
export function CatalogImage({
  src,
  alt,
  candidates = [],
  fallbackToBrand = true,
  onError,
  ...props
}: CatalogImageProps) {
  const sources = useMemo(
    () => productImageCandidates(src, candidates),
    [src, candidates],
  );
  const sourceKey = sources.join("\0");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [sourceKey]);

  const resolved =
    index < sources.length
      ? sources[index]
      : fallbackToBrand
        ? PRODUCT_IMAGE_FALLBACK
        : sources[0] ?? PRODUCT_IMAGE_FALLBACK;

  return (
    <Image
      {...props}
      src={resolved}
      alt={alt}
      unoptimized={shouldSkipImageOptimization(resolved)}
      onError={(e) => {
        if (index < sources.length) {
          setIndex((i) => i + 1);
        }
        onError?.(e);
      }}
    />
  );
}
