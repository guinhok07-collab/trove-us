export const DEFAULT_HIDDEN_SLUGS = [
  "pet-food-storage-container",
  "closet-organizer-6-shelf",
  "cat-scratching-post",
  "under-sink-organizer",
  "adhesive-wall-hooks",
  "heating-pad-electric",
  "mini-bluetooth-speaker",
  "usb-c-hub-7in1",
  "garbage-bag-holder",
  "mason-jar-storage-lids",
  "over-sink-dish-rack",
];

export function defaultHiddenForSlug(slug, catalogHidden) {
  if (catalogHidden) return true;
  return DEFAULT_HIDDEN_SLUGS.includes(slug);
}
