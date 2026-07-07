/**
 * Ensure vertical Reel video exists and export MP4 for Meta APIs.
 */
import { existsSync, mkdirSync, copyFileSync } from "fs";
import { spawnSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const videosDir = resolve(root, "marketing/social/output/videos");
const publicReelsDir = resolve(root, "public/social-reels");

export function videoPaths(ad) {
  const base = ad.file ?? ad.slug;
  return {
    webm: resolve(videosDir, `${base}.webm`),
    mp4: resolve(videosDir, `${base}.mp4`),
    publicMp4: resolve(publicReelsDir, `${ad.slug}.mp4`),
  };
}

function hasFfmpeg() {
  try {
    const r = spawnSync("ffmpeg", ["-version"], { encoding: "utf8", windowsHide: true });
    return r.status === 0;
  } catch {
    return false;
  }
}

export function convertWebmToMp4(webmPath, mp4Path) {
  if (!existsSync(webmPath)) {
    throw new Error(`Video missing: ${webmPath}. Run: npm run social:videos`);
  }
  if (existsSync(mp4Path)) return mp4Path;

  if (!hasFfmpeg()) {
    throw new Error(
      "ffmpeg not found — install ffmpeg (winget install ffmpeg) or convert .webm to .mp4 manually",
    );
  }

  mkdirSync(dirname(mp4Path), { recursive: true });
  const r = spawnSync(
    "ffmpeg",
    ["-y", "-i", webmPath, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4Path],
    { encoding: "utf8", windowsHide: true },
  );
  if (r.status !== 0) {
    throw new Error(`ffmpeg failed: ${(r.stderr || r.stdout || "").slice(-400)}`);
  }
  return mp4Path;
}

/** @returns {{ mp4Path: string, publicUrl: string | null }} */
export function ensureReelMp4(ad) {
  const paths = videoPaths(ad);
  const mp4Path = existsSync(paths.mp4) ? paths.mp4 : convertWebmToMp4(paths.webm, paths.mp4);

  mkdirSync(publicReelsDir, { recursive: true });
  copyFileSync(mp4Path, paths.publicMp4);

  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://trove-us.com";
  const publicUrl = `${site.replace(/\/$/, "")}/social-reels/${ad.slug}.mp4`;

  return { mp4Path, publicUrl, publicPath: paths.publicMp4 };
}
