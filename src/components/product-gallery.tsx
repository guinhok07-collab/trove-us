"use client";

import { useMemo, useState } from "react";
import { CatalogImage } from "@/components/catalog-image";
import { getPreferredGalleryIndex } from "@/data/product-gallery-hints";
import { PRODUCT_IMAGE_FALLBACK } from "@/lib/catalog-image";
import { catalogVideoSrc } from "@/lib/catalog-video";

interface ProductGalleryProps {
  slug: string;
  name: string;
  image: string;
  images: string[];
  video?: string;
}

export function ProductGallery({ slug, name, image, images, video }: ProductGalleryProps) {
  const gallery = useMemo(
    () => [...new Set([image, ...images].filter(Boolean))],
    [image, images],
  );
  const initialIndex = useMemo(
    () => getPreferredGalleryIndex(slug, gallery.length),
    [slug, gallery.length],
  );
  const [active, setActive] = useState(initialIndex);
  const [showVideo, setShowVideo] = useState(false);

  const safeActive = Math.min(active, Math.max(gallery.length - 1, 0));
  const currentSrc = gallery[safeActive] || PRODUCT_IMAGE_FALLBACK;
  const playSrc = catalogVideoSrc(video);
  const hasVideo = Boolean(playSrc);
  const alternateCandidates = gallery.filter((_, i) => i !== safeActive);

  return (
    <div className="space-y-3">
      <div className="relative aspect-square max-h-[min(70vh,480px)] overflow-hidden rounded-2xl bg-[#f5f5f4] sm:max-h-none sm:rounded-3xl">
        {showVideo && playSrc ? (
          <video
            src={playSrc}
            controls
            playsInline
            className="h-full w-full object-contain bg-black"
            poster={gallery[0] || PRODUCT_IMAGE_FALLBACK}
          />
        ) : (
          <CatalogImage
            src={currentSrc}
            candidates={alternateCandidates}
            alt={`${name} — photo ${safeActive + 1}`}
            fill
            className="object-contain p-2"
            priority={safeActive === 0}
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        )}
        {gallery.length > 1 && !showVideo && (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {safeActive + 1} / {gallery.length}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {hasVideo && (
          <button
            type="button"
            onClick={() => setShowVideo((v) => !v)}
            className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold transition sm:h-16 sm:w-16 sm:rounded-xl ${
              showVideo
                ? "border-[#5f8a7a] bg-[#eef4f1] text-[#4d7366]"
                : "border-[#e7e5e4] bg-white text-[#57534e] hover:border-[#5f8a7a]/40"
            }`}
            aria-label={showVideo ? "Show photos" : "Play product video"}
          >
            ▶
          </button>
        )}
        {gallery.map((src, i) => (
          <button
            key={`${src}-${i}`}
            type="button"
            onClick={() => {
              setShowVideo(false);
              setActive(i);
            }}
            className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 bg-[#f5f5f4] transition sm:h-16 sm:w-16 sm:rounded-xl ${
              !showVideo && safeActive === i
                ? "border-[#5f8a7a]"
                : "border-transparent ring-1 ring-[#e7e5e4] hover:ring-[#5f8a7a]/40"
            }`}
            aria-label={`View image ${i + 1}`}
          >
            <CatalogImage
              src={src}
              candidates={gallery.filter((_, idx) => idx !== i)}
              alt=""
              fill
              className="object-contain p-0.5"
              sizes="64px"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
