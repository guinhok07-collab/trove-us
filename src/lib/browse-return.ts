const STORAGE_KEY = "trove:browse-return";
const MAX_AGE_MS = 30 * 60 * 1000;

export interface BrowseReturnState {
  path: string;
  scrollY: number;
  fromSlug?: string;
  label: string;
  savedAt: number;
}

function normalizePath(path: string): string {
  if (!path || path === "/") return "/";
  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  const sorted = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  const qs = new URLSearchParams(sorted).toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function buildBrowseReturnLabel(path: string): string {
  const normalized = normalizePath(path);
  if (normalized === "/") return "Back to home";

  if (normalized.startsWith("/products")) {
    const query = normalized.split("?")[1] ?? "";
    const params = new URLSearchParams(query);
    const store = params.get("store");
    const q = params.get("q");
    if (q) return "Back to search results";
    if (store === "pet") return "Back to Pet Essentials";
    if (store === "home") return "Back to Home Comfort";
    if (store === "wellness") return "Back to Wellness Studio";
    if (store === "tech") return "Back to Desk & Tech";
    return "Back to all products";
  }

  if (normalized.startsWith("/stores/pet")) return "Back to Pet Essentials";
  if (normalized.startsWith("/stores/home")) return "Back to Home Comfort";
  if (normalized.startsWith("/stores/wellness")) return "Back to Wellness Studio";
  if (normalized.startsWith("/stores/tech")) return "Back to Desk & Tech";
  if (normalized.startsWith("/stores/")) return "Back to store";

  return "Continue browsing";
}

export function saveBrowseReturn(fromSlug?: string): void {
  if (typeof window === "undefined") return;

  const path = normalizePath(
    window.location.pathname + window.location.search,
  );

  const state: BrowseReturnState = {
    path,
    scrollY: window.scrollY,
    fromSlug,
    label: buildBrowseReturnLabel(path),
    savedAt: Date.now(),
  };

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function readBrowseReturn(): BrowseReturnState | null {
  if (typeof window === "undefined") return null;

  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const state = JSON.parse(raw) as BrowseReturnState;
    if (!state.path || typeof state.scrollY !== "number") return null;
    if (Date.now() - state.savedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return {
      ...state,
      path: normalizePath(state.path),
      label: state.label || buildBrowseReturnLabel(state.path),
    };
  } catch {
    return null;
  }
}

export function matchesBrowseReturn(path: string): BrowseReturnState | null {
  const state = readBrowseReturn();
  if (!state) return null;
  return normalizePath(path) === state.path ? state : null;
}

export function clearBrowseReturn(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
