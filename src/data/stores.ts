import { Store, StoreCategory } from "@/types/product";

export const stores: Record<StoreCategory, Store> = {
  pet: {
    id: "pet",
    name: "Pet Essentials",
    tagline: "For the ones who feel like family",
    color: "#5f8a7a",
    bgGradient: "from-[#fef3e7] to-[#fdecd8]",
    description:
      "Comfort, care, and everyday gear for dogs and cats — beds, harnesses, grooming, and more.",
  },
  home: {
    id: "home",
    name: "Home Comfort",
    tagline: "Make every room feel like yours",
    color: "#6b8cae",
    bgGradient: "from-[#eef2f7] to-[#e4ebf3]",
    description:
      "Smart storage, organization, and little upgrades that make home life easier.",
  },
  wellness: {
    id: "wellness",
    name: "Wellness Studio",
    tagline: "Take care of you",
    color: "#5f8a7a",
    bgGradient: "from-[#eef4f1] to-[#e3eee9]",
    description:
      "Recovery, relaxation, and self-care — massage, sleep, fitness, and daily wellness.",
  },
  tech: {
    id: "tech",
    name: "Desk & Tech",
    tagline: "Your workspace, upgraded",
    color: "#8b7ba8",
    bgGradient: "from-[#f3f0f7] to-[#ebe6f2]",
    description:
      "Ergonomic desk gear, chargers, and everyday tech that helps you work comfortably.",
  },
};

export const storeList: Store[] = Object.values(stores);

/** Short labels for mobile header / chips */
export const storeShortNames: Record<StoreCategory, string> = {
  pet: "Pets",
  home: "Home",
  wellness: "Wellness",
  tech: "Desk & Tech",
};

export function getStore(id: StoreCategory): Store {
  return stores[id];
}
