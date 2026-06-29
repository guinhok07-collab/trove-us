"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { isCatalogCdnUrl, PRODUCT_IMAGE_FALLBACK } from "@/lib/catalog-image";

interface ProductGalleryProps {
  name: string;
  image: string;
  images: string[];
  video?: string;
}

export function ProductGallery({ name, image, images, video }: ProductGalleryProps) {
  const gallery = useMemo(
    () => [...new Set([image, ...images].filter(Boolean))],
    [image, images],
  );
  const [active, setActive] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [broken, setBroken] = useState<Record<number, boolean>>({});

  const safeActive = Math.min(active, Math.max(gallery.length - 1, 0));
  const currentSrc =
    broken[safeActive] ? PRODUCT_IMAGE_FALLBACK : gallery[safeActive] || PRODUCT_IMAGE_FALLBACK;
  const unoptimized = isCatalogCdnUrl(currentSrc);
  const hasVideo = Boolean(video?.startsWith("http"));

  return (
    <div className="space-y-3">
      <div className="relative aspect-square max-h-[min(70vh,480px)] overflow-hidden rounded-2xl bg-[#f5f5f4] sm:max-h-none sm:rounded-3xl">
        {showVideo && hasVideo ? (
          <video
            src={video}
            controls
            playsInline
            className="h-full w-full object-contain bg-black"
            poster={gallery[0]}
          />
        ) : (
          <Image
            src={currentSrc}
            alt={`${name} — photo ${safeActive + 1}`}
            fill
            className="object-contain p-2"
            priority={safeActive === 0}
            sizes="(max-width: 1024px) 100vw, 50vw"
            unoptimized={unoptimized}
            onError={() => setBroken((b) => ({ ...b, [safeActive]: true }))}
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
            <Image
              src={broken[i] ? PRODUCT_IMAGE_FALLBACK : src}
              alt=""
              fill
              className="object-contain p-0.5"
              sizes="64px"
              unoptimized={isCatalogCdnUrl(src)}
              onError={() => setBroken((b) => ({ ...b, [i]: true }))}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
