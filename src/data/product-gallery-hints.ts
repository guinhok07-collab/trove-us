/** Prefer a lifestyle / in-use hero image when catalog order is white-bg first. */
export const preferredGalleryIndexBySlug: Record<string, number> = {
  "wireless-earbuds-pro": 2,
  "percussion-massage-gun": 1,
  "orthopedic-dog-bed": 1,
  "no-pull-dog-harness": 2,
  "ergonomic-laptop-stand": 1,
  "mini-bluetooth-speaker": 1,
};

export function getPreferredGalleryIndex(slug: string, imageCount: number): number {
  const preferred = preferredGalleryIndexBySlug[slug];
  if (preferred === undefined) return 0;
  if (preferred >= imageCount) return 0;
  return preferred;
}
