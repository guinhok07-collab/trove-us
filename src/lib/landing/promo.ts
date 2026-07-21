export const LANDING_PROMO_STORAGE_KEY = "trove-landing-promo";

export interface LandingPromoState {
  code: string;
  landingSlug: string;
  savedAt: number;
}

export function saveLandingPromo(code: string, landingSlug: string): void {
  if (typeof window === "undefined") return;
  const state: LandingPromoState = {
    code,
    landingSlug,
    savedAt: Date.now(),
  };
  sessionStorage.setItem(LANDING_PROMO_STORAGE_KEY, JSON.stringify(state));
}

export function readLandingPromo(): LandingPromoState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(LANDING_PROMO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LandingPromoState;
    if (!parsed.code || !parsed.landingSlug) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearLandingPromo(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(LANDING_PROMO_STORAGE_KEY);
}
