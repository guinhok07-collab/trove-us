"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

const FALLBACK =
  "https://cf.cjdropshipping.com/8c2a47b2-cff5-43ef-9950-1b0e517b85d7.png";

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
  const currentSrc = broken[safeActive] ? FALLBACK : gallery[safeActive] || FALLBACK;
  const hasVideo = Boolean(video?.startsWith("http"));

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-3xl bg-[#f5f5f4]">
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
            className={`inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border text-xs font-semibold transition ${
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
            className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-[#f5f5f4] transition ${
              !showVideo && safeActive === i
                ? "border-[#5f8a7a]"
                : "border-transparent ring-1 ring-[#e7e5e4] hover:ring-[#5f8a7a]/40"
            }`}
            aria-label={`View image ${i + 1}`}
          >
            <Image
              src={broken[i] ? FALLBACK : src}
              alt=""
              fill
              className="object-contain p-0.5"
              sizes="64px"
              onError={() => setBroken((b) => ({ ...b, [i]: true }))}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
