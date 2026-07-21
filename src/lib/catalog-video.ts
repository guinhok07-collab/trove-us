/** CJ serves product videos behind a Referer gate — browsers get 403 without a proxy. */
const CJ_VIDEO_HOSTS = new Set([
  "download-only-api.cjdropshipping.com",
  "cjdropshipping.com",
  "www.cjdropshipping.com",
]);

export function isCjGatedVideoUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      CJ_VIDEO_HOSTS.has(host) ||
      host.endsWith(".cjdropshipping.com") ||
      host.includes("download-only-api")
    );
  } catch {
    return false;
  }
}

/** Playable src for <video> — proxies CJ download-only URLs through our API. */
export function catalogVideoSrc(video?: string): string | undefined {
  if (!video?.startsWith("http")) return undefined;
  if (isCjGatedVideoUrl(video)) {
    return `/api/catalog/video?u=${encodeURIComponent(video)}`;
  }
  return video;
}
