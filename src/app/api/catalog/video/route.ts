import { isCjGatedVideoUrl } from "@/lib/catalog-video";

const CJ_REFERER = "https://developers.cjdropshipping.com/";

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("u");
  if (!raw || !isCjGatedVideoUrl(raw)) {
    return new Response("Invalid video URL", { status: 400 });
  }

  const upstreamHeaders: HeadersInit = { Referer: CJ_REFERER };
  const range = request.headers.get("range");
  if (range) upstreamHeaders.Range = range;

  const upstream = await fetch(raw, {
    headers: upstreamHeaders,
    redirect: "follow",
    cache: "force-cache",
  });

  if (!upstream.ok && upstream.status !== 206) {
    return new Response(`Upstream video error (${upstream.status})`, {
      status: upstream.status === 403 ? 502 : upstream.status,
    });
  }

  const headers = new Headers();
  const pass = [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "cache-control",
  ];
  for (const key of pass) {
    const value = upstream.headers.get(key);
    if (value) headers.set(key, value);
  }
  if (!headers.has("content-type")) headers.set("content-type", "video/mp4");
  if (!headers.has("cache-control")) {
    headers.set("cache-control", "public, max-age=86400, stale-while-revalidate=604800");
  }
  headers.set("access-control-allow-origin", "*");

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
