/**
 * Resolve local MP4 for Meta ads — prefers CJ product video, falls back to template Reel.
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { pipeline } from "stream/promises";
import { convertWebmToMp4, videoPaths } from "./social-video-export.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const cjVideoDir = resolve(root, "marketing/social/output/videos-cj");

export function cjVideoPath(slug, fileBase) {
  const base = fileBase ?? slug;
  return resolve(cjVideoDir, `${base}.mp4`);
}

export async function downloadCjVideo(url, destPath) {
  mkdirSync(dirname(destPath), { recursive: true });
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Video download failed (${res.status}): ${url}`);
  }
  await pipeline(res.body, createWriteStream(destPath));
  return destPath;
}

/**
 * @returns {{ path: string, source: "cj" | "template" }}
 */
export async function resolveAdVideoFile(ad) {
  const slug = ad.slug;
  const fileBase = ad.file ?? slug;
  const cjDest = cjVideoPath(slug, fileBase);

  if (ad.video?.startsWith("http")) {
    if (!existsSync(cjDest)) {
      await downloadCjVideo(ad.video, cjDest);
    }
    return { path: cjDest, source: "cj" };
  }

  if (existsSync(cjDest)) {
    return { path: cjDest, source: "cj" };
  }

  const paths = videoPaths(ad);
  const mp4 = existsSync(paths.mp4) ? paths.mp4 : convertWebmToMp4(paths.webm, paths.mp4);
  return { path: mp4, source: "template" };
}

export function loadAdsCatalog() {
  const adsPath = resolve(root, "marketing/social/ads.json");
  if (!existsSync(adsPath)) return [];
  return JSON.parse(readFileSync(adsPath, "utf8"));
}
