export type StoreCategory = "pet" | "home" | "wellness" | "tech";

export interface Store {
  id: StoreCategory;
  name: string;
  tagline: string;
  color: string;
  bgGradient: string;
  description: string;
}

export interface ProductVariant {
  /** Stable id — CJ variant vid */
  id: string;
  label: string;
  cjVid: string;
  cjSku: string;
  price: number;
  compareAtPrice?: number;
  image: string;
  images: string[];
  inStock: boolean;
  /** Raw CJ variantKey — e.g. Black-Apple interface-20cm */
  variantKey?: string;
  /** Parsed option groups for CJ-style picker */
  optionValues?: Record<string, string>;
}

export interface ProductVariantCatalog {
  defaultVariantId: string;
  variants: ProductVariant[];
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  longDescription: string;
  price: number;
  compareAtPrice?: number;
  store: StoreCategory;
  image: string;
  images: string[];
  /** CJ product video URL when available */
  video?: string;
  rating: number;
  reviews: number;
  sold: number;
  inStock: boolean;
  shippingDays: string;
  warehouse: "US";
  tags: string[];
  features: string[];
  /** CJ product ID (reference only) */
  supplierSku?: string;
  /** CJ variant ID — required for automatic fulfillment */
  cjVid?: string;
  /** CJ variant SKU — optional fallback */
  cjSku?: string;
  /** Optional multi-variant catalog (synced from CJ) */
  variants?: ProductVariant[];
  defaultVariantId?: string;
  /** Hidden from storefront by default — toggle in /admin */
  catalogHidden?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  /** Selected CJ variant vid */
  variantId?: string;
  variantLabel?: string;
}

export type AnalyticsEventType =
  | "view_store"
  | "view_product"
  | "add_to_cart";

export interface AnalyticsEvent {
  store: StoreCategory;
  type: AnalyticsEventType;
  productId?: string;
  timestamp: number;
}
