export const DEFAULT_HIDDEN_SLUGS = [
  "pet-food-storage-container",
  "closet-organizer-6-shelf",
  "cat-scratching-post",
  "under-sink-organizer",
  "adhesive-wall-hooks",
  "heating-pad-electric",
  "mini-bluetooth-speaker",
  "usb-c-hub-7in1",
] as const;

export type VisibilityOverride = Record<string, boolean>;

export function defaultHiddenForSlug(slug: string, catalogHidden?: boolean): boolean {
  if (catalogHidden) return true;
  return (DEFAULT_HIDDEN_SLUGS as readonly string[]).includes(slug);
}

export function resolveVisible(
  slug: string,
  catalogHidden: boolean | undefined,
  overrides: VisibilityOverride,
): boolean {
  if (slug in overrides) return overrides[slug];
  return !defaultHiddenForSlug(slug, catalogHidden);
}
